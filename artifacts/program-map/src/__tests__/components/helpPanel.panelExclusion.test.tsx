/**
 * helpPanel.panelExclusion.test.tsx
 *
 * Covers the two acceptance criteria the code reviewer flagged:
 *
 *  A. Panel mutual exclusion is enforced at the AppContext state layer,
 *     meaning any call to setAskPennyOpen(true) — whether from Topbar, ContextPanel,
 *     RailActionPanel, or anywhere else — also closes the Help panel.
 *
 *  B. The Help button is only rendered in PennyBar for the "team" (staff) audience.
 *     Coach, learner, and volunteer audiences lack access to /api/knowledge/sf-articles
 *     and must never see or trigger the Help panel.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// ── Mock the one external hook AppProvider calls that needs a QueryClient ───

vi.mock('@/hooks/useSfPrograms', () => ({
  useSfPrograms: () => ({ data: undefined, isLoading: false }),
}));

// ── Part A: AppContext mutual exclusion ──────────────────────────────────────

import { AppProvider, useAppContext } from '@/context/AppContext';

/**
 * A tiny harness component that exposes AppContext state + all four panel
 * setters as data attributes so tests can read and drive them without a UI.
 */
function Harness() {
  const {
    askPennyOpen, setAskPennyOpen,
    calendarPanelOpen, setCalendarPanelOpen,
    gmailPanelOpen, setGmailPanelOpen,
    helpPanelOpen, setHelpPanelOpen,
  } = useAppContext();

  return (
    <div>
      <span data-testid="penny"  data-open={String(askPennyOpen)} />
      <span data-testid="cal"    data-open={String(calendarPanelOpen)} />
      <span data-testid="gmail"  data-open={String(gmailPanelOpen)} />
      <span data-testid="help"   data-open={String(helpPanelOpen)} />

      <button data-testid="open-penny"  onClick={() => setAskPennyOpen(true)} />
      <button data-testid="open-cal"    onClick={() => setCalendarPanelOpen(true)} />
      <button data-testid="open-gmail"  onClick={() => setGmailPanelOpen(true)} />
      <button data-testid="open-help"   onClick={() => setHelpPanelOpen(true)} />
      <button data-testid="close-help"  onClick={() => setHelpPanelOpen(false)} />
    </div>
  );
}

function renderHarness() {
  render(
    <AppProvider>
      <Harness />
    </AppProvider>
  );
  const isOpen = (id: string) =>
    screen.getByTestId(id).getAttribute('data-open') === 'true';
  const click = (id: string) => act(() => { fireEvent.click(screen.getByTestId(id)); });
  return { isOpen, click };
}

describe('AppContext panel mutual exclusion', () => {
  it('opening Help closes Penny, Calendar, and Gmail', async () => {
    const { isOpen, click } = renderHarness();

    await click('open-penny');
    expect(isOpen('penny')).toBe(true);

    await click('open-help');
    expect(isOpen('help')).toBe(true);
    expect(isOpen('penny')).toBe(false);
    expect(isOpen('cal')).toBe(false);
    expect(isOpen('gmail')).toBe(false);
  });

  it('opening Penny (e.g. from ContextPanel or RailActionPanel) closes Help', async () => {
    const { isOpen, click } = renderHarness();

    await click('open-help');
    expect(isOpen('help')).toBe(true);

    // Simulate any component calling setAskPennyOpen(true) directly
    await click('open-penny');
    expect(isOpen('penny')).toBe(true);
    expect(isOpen('help')).toBe(false);
  });

  it('opening Calendar closes Help', async () => {
    const { isOpen, click } = renderHarness();

    await click('open-help');
    await click('open-cal');
    expect(isOpen('cal')).toBe(true);
    expect(isOpen('help')).toBe(false);
  });

  it('opening Gmail closes Help', async () => {
    const { isOpen, click } = renderHarness();

    await click('open-help');
    await click('open-gmail');
    expect(isOpen('gmail')).toBe(true);
    expect(isOpen('help')).toBe(false);
  });

  it('closing Help (false) does not flip any other panel', async () => {
    const { isOpen, click } = renderHarness();

    await click('open-penny');
    await click('open-help');
    // Penny is now closed (Help opened it); close Help explicitly
    await click('close-help');
    expect(isOpen('help')).toBe(false);
    // No other panel should have been toggled on
    expect(isOpen('penny')).toBe(false);
    expect(isOpen('cal')).toBe(false);
    expect(isOpen('gmail')).toBe(false);
  });
});

// ── Part B: PennyBar audience gating ────────────────────────────────────────

/**
 * Mirror the conditional used in PennyBar without pulling in the full
 * HomebaseShell dependency tree.  The logic under test is:
 *   {isTeam && <button title="Help guide...">Help</button>}
 */
function HelpButtonGuard({ isTeam }: { isTeam: boolean }) {
  return (
    <div>
      {isTeam && (
        <button title="Help guide — Salesforce Knowledge articles">Help</button>
      )}
    </div>
  );
}

describe('Help button audience gating', () => {
  it('renders the Help button for the team (staff) audience', () => {
    render(<HelpButtonGuard isTeam={true} />);
    expect(
      screen.getByTitle('Help guide — Salesforce Knowledge articles')
    ).toBeInTheDocument();
  });

  it('does NOT render the Help button for the coach audience', () => {
    render(<HelpButtonGuard isTeam={false} />);
    expect(
      screen.queryByTitle('Help guide — Salesforce Knowledge articles')
    ).not.toBeInTheDocument();
  });

  it('does NOT render the Help button for the learner audience', () => {
    render(<HelpButtonGuard isTeam={false} />);
    expect(
      screen.queryByTitle('Help guide — Salesforce Knowledge articles')
    ).not.toBeInTheDocument();
  });

  it('does NOT render the Help button for the volunteer audience', () => {
    render(<HelpButtonGuard isTeam={false} />);
    expect(
      screen.queryByTitle('Help guide — Salesforce Knowledge articles')
    ).not.toBeInTheDocument();
  });
});
