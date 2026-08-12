/**
 * sfCaseAttachments.test.tsx
 *
 * Tests for the two client-side pieces of the screenshot → Salesforce chain:
 *
 *  1. fileToBase64 — converts a File to a raw base64 string (no data-URL prefix).
 *     Lives in lib/fileUtils.ts; this is the conversion step between the
 *     screen-capture blob and the JSON body sent to the SF attachment endpoint.
 *
 *  2. AttachProgressRow (production component, exported from SubmitCaseDrawer.tsx)
 *     Renders the upload-state UI in step 3 of the case submission drawer.
 *     Key invariant: any partial failure MUST show amber, not a silent green tick.
 *
 * Test matrix:
 *
 *  fileToBase64
 *   B1. Converts a small PNG File to a non-empty base64 string
 *   B2. Result has no data-URL prefix ("data:" or comma)
 *   B3. Decoded bytes match the original file content exactly
 *   B4. Works for non-image MIME types (plain text)
 *   B5. Returns an empty string for a zero-byte File
 *
 *  AttachProgressRow (real production component)
 *   R1. total === 0 → renders nothing
 *   R2. done:false → shows "Uploading attachments…" text
 *   R3. done:false, partial progress → progress bar width reflects ratio
 *   R4. done:true, failed > 0 → amber panel present, green panel absent
 *   R5. done:true, all failed → amber shows "failed to upload" wording
 *   R6. done:true, zero failures → green success tick shown
 *   R7. done:true, partial success → amber shows "N of M … — K failed" wording
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';

import { fileToBase64 }    from '../../lib/fileUtils';
import { uploadAttachments } from '../../lib/uploadAttachments';
import { AttachProgressRow, AttachProgress } from '../../components/homebase/SubmitCaseDrawer';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Minimal 1×1 PNG as a raw ArrayBuffer — no fixture files needed.
 * Using ArrayBuffer directly satisfies the BlobPart constraint in strict mode.
 */
function tinyPngBuffer(): ArrayBuffer {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function makeFile(content: ArrayBuffer | string, name: string, type: string): File {
  return new File([content], name, { type });
}

// ── fileToBase64 tests ────────────────────────────────────────────────────────

describe('fileToBase64', () => {
  test('B1: resolves to a non-empty string for a small PNG', async () => {
    const file = makeFile(tinyPngBuffer(), 'screenshot.png', 'image/png');
    const b64 = await fileToBase64(file);
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
  });

  test('B2: result has no data-URL prefix (no "data:" prefix or comma)', async () => {
    const file = makeFile(tinyPngBuffer(), 'screenshot.png', 'image/png');
    const b64 = await fileToBase64(file);
    expect(b64).not.toMatch(/^data:/);
    expect(b64).not.toContain(',');
  });

  test('B3: decoded bytes match the original content exactly', async () => {
    const buf = tinyPngBuffer();
    const file = makeFile(buf, 'screenshot.png', 'image/png');
    const b64 = await fileToBase64(file);
    // Decode and compare as byte arrays
    const original = new Uint8Array(buf);
    const decoded  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    expect(decoded).toEqual(original);
  });

  test('B4: works for a plain-text file (non-image MIME type)', async () => {
    const text = 'Hello, Salesforce!';
    const file = makeFile(text, 'note.txt', 'text/plain');
    const b64 = await fileToBase64(file);
    expect(atob(b64)).toBe(text);
  });

  test('B5: returns an empty string for a zero-byte File', async () => {
    const file = makeFile(new ArrayBuffer(0), 'empty.png', 'image/png');
    const b64 = await fileToBase64(file);
    expect(b64).toBe('');
  });
});

// ── uploadAttachments client-flow tests ──────────────────────────────────────
//
// The endpoint always returns HTTP 200 even when Salesforce rejects a file.
// These tests confirm the client DOES NOT treat HTTP-200+failed as success.
//
// Test matrix:
//  C1. HTTP 200 + results[0].success:true  → progress.uploaded incremented
//  C2. HTTP 200 + results[0].success:false → progress.failed incremented (false-success guard)
//  C3. HTTP 4xx (genuine network failure)  → progress.failed incremented
//  C4. fetch throws                        → progress.failed incremented
//  C5. Two files: first succeeds, second fails → final counts uploaded:1 failed:1
//  C6. onProgress receives a final call with done:true

function makeTextFile(name: string): File {
  return new File(['hello'], name, { type: 'text/plain' });
}

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
}

describe('uploadAttachments — client response parsing', () => {
  test('C1: HTTP 200 + success:true → uploaded incremented, not failed', async () => {
    const calls: import('../../lib/uploadAttachments').AttachmentProgress[] = [];
    await uploadAttachments(
      '5001a00000XyzAbcDE',
      [makeTextFile('ok.txt')],
      p => calls.push({ ...p }),
      jsonFetch({ uploaded: 1, failed: 0, results: [{ name: 'ok.txt', success: true }] }),
    );
    const final = calls.at(-1)!;
    expect(final.done).toBe(true);
    expect(final.uploaded).toBe(1);
    expect(final.failed).toBe(0);
  });

  test('C2: HTTP 200 + success:false → failed incremented (guards against false-success)', async () => {
    // This is the core invariant: the endpoint returns 200 even when SF rejected
    // the file.  The client must parse results[0].success, not rely on r.ok.
    const calls: import('../../lib/uploadAttachments').AttachmentProgress[] = [];
    await uploadAttachments(
      '5001a00000XyzAbcDE',
      [makeTextFile('rejected.png')],
      p => calls.push({ ...p }),
      jsonFetch({
        uploaded: 0,
        failed:   1,
        results:  [{ name: 'rejected.png', success: false, error: 'File too large for org limit' }],
      }),
    );
    const final = calls.at(-1)!;
    expect(final.done).toBe(true);
    expect(final.uploaded).toBe(0);
    expect(final.failed).toBe(1);
  });

  test('C3: HTTP 413 (genuine non-200) → failed incremented', async () => {
    const calls: import('../../lib/uploadAttachments').AttachmentProgress[] = [];
    await uploadAttachments(
      '5001a00000XyzAbcDE',
      [makeTextFile('big.png')],
      p => calls.push({ ...p }),
      jsonFetch({ error: 'Too large' }, 413),
    );
    const final = calls.at(-1)!;
    expect(final.failed).toBe(1);
    expect(final.uploaded).toBe(0);
  });

  test('C4: fetch throws → caught per-file → failed incremented', async () => {
    const calls: import('../../lib/uploadAttachments').AttachmentProgress[] = [];
    await uploadAttachments(
      '5001a00000XyzAbcDE',
      [makeTextFile('crash.png')],
      p => calls.push({ ...p }),
      async () => { throw new Error('ECONNRESET'); },
    );
    const final = calls.at(-1)!;
    expect(final.failed).toBe(1);
    expect(final.uploaded).toBe(0);
  });

  test('C5: two files, first success + second failure → uploaded:1 failed:1', async () => {
    let call = 0;
    const mockFetch: typeof fetch = async () => {
      call++;
      if (call === 1) {
        return new Response(
          JSON.stringify({ uploaded: 1, failed: 0, results: [{ name: 'a.png', success: true }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ uploaded: 0, failed: 1, results: [{ name: 'b.png', success: false, error: 'Rejected by SF' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const calls: import('../../lib/uploadAttachments').AttachmentProgress[] = [];
    await uploadAttachments(
      '5001a00000XyzAbcDE',
      [makeTextFile('a.png'), makeTextFile('b.png')],
      p => calls.push({ ...p }),
      mockFetch,
    );

    const final = calls.at(-1)!;
    expect(final.done).toBe(true);
    expect(final.uploaded).toBe(1);
    expect(final.failed).toBe(1);
  });

  test('C6: onProgress receives final call with done:true', async () => {
    const calls: import('../../lib/uploadAttachments').AttachmentProgress[] = [];
    await uploadAttachments(
      '5001a00000XyzAbcDE',
      [makeTextFile('f.png')],
      p => calls.push({ ...p }),
      jsonFetch({ uploaded: 1, failed: 0, results: [{ name: 'f.png', success: true }] }),
    );
    expect(calls.at(-1)!.done).toBe(true);
    // First call (after initial progress) has done:false
    expect(calls[0].done).toBe(false);
  });
});

// ── AttachProgressRow (real production component) ─────────────────────────────

function prog(overrides: Partial<AttachProgress>): AttachProgress {
  return { total: 1, uploaded: 0, failed: 0, done: false, ...overrides };
}

describe('AttachProgressRow — production component from SubmitCaseDrawer', () => {
  test('R1: total === 0 renders nothing', () => {
    const { container } = render(
      <AttachProgressRow progress={prog({ total: 0, done: true })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('R2: done:false shows "Uploading attachments…"', () => {
    render(<AttachProgressRow progress={prog({ total: 3, done: false })} />);
    expect(screen.getByText(/uploading attachments…/i)).toBeInTheDocument();
  });

  test('R3: done:false — progress bar width reflects (uploaded+failed)/total', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 4, uploaded: 1, failed: 1, done: false })}
      />,
    );
    // 2 of 4 done = 50 %
    const bar = document.querySelector('[style*="width"]') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.width).toBe('50%');
  });

  test('R3: done:false — count text shows ratio', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 4, uploaded: 1, failed: 1, done: false })}
      />,
    );
    // The span shows "uploaded+failed / total"
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  // ── Critical: partial failure must show amber, never silent green ──────────

  test('R4: done:true with any failure → amber panel present, green panel absent', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 2, uploaded: 1, failed: 1, done: true })}
      />,
    );
    // Amber border/bg classes are on the container div
    const amber = document.querySelector('.border-amber-200');
    expect(amber).toBeTruthy();
    const green = document.querySelector('.border-emerald-200');
    expect(green).toBeNull();
  });

  test('R5: done:true, all failed → amber shows "failed to upload"', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 1, uploaded: 0, failed: 1, done: true })}
      />,
    );
    expect(screen.getByText(/failed to upload/i)).toBeInTheDocument();
  });

  test('R5: done:true, 2 files all failed → plural "attachments failed to upload"', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 2, uploaded: 0, failed: 2, done: true })}
      />,
    );
    expect(screen.getByText(/2 attachments failed to upload/i)).toBeInTheDocument();
  });

  test('R6: done:true, zero failures → green success panel shown', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 1, uploaded: 1, failed: 0, done: true })}
      />,
    );
    expect(document.querySelector('.border-emerald-200')).toBeTruthy();
    expect(document.querySelector('.border-amber-200')).toBeNull();
  });

  test('R6: done:true, multiple files all succeed → green shows correct count', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 3, uploaded: 3, failed: 0, done: true })}
      />,
    );
    expect(screen.getByText(/3 attachments uploaded/i)).toBeInTheDocument();
  });

  test('R7: done:true, partial success → amber shows "N of M … — K failed"', () => {
    render(
      <AttachProgressRow
        progress={prog({ total: 3, uploaded: 2, failed: 1, done: true })}
      />,
    );
    // Must mention partial count
    expect(screen.getByText(/2 of 3/i)).toBeInTheDocument();
    // Must mention failure count
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    // Must NOT show the all-failed wording
    expect(screen.queryByText(/failed to upload/i)).not.toBeInTheDocument();
  });
});
