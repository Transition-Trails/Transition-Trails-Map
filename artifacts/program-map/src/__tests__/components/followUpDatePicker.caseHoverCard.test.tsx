/**
 * followUpDatePicker.caseHoverCard.test.tsx
 *
 * Unit tests confirming CaseHoverCard respects the followUpDateSupported prop
 * and handles the fieldUnsupported server response correctly.
 *
 * Covers:
 *   D1. CaseHoverCard hides the date picker when followUpDateSupported=false
 *   D2. CaseHoverCard shows the date picker when followUpDateSupported=true
 *   D3. When the PATCH returns { fieldUnsupported: true }, onCaseUpdate is NOT
 *       called and a toast is shown instead
 *
 * The Radix Popover is mocked to always render its content inline so the
 * popover body is immediately visible without a real click interaction.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';

// ── Mock Radix Popover so content renders inline without interaction ───────────

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// ── Shared toast spy (hoisted so D3 can assert on it) ─────────────────────────

const mockToast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
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
  OwnerName:          'Bob',
  ContactName:        null,
  AccountName:        null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CaseHoverCard — follow-up date picker visibility', () => {
  afterEach(() => { vi.clearAllMocks(); });

  function renderCard(followUpDateSupported: boolean, onCaseUpdate = vi.fn()) {
    return render(
      <CaseHoverCard
        case_={CASE_FIXTURE}
        orgBaseUrl="https://example.salesforce.com"
        followUpDateSupported={followUpDateSupported}
        onStatusChange={vi.fn()}
        onCaseUpdate={onCaseUpdate}
      >
        <button>Open</button>
      </CaseHoverCard>,
    );
  }

  // D1 ────────────────────────────────────────────────────────────────────────
  it('D1: hides the Follow-up Date section when followUpDateSupported=false', () => {
    renderCard(false);

    // The section heading must not appear
    expect(screen.queryByText(/follow-up date/i)).not.toBeInTheDocument();
    // The date input must not appear
    expect(document.querySelector('input[type="date"]')).toBeNull();
  });

  // D2 ────────────────────────────────────────────────────────────────────────
  it('D2: shows the Follow-up Date section when followUpDateSupported=true', () => {
    renderCard(true);

    // The section heading must be present
    expect(screen.getByText(/follow-up date/i)).toBeInTheDocument();
    // The date input must be rendered
    expect(document.querySelector('input[type="date"]')).not.toBeNull();
  });
});

// ── D3: fieldUnsupported server response ──────────────────────────────────────

describe('CaseHoverCard — saveFollowUpDate fieldUnsupported guard', () => {
  beforeEach(() => {
    // Stub global fetch to simulate the server returning { fieldUnsupported: true }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fieldUnsupported: true }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('D3: does not call onCaseUpdate and shows a toast when fieldUnsupported=true', async () => {
    const onCaseUpdate = vi.fn();

    render(
      <CaseHoverCard
        case_={CASE_FIXTURE}
        orgBaseUrl="https://example.salesforce.com"
        followUpDateSupported={true}
        onStatusChange={vi.fn()}
        onCaseUpdate={onCaseUpdate}
      >
        <button>Open</button>
      </CaseHoverCard>,
    );

    // The date input must be present (followUpDateSupported=true)
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).not.toBeNull();

    // Change the date value to something different from the fixture (null → "2026-09-01")
    // so saveFollowUpDate doesn't short-circuit on "value === prev".
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } });
    // Blur triggers saveFollowUpDate
    fireEvent.blur(dateInput, { target: { value: '2026-09-01' } });

    // Wait for the async save to complete
    await waitFor(() => {
      // fetch must have been called (the PATCH request was made)
      expect(fetch).toHaveBeenCalledWith(
        `/api/sf/cases/${CASE_FIXTURE.Id}`,
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    // onCaseUpdate must NOT have been called — a stale date must not propagate
    expect(onCaseUpdate).not.toHaveBeenCalled();

    // A toast must have been shown to inform the user the field isn't available
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Follow-up date not available' }),
    );
  });
});
