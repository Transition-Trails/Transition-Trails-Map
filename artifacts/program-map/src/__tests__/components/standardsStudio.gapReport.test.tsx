/**
 * standardsStudio.gapReport.test.tsx
 *
 * Regression guard for the Gap Report empty-state behaviour introduced in
 * Task #510.  Core invariant: the Gap Report MUST NOT surface gap records
 * whose `standardId` does not resolve to a live standard in the current
 * `standards` state.  Static seed gaps in gapReportItems reference IDs like
 * 'std-module' that are never created by users — they must stay invisible.
 *
 *  T1 — With empty standards, Gap Report tab count is 0.
 *  T2 — With empty standards, Gap Report view shows the "No standards
 *        configured" empty state, not a list of seed gap records.
 *  T3 — After adding a standard whose ID doesn't appear in gapReportItems,
 *        the Gap Report shows "No gaps for your standards" rather than seed
 *        gap records.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useSfPrograms', () => ({
  useSfPrograms: () => ({ data: undefined, isLoading: false }),
}));

// ScrollArea needs jsdom scroll support — render children directly.
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { AppProvider } from '@/context/AppContext';
import StandardsStudio from '@/pages/curriculum/StandardsStudio';
import { gapReportItems } from '@/data/standardsData';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderStudio() {
  return render(
    <AppProvider>
      <StandardsStudio />
    </AppProvider>,
  );
}

function clickGapReportTab() {
  // Use the data-testid added to ViewTab so we never confuse the tab with the
  // Overview nav card that also says "Gap Report".
  const tab = screen.getByTestId('view-tab-gap-report');
  act(() => { fireEvent.click(tab); });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StandardsStudio › Gap Report empty-state guard', () => {
  beforeEach(() => {
    // Seed gapReportItems must exist for these tests to be meaningful.
    expect(gapReportItems.length).toBeGreaterThan(0);
  });

  it('T1 — Gap Report tab shows no nonzero count when standards is empty', () => {
    renderStudio();
    const tab = screen.getByTestId('view-tab-gap-report');
    // When resolvedGapTotal is 0, ViewTab renders no badge (count prop is falsy).
    expect(tab.textContent).not.toMatch(/[1-9]\d*/);
  });

  it('T2 — Gap Report view shows empty state and no seed gap rows when standards is empty', () => {
    renderStudio();
    clickGapReportTab();

    // Empty-state heading must be present with the "no standards" message.
    const heading = screen.getByTestId('gap-empty-state');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/no standards configured/i);

    // None of the static seed gap object names should appear.
    const seedNames = gapReportItems.map(g => g.objectName);
    for (const name of seedNames.slice(0, 5)) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });

  it('T3 — Gap Report shows no seed gaps after adding a standard with a non-matching ID', async () => {
    renderStudio();

    // Open the "New Standard" drawer.
    const newBtn = screen.getByRole('button', { name: /new standard/i });
    act(() => { fireEvent.click(newBtn); });

    // Fill the required Name field — first textbox inside the drawer.
    const inputs = screen.getAllByRole('textbox');
    act(() => { fireEvent.change(inputs[0], { target: { value: 'My Custom Standard' } }); });

    // Save via "Create Standard" button (the drawer's primary action in create mode).
    const createBtn = screen.getByRole('button', { name: /create standard/i });
    act(() => { fireEvent.click(createBtn); });

    // Navigate to Gap Report.
    clickGapReportTab();

    // The user-created standard has an auto-generated ID (not a seed ID),
    // so no gap records resolve — the "No gaps for your standards" state must appear.
    const heading = await screen.findByTestId('gap-empty-state');
    expect(heading.textContent).toMatch(/no gaps for your standards/i);

    // Seed gap object names must still be absent.
    const seedNames = gapReportItems.map(g => g.objectName);
    for (const name of seedNames.slice(0, 5)) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });
});
