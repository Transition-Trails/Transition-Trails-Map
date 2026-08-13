/**
 * slackPingButton.caseHoverCard.test.tsx
 *
 * Confirms that CaseHoverCard's Ping on Slack button recovers gracefully when
 * the /api/slack/status check fails or returns unexpected data, and that the
 * tooltip copy is distinct across states.
 *
 * Covers:
 *   S1. Network error (fetch rejects) → button stays enabled ("unknown" state)
 *   S2. Non-2xx response (e.g. 500 with JSON body) → button stays enabled
 *   S3. Malformed / missing `configured` field → button stays enabled
 *   S4. configured: false → disabled span + "not configured" tooltip text
 *   S5. configured: true → button enabled + standard tooltip text
 *
 * The Radix Popover is mocked to always render its content inline so the
 * popover body is immediately visible without a real click interaction.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';

// ── Mock Radix Popover so content renders inline ──────────────────────────────

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// ── Mock Radix Tooltip so tooltip content is always in the DOM ────────────────

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// ── Stub shared hooks ─────────────────────────────────────────────────────────

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ openLogTime: vi.fn() }),
}));

// ── Component under test ──────────────────────────────────────────────────────

import { CaseHoverCard } from '../../components/homebase/CaseHoverCard';

// ── Fixture ───────────────────────────────────────────────────────────────────

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
  OwnerName:          'Bob Smith',   // required — Ping section only renders when OwnerName is set
  ContactName:        null,
  AccountName:        null,
};

function renderCard() {
  return render(
    <CaseHoverCard
      case_={CASE_FIXTURE}
      orgBaseUrl="https://example.salesforce.com"
      followUpDateSupported={false}
      onStatusChange={vi.fn()}
      onCaseUpdate={vi.fn()}
    >
      <button>Open</button>
    </CaseHoverCard>,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns an enabled <button> element with "Ping on Slack" text, or null. */
function getPingButton() {
  return screen.queryByRole('button', { name: /ping on slack/i });
}

/** Returns the disabled span (rendered when Slack is confirmed not configured). */
function getDisabledPingSpan() {
  // The disabled state is a <span aria-disabled="true"> containing "Ping on Slack"
  return document.querySelector('[aria-disabled="true"]');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CaseHoverCard — Slack ping button status-check resilience', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // S1 ────────────────────────────────────────────────────────────────────────
  it('S1: keeps the Ping button enabled when the status fetch rejects (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    renderCard();

    // Wait for the useEffect fetch to settle
    await waitFor(() => {
      // An enabled <button> must be in the DOM (not the disabled span)
      expect(getPingButton()).toBeInTheDocument();
      expect(getPingButton()).not.toBeDisabled();
    });

    // The disabled span must NOT be present
    expect(getDisabledPingSpan()).toBeNull();

    // Tooltip text must signal a status-check failure, not a config problem
    const tooltip = screen.queryByTestId('tooltip-content');
    expect(tooltip).toHaveTextContent(/status check failed/i);
  });

  // S2 ────────────────────────────────────────────────────────────────────────
  it('S2: keeps the Ping button enabled when the server returns a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service unavailable' }),
    }));

    renderCard();

    await waitFor(() => {
      expect(getPingButton()).toBeInTheDocument();
      expect(getPingButton()).not.toBeDisabled();
    });

    expect(getDisabledPingSpan()).toBeNull();

    const tooltip = screen.queryByTestId('tooltip-content');
    expect(tooltip).toHaveTextContent(/status check failed/i);
  });

  // S3 ────────────────────────────────────────────────────────────────────────
  it('S3: keeps the Ping button enabled when the response payload is malformed', async () => {
    // Payload has no `configured` field — triggers the boolean-validation guard
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ someOtherField: 'unexpected' }),
    }));

    renderCard();

    await waitFor(() => {
      expect(getPingButton()).toBeInTheDocument();
      expect(getPingButton()).not.toBeDisabled();
    });

    expect(getDisabledPingSpan()).toBeNull();

    const tooltip = screen.queryByTestId('tooltip-content');
    expect(tooltip).toHaveTextContent(/status check failed/i);
  });

  // S4 ────────────────────────────────────────────────────────────────────────
  it('S4: disables the Ping button and shows "not configured" tooltip when configured=false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false }),
    }));

    renderCard();

    await waitFor(() => {
      // When Slack is confirmed not configured, a disabled span replaces the button
      expect(getDisabledPingSpan()).not.toBeNull();
    });

    // No active button must be present
    expect(getPingButton()).toBeNull();

    // Tooltip must say "not configured"
    const tooltip = screen.queryByTestId('tooltip-content');
    expect(tooltip).toHaveTextContent(/not configured/i);
    expect(tooltip).not.toHaveTextContent(/status check failed/i);
  });

  // S5 ────────────────────────────────────────────────────────────────────────
  it('S5: shows an enabled Ping button with a standard tooltip when configured=true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: true }),
    }));

    renderCard();

    await waitFor(() => {
      expect(getPingButton()).toBeInTheDocument();
      expect(getPingButton()).not.toBeDisabled();
    });

    expect(getDisabledPingSpan()).toBeNull();

    // Tooltip must NOT warn about failures
    const tooltip = screen.queryByTestId('tooltip-content');
    expect(tooltip).not.toHaveTextContent(/status check failed/i);
    expect(tooltip).not.toHaveTextContent(/not configured/i);
  });
});
