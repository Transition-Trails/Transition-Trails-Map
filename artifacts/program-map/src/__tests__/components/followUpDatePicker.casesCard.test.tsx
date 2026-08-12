/**
 * followUpDatePicker.casesCard.test.tsx
 *
 * Integration tests confirming that CasesCard and CasesPage keep the
 * follow-up date picker hidden when the SF org doesn't have the field.
 *
 * CaseHoverCard is replaced with a spy component that exposes the
 * followUpDateSupported prop via a sentinel element, letting us verify
 * the prop value without fighting Radix Popover internals.
 *
 * Covers:
 *   D3. CasesCard defaults followUpDateSupported to false on initial render
 *   D4. CasesCard keeps followUpDateSupported=false when the API omits the field
 *   D5. CasesCard sets followUpDateSupported=true only when the API returns true
 *   D6. CasesPage defaults followUpDateSupported to false on initial render
 *   D7. CasesPage keeps followUpDateSupported=false when the API omits the field
 *   D8. CasesPage sets followUpDateSupported=true only when the API returns true
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Spy CaseHoverCard — captures the followUpDateSupported prop ───────────────
//
// This mock MUST be declared before any component imports so that vi.mock
// hoisting applies correctly.

vi.mock('@/components/homebase/CaseHoverCard', () => ({
  CaseHoverCard: ({
    followUpDateSupported,
    children,
  }: {
    followUpDateSupported: boolean;
    children: React.ReactNode;
  }) => (
    <>
      {children}
      {followUpDateSupported
        ? <div data-testid="date-picker-allowed" />
        : <div data-testid="date-picker-hidden" />
      }
    </>
  ),
}));

// ── Other shared mocks ────────────────────────────────────────────────────────

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ openLogTime: vi.fn(), openAskPenny: vi.fn() }),
}));

vi.mock('@/utils/openSfAuthPopup', () => ({
  openSfAuthPopup: vi.fn(),
}));

vi.mock('@/hooks/useCollapsible', () => ({
  useCollapsible: (_key: string, defaultOpen: boolean) => [defaultOpen, vi.fn()],
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

vi.mock('@/components/homebase/SubmitCaseDrawer', () => ({
  SubmitCaseDrawer: () => null,
}));

// ── Components under test ─────────────────────────────────────────────────────

import { CasesCard } from '../../components/homebase/CasesCard';
import CasesPage    from '../../pages/homebase/CasesPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const CASE_FIXTURE = {
  Id:                 'CASE001',
  CaseNumber:         '00001',
  Subject:            'Test Case',
  Priority:           'Medium',
  Status:             'New',
  CreatedDate:        '2026-01-01T00:00:00Z',
  LastModifiedDate:   '2026-01-02T00:00:00Z',
  LastModifiedByName: 'Alice',
  FollowUpDate:       null,
  OwnerName:          'Bob',
  ContactName:        null,
  AccountName:        null,
};

// ── CasesCard tests ───────────────────────────────────────────────────────────

describe('CasesCard — followUpDateSupported default and post-fetch state', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => { fetchSpy?.mockRestore(); vi.clearAllMocks(); });

  // D3 ────────────────────────────────────────────────────────────────────────
  it('D3: does not render CaseHoverCard with date picker allowed before fetch resolves', () => {
    // Fetch never resolves — component stays in loading state
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
      () => new Promise(() => { /* never */ }),
    );

    render(<CasesCard />);

    // Loading spinner should be visible; no case rows rendered yet
    expect(screen.queryByTestId('date-picker-allowed')).toBeNull();
    expect(screen.queryByTestId('date-picker-hidden')).toBeNull();
  });

  // D4 ────────────────────────────────────────────────────────────────────────
  it('D4: keeps date picker hidden when API response omits followUpDateSupported', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/api/sf/cases')) {
        return Promise.resolve(
          jsonResponse({
            cases: [CASE_FIXTURE],
            orgBaseUrl: 'https://ex.salesforce.com',
            // followUpDateSupported intentionally omitted
          }),
        );
      }
      return Promise.resolve(jsonResponse({ summary: {} }));
    });

    render(<CasesCard />);

    await waitFor(() =>
      expect(screen.getByText('Test Case')).toBeInTheDocument(),
    );

    // Sentinel for false must be present; sentinel for true must be absent
    expect(screen.getByTestId('date-picker-hidden')).toBeInTheDocument();
    expect(screen.queryByTestId('date-picker-allowed')).toBeNull();
  });

  // D5 ────────────────────────────────────────────────────────────────────────
  it('D5: shows date picker when API explicitly returns followUpDateSupported=true', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/api/sf/cases')) {
        return Promise.resolve(
          jsonResponse({
            cases: [CASE_FIXTURE],
            orgBaseUrl: 'https://ex.salesforce.com',
            followUpDateSupported: true,
          }),
        );
      }
      return Promise.resolve(jsonResponse({ summary: {} }));
    });

    render(<CasesCard />);

    await waitFor(() =>
      expect(screen.getByText('Test Case')).toBeInTheDocument(),
    );

    expect(screen.getByTestId('date-picker-allowed')).toBeInTheDocument();
    expect(screen.queryByTestId('date-picker-hidden')).toBeNull();
  });

  // D9 ────────────────────────────────────────────────────────────────────────
  it('D9: date picker stays hidden after SF reconnect when reconnect response omits followUpDateSupported', async () => {
    // This test exercises the riskier reconnect path:
    //
    //   Phase 1 (first page load): followUpDateSupported=true → picker shown.
    //   Phase 2 (session expires):  401 returned → sfUnavailable state.
    //   Phase 3 (after reconnect):  cases returned but field omitted → picker
    //                               must stay hidden, not retain the stale true
    //                               value from Phase 1.
    //
    // Each phase is simulated by unmounting and remounting CasesCard (i.e. a
    // full page reload).  The load() reset added at the top of each call
    // guarantees followUpDateSupported is cleared to false before evaluating
    // whatever the API returns, so a stale true can never bleed into a later
    // call even if the component is never unmounted.

    let sfCasesCallCount = 0;

    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const u = String(url);
      // Main cases list endpoint only — exclude /statuses and unrelated paths
      if (u.includes('/api/sf/cases') && !u.includes('statuses')) {
        sfCasesCallCount++;
        if (sfCasesCallCount === 1) {
          // Phase 1: successful load — field present and true.
          return Promise.resolve(
            jsonResponse({
              cases: [CASE_FIXTURE],
              orgBaseUrl: 'https://ex.salesforce.com',
              followUpDateSupported: true,
            }),
          );
        }
        if (sfCasesCallCount === 2) {
          // Phase 2: session expired — SF unavailable.
          return Promise.resolve(new Response(null, { status: 401 }));
        }
        // Phase 3: reconnected — field deliberately omitted.
        return Promise.resolve(
          jsonResponse({
            cases: [CASE_FIXTURE],
            orgBaseUrl: 'https://ex.salesforce.com',
            // followUpDateSupported intentionally omitted
          }),
        );
      }
      // statuses + time-log summary — non-critical, return empty-but-ok
      return Promise.resolve(jsonResponse({ statuses: [], summary: {} }));
    });

    // ── Phase 1: field present → picker allowed ───────────────────────────────
    const { unmount: unmount1 } = render(<CasesCard />);
    await waitFor(() =>
      expect(screen.getByText('Test Case')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('date-picker-allowed')).toBeInTheDocument();
    unmount1();

    // ── Phase 2: session expired → SF unavailable ─────────────────────────────
    const { unmount: unmount2 } = render(<CasesCard />);
    await waitFor(() =>
      expect(
        screen.getByText('Connect to Salesforce to see your cases.'),
      ).toBeInTheDocument(),
    );
    unmount2();

    // ── Phase 3: reconnect but field omitted → picker must stay hidden ─────────
    render(<CasesCard />);
    await waitFor(() =>
      expect(screen.getByText('Test Case')).toBeInTheDocument(),
    );

    expect(screen.getByTestId('date-picker-hidden')).toBeInTheDocument();
    expect(screen.queryByTestId('date-picker-allowed')).toBeNull();
  });
});

// ── CasesPage tests ───────────────────────────────────────────────────────────

describe('CasesPage — followUpDateSupported default and post-fetch state', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => { fetchSpy?.mockRestore(); vi.clearAllMocks(); });

  function mockFetch(casesExtra: Record<string, unknown> = {}) {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/api/sf/cases')) {
        return Promise.resolve(
          jsonResponse({
            cases: [CASE_FIXTURE],
            orgBaseUrl: 'https://ex.salesforce.com',
            ...casesExtra,
          }),
        );
      }
      if (u.includes('/api/cases/submitted')) {
        return Promise.resolve(jsonResponse({ cases: [] }));
      }
      if (u.includes('/api/time-logs/summary')) {
        return Promise.resolve(jsonResponse({ summary: {} }));
      }
      return Promise.resolve(jsonResponse({}));
    });
  }

  // D6 ────────────────────────────────────────────────────────────────────────
  it('D6: does not render CaseHoverCard with date picker allowed before fetch resolves', () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
      () => new Promise(() => { /* never */ }),
    );

    render(<CasesPage />);

    expect(screen.queryByTestId('date-picker-allowed')).toBeNull();
  });

  // D7 ────────────────────────────────────────────────────────────────────────
  it('D7: keeps date picker hidden when API response omits followUpDateSupported', async () => {
    mockFetch(/* no followUpDateSupported key */);

    render(<CasesPage />);

    await waitFor(() =>
      expect(screen.getByText('Test Case')).toBeInTheDocument(),
    );

    expect(screen.getByTestId('date-picker-hidden')).toBeInTheDocument();
    expect(screen.queryByTestId('date-picker-allowed')).toBeNull();
  });

  // D8 ────────────────────────────────────────────────────────────────────────
  it('D8: shows date picker when API explicitly returns followUpDateSupported=true', async () => {
    mockFetch({ followUpDateSupported: true });

    render(<CasesPage />);

    await waitFor(() =>
      expect(screen.getByText('Test Case')).toBeInTheDocument(),
    );

    expect(screen.getByTestId('date-picker-allowed')).toBeInTheDocument();
    expect(screen.queryByTestId('date-picker-hidden')).toBeNull();
  });
});
