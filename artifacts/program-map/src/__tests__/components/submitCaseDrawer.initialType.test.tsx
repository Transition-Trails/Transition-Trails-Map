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
});
