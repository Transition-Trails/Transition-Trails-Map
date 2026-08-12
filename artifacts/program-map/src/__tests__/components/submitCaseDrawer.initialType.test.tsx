/**
 * submitCaseDrawer.initialType.test.tsx
 *
 * Confirms the initialType routing logic inside SubmitCaseDrawer.
 *
 * The useEffect that fires when the drawer opens calls
 * GET /api/sf/cases/record-types, then decides which step to land on:
 *
 *   • ≤1 type returned         → auto-select; jump straight to "form" step
 *   • initialType matches name → pre-select; jump straight to "form" step
 *   • initialType has no match → show "type" (type-picker) step
 *
 * Test matrix:
 *
 *  T1. initialType="General" + org returns ["General","Technical"]
 *      → form step shown immediately (Subject field visible, type-picker absent)
 *
 *  T2. initialType="General" + org returns ["Technical","Billing"] (no General)
 *      → type-picker shown (graceful fallback; Subject field absent)
 *
 *  T3. Only one record type returned + initialType ignored (auto-select path)
 *      → form step shown regardless of initialType value
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock heavy child components that use browser APIs not in jsdom ────────────

vi.mock('../../components/homebase/CaseRichTextEditor', () => ({
  CaseRichTextEditor: ({ onChange }: { onChange: (v: string) => void }) => (
    <textarea data-testid="rich-editor" onChange={e => onChange(e.target.value)} />
  ),
  htmlToPlainText: (html: string) => html,
}));

vi.mock('../../components/homebase/CaseAttachments', () => ({
  CaseAttachments: () => <div data-testid="case-attachments" />,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ── Import the component AFTER vi.mock declarations ───────────────────────────

import { SubmitCaseDrawer } from '../../components/homebase/SubmitCaseDrawer';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRecordType(name: string, id = `rt-${name}`, isDefault = false) {
  return { id, name, isDefault };
}

/** Create a fetch mock that handles /api/sf/cases/record-types and /api/sf/cases/queues */
function makeFetch(recordTypes: { id: string; name: string; isDefault: boolean }[]) {
  return vi.fn(async (url: string | URL | Request) => {
    const path = typeof url === 'string' ? url : url.toString();
    if (path.includes('record-types')) {
      return new Response(
        JSON.stringify({ recordTypes }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (path.includes('queues')) {
      return new Response(
        JSON.stringify({ queues: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
}

// ── Identifiers for steps ─────────────────────────────────────────────────────

/**
 * The type-picker step shows this distinctive instruction text.
 * The form step does NOT show it.
 */
const TYPE_PICKER_TEXT = /select the type of case you'd like to submit/i;

/**
 * The form step shows a "Subject" label (required field).
 * The type-picker step does NOT show it.
 */
const FORM_SUBJECT_LABEL = /^subject/i;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SubmitCaseDrawer — initialType routing', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ── T1: matching initialType → form step ─────────────────────────────────────

  test(
    'T1: initialType="General" + org returns ["General","Technical"] → form step shown immediately',
    async () => {
      global.fetch = makeFetch([
        makeRecordType('General', 'rt-001', true),
        makeRecordType('Technical', 'rt-002'),
      ]);

      render(
        <SubmitCaseDrawer
          open={true}
          onClose={() => undefined}
          initialType="General"
        />,
      );

      // Wait for the async fetch to resolve and state to update
      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });

      // The form step must be showing — "Subject" label is present
      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();
    },
  );

  // ── T1b: case-insensitive match ───────────────────────────────────────────────

  test(
    'T1b: match is case-insensitive — initialType="general" matches org type "General"',
    async () => {
      global.fetch = makeFetch([
        makeRecordType('General', 'rt-001'),
        makeRecordType('Technical', 'rt-002'),
      ]);

      render(
        <SubmitCaseDrawer
          open={true}
          onClose={() => undefined}
          initialType="general"
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });

      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();
    },
  );

  // ── T2: no match → type-picker (graceful fallback) ───────────────────────────

  test(
    'T2: initialType="General" + org returns ["Technical","Billing"] → type-picker shown',
    async () => {
      global.fetch = makeFetch([
        makeRecordType('Technical', 'rt-010'),
        makeRecordType('Billing',   'rt-011'),
      ]);

      render(
        <SubmitCaseDrawer
          open={true}
          onClose={() => undefined}
          initialType="General"
        />,
      );

      // Wait for fetch to settle; type-picker must appear
      await waitFor(() => {
        expect(screen.getByText(TYPE_PICKER_TEXT)).toBeInTheDocument();
      });

      // Form step must NOT be showing
      expect(screen.queryByText(FORM_SUBJECT_LABEL)).not.toBeInTheDocument();

      // Both available types are rendered as buttons
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Billing')).toBeInTheDocument();
    },
  );

  // ── T3: only one record type → auto-select path ──────────────────────────────

  test(
    'T3: only one record type returned → form step shown regardless of initialType',
    async () => {
      global.fetch = makeFetch([
        makeRecordType('Support', 'rt-solo', true),
      ]);

      render(
        <SubmitCaseDrawer
          open={true}
          onClose={() => undefined}
          initialType="General"   // does not match "Support" — irrelevant on auto-select path
        />,
      );

      // Auto-select path must bypass the type-picker and land on form
      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });

      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();
    },
  );

  // ── T3b: only one type, no initialType provided ───────────────────────────────

  test(
    'T3b: only one record type + no initialType → form step shown (auto-select always fires)',
    async () => {
      global.fetch = makeFetch([
        makeRecordType('General', 'rt-gen', true),
      ]);

      render(
        <SubmitCaseDrawer
          open={true}
          onClose={() => undefined}
          // no initialType prop
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });

      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();
    },
  );

  // ── T5: close after initialType pre-select → reopen with same initialType → form step ──

  test(
    'T5: opened with initialType → closed (reset) → reopened with same initialType → form step shown',
    async () => {
      global.fetch = makeFetch([
        makeRecordType('General',   'rt-001', true),
        makeRecordType('Technical', 'rt-002'),
      ]);

      const onClose = vi.fn();

      const { rerender } = render(
        <SubmitCaseDrawer
          open={true}
          onClose={onClose}
          initialType="General"
        />,
      );

      // Wait for the form step to appear on first open
      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });
      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();

      // Click the close button — this calls handleClose() → reset() → onClose()
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Simulate the parent closing the drawer
      rerender(
        <SubmitCaseDrawer
          open={false}
          onClose={onClose}
          initialType="General"
        />,
      );

      // Drawer is hidden — neither step should be visible
      expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      expect(screen.queryByText(FORM_SUBJECT_LABEL)).not.toBeInTheDocument();

      // Reset fetch call count so we can track the reopen fetch cleanly
      (global.fetch as ReturnType<typeof vi.fn>).mockClear();

      // Reopen with the same initialType="General"
      rerender(
        <SubmitCaseDrawer
          open={true}
          onClose={onClose}
          initialType="General"
        />,
      );

      // initialType still matches — the form step must appear on the second open too
      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });

      // Subject field must be visible — confirming we are on the form step, not the type-picker
      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();
    },
  );

  // ── T4: close after initialType pre-select → reopen without initialType → type-picker ──

  test(
    'T4: opened with initialType → closed (reset) → reopened without initialType → type-picker shown',
    async () => {
      global.fetch = makeFetch([
        makeRecordType('General',   'rt-001', true),
        makeRecordType('Technical', 'rt-002'),
      ]);

      const onClose = vi.fn();

      const { rerender } = render(
        <SubmitCaseDrawer
          open={true}
          onClose={onClose}
          initialType="General"
        />,
      );

      // Wait for the form step to appear (initialType matched → skip type-picker)
      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });
      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();

      // Click the close button — this calls handleClose() → reset() → onClose()
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Simulate the parent closing the drawer
      rerender(
        <SubmitCaseDrawer
          open={false}
          onClose={onClose}
          // no initialType
        />,
      );

      // Drawer is hidden — neither step should be visible
      expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      expect(screen.queryByText(FORM_SUBJECT_LABEL)).not.toBeInTheDocument();

      // Reset fetch call count so we can track the reopen fetch cleanly
      (global.fetch as ReturnType<typeof vi.fn>).mockClear();

      // Reopen without initialType
      rerender(
        <SubmitCaseDrawer
          open={true}
          onClose={onClose}
          // no initialType
        />,
      );

      // With multiple types and no initialType, the type-picker must appear
      await waitFor(() => {
        expect(screen.getByText(TYPE_PICKER_TEXT)).toBeInTheDocument();
      });

      // The form step must NOT be visible — no Subject field
      expect(screen.queryByText(FORM_SUBJECT_LABEL)).not.toBeInTheDocument();
    },
  );

  // ── T6: first open errors (catch path) → close → reopen with matching initialType → form step ──

  test(
    'T6: first open errors (catch path → form step) → close → reopen with initialType matching → form step shown',
    async () => {
      // Track how many times the record-types endpoint has been called so we
      // can return different responses on the first vs subsequent opens.
      let recordTypesCalls = 0;

      global.fetch = vi.fn(async (url: string | URL | Request) => {
        const path = typeof url === 'string' ? url : url.toString();

        if (path.includes('record-types')) {
          recordTypesCalls += 1;
          if (recordTypesCalls === 1) {
            // First open: simulate a server error so the catch branch fires.
            return new Response('Internal Server Error', { status: 500 });
          }
          // Second open: success — returns two types, one of which matches initialType.
          return new Response(
            JSON.stringify({
              recordTypes: [
                { id: 'rt-001', name: 'General',   isDefault: true },
                { id: 'rt-002', name: 'Technical', isDefault: false },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (path.includes('queues')) {
          return new Response(
            JSON.stringify({ queues: [] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch;

      const onClose = vi.fn();

      const { rerender } = render(
        <SubmitCaseDrawer
          open={true}
          onClose={onClose}
          initialType="General"
        />,
      );

      // First open: fetch fails → catch branch sets step to "form"
      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });
      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();

      // Click the close button → reset() → onClose()
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Simulate the parent honoring the onClose callback
      rerender(
        <SubmitCaseDrawer
          open={false}
          onClose={onClose}
          initialType="General"
        />,
      );

      // Drawer is hidden — neither step should be visible
      expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      expect(screen.queryByText(FORM_SUBJECT_LABEL)).not.toBeInTheDocument();

      // Reopen with the same initialType="General" — fetch now succeeds
      rerender(
        <SubmitCaseDrawer
          open={true}
          onClose={onClose}
          initialType="General"
        />,
      );

      // initialType matches "General" in the successful response → form step (not type-picker)
      await waitFor(() => {
        expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();
      });

      // Subject field must be visible — confirming we are on the form step
      expect(screen.getByText(FORM_SUBJECT_LABEL)).toBeInTheDocument();
    },
  );

  // ── T7: error-path submit → POST body omits recordTypeId / recordTypeName ────────

  test(
    'T7: record-types fetch fails → form shown with null selectedType → submit omits recordTypeId and recordTypeName',
    async () => {
      // Capture the JSON body sent to the submit endpoint.
      let capturedBody: Record<string, unknown> | null = null;

      global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const path = typeof url === 'string' ? url : url.toString();

        if (path.includes('record-types')) {
          // Simulate a server error so the catch branch fires.
          return new Response('Internal Server Error', { status: 500 });
        }

        if (path.includes('queues')) {
          return new Response(
            JSON.stringify({ queues: [] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (path.includes('/api/cases/submit')) {
          // Capture the request body, then return a minimal success response.
          capturedBody = JSON.parse((init?.body as string) ?? '{}') as Record<string, unknown>;
          return new Response(
            JSON.stringify({ synced: true, sfCaseId: 'case-001', sfCaseNumber: '00001' }),
            { status: 201, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch;

      render(
        <SubmitCaseDrawer
          open={true}
          onClose={() => undefined}
          // No initialType — the catch branch sets selectedType to null.
        />,
      );

      // Catch branch fires: record-types fetch fails → step becomes "form"
      // with selectedType === null. Wait for the Subject field to appear.
      await waitFor(() => {
        expect(screen.getByLabelText(/^subject/i)).toBeInTheDocument();
      });

      // Fill in the required Subject field.
      const subjectInput = screen.getByLabelText(/^subject/i);
      fireEvent.change(subjectInput, { target: { value: 'Test subject on error path' } });

      // Submit the form.
      const form = document.querySelector<HTMLFormElement>('#case-form');
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      // Wait for the POST to be made (capturedBody will be set once fetch fires).
      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      });

      // The POST body must NOT include recordTypeId or recordTypeName when
      // selectedType is null (undefined values are stripped by JSON.stringify).
      expect(capturedBody).not.toHaveProperty('recordTypeId');
      expect(capturedBody).not.toHaveProperty('recordTypeName');

      // Subject should still be present so the case is not an empty submission.
      expect(capturedBody).toMatchObject({ subject: 'Test subject on error path' });
    },
  );

  // ── T4: never-resolving fetch → spinner visible, no type-picker, no form ──────

  test(
    'T4: slow fetch that never resolves → "Loading case types…" spinner is shown; type-picker and form are absent',
    async () => {
      // A fetch that never resolves, freezing the drawer in the loading state
      global.fetch = vi.fn(() => new Promise(() => undefined)) as unknown as typeof fetch;

      render(
        <SubmitCaseDrawer
          open={true}
          onClose={() => undefined}
        />,
      );

      // The loading spinner must appear once the useEffect fires
      await waitFor(() => {
        expect(screen.getByText(/loading case types…/i)).toBeInTheDocument();
      });

      // The type-picker instruction text must NOT be visible while loading
      expect(screen.queryByText(TYPE_PICKER_TEXT)).not.toBeInTheDocument();

      // The form's Subject label must NOT be visible while loading
      expect(screen.queryByText(FORM_SUBJECT_LABEL)).not.toBeInTheDocument();
    },
  );
});
