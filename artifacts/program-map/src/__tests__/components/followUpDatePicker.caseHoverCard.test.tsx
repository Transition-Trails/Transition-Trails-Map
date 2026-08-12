/**
 * followUpDatePicker.caseHoverCard.test.tsx
 *
 * Unit tests confirming CaseHoverCard respects the followUpDateSupported prop.
 *
 * Covers:
 *   D1. CaseHoverCard hides the date picker when followUpDateSupported=false
 *   D2. CaseHoverCard shows the date picker when followUpDateSupported=true
 *
 * The Radix Popover is mocked to always render its content inline so the
 * popover body is immediately visible without a real click interaction.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';

// ── Mock Radix Popover so content renders inline without interaction ───────────

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// ── Other deps needed by CaseHoverCard ───────────────────────────────────────

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
  OwnerName:          'Bob',
  ContactName:        null,
  AccountName:        null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CaseHoverCard — follow-up date picker visibility', () => {
  afterEach(() => { vi.clearAllMocks(); });

  function renderCard(followUpDateSupported: boolean) {
    return render(
      <CaseHoverCard
        case_={CASE_FIXTURE}
        orgBaseUrl="https://example.salesforce.com"
        followUpDateSupported={followUpDateSupported}
        onStatusChange={vi.fn()}
        onCaseUpdate={vi.fn()}
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
