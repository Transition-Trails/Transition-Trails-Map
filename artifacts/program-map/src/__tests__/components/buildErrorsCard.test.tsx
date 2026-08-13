/**
 * buildErrorsCard.test.tsx
 *
 * Tests for the BuildErrorsCard admin component.
 *
 * Test matrix:
 *
 *  Empty state
 *   E1. Renders "No build errors logged" empty-state title
 *   E2. Renders clean-system body text
 *   E3. Does NOT render a table row when list is empty
 *
 *  Populated state (1+ rows injected via initialData)
 *   P1. Renders a row for each build-error log entry
 *   P2. Error name is visible in the row
 *   P3. Truncated error message (first 80 chars) is shown
 *   P4. SF case number renders as a link
 *   P5. Row without sfCaseNumber shows "Pending"
 *   P6. Row with resolvedAt shows success (green) dot — no critical dot
 *   P7. Row without resolvedAt shows critical (open) dot
 *   P8. Resolution plan first line is rendered as preview
 *   P9. "No plan generated" shown when resolutionPlan is null
 *   P10. Card header always shows "Build Errors" title
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';

import { BuildErrorsCard, type BuildErrorLog } from '../../components/admin/BuildErrorsCard';

// ── Fixture factory ────────────────────────────────────────────────────────────

function makeLog(overrides: Partial<BuildErrorLog> = {}): BuildErrorLog {
  return {
    id:             1,
    fingerprint:    'TypeError:something is null',
    errorName:      'TypeError',
    errorMessage:   'Cannot read properties of null (reading \'id\')',
    stackTrace:     null,
    sfCaseId:       '5001a00000XyzAbcDE',
    sfCaseNumber:   '00001234',
    sfOrgBaseUrl:   'https://myorg.my.salesforce.com',
    resolutionPlan: '1. Check null guards\n2. Add defensive checks\n3. Review callers',
    resolvedAt:     null,
    createdAt:      new Date().toISOString(),
    ...overrides,
  };
}

// ── Empty state tests ─────────────────────────────────────────────────────────

describe('BuildErrorsCard — empty state', () => {
  test('E1: renders "No build errors logged" title', () => {
    render(<BuildErrorsCard initialData={[]} />);
    expect(screen.getByText(/no build errors logged/i)).toBeInTheDocument();
  });

  test('E2: renders clean-system body text', () => {
    render(<BuildErrorsCard initialData={[]} />);
    expect(screen.getByText(/system is clean/i)).toBeInTheDocument();
  });

  test('E3: no error-name text in DOM when list is empty', () => {
    render(<BuildErrorsCard initialData={[]} />);
    expect(screen.queryByText('TypeError')).not.toBeInTheDocument();
  });
});

// ── Populated state tests ──────────────────────────────────────────────────────

describe('BuildErrorsCard — populated state', () => {
  test('P1: renders a row for each log entry (2 rows)', () => {
    const data = [
      makeLog({ id: 1, errorName: 'TypeError' }),
      makeLog({ id: 2, errorName: 'DrizzleError', sfCaseNumber: '00001235', sfCaseId: '5001b00000XyzXxDE' }),
    ];
    render(<BuildErrorsCard initialData={data} />);
    expect(screen.getByText('TypeError')).toBeInTheDocument();
    expect(screen.getByText('DrizzleError')).toBeInTheDocument();
  });

  test('P2: error name is visible', () => {
    render(<BuildErrorsCard initialData={[makeLog({ errorName: 'RangeError' })]} />);
    expect(screen.getByText('RangeError')).toBeInTheDocument();
  });

  test('P3: error message (first 80 chars) is shown', () => {
    const msg = 'Cannot read properties of null (reading \'id\')';
    render(<BuildErrorsCard initialData={[makeLog({ errorMessage: msg })]} />);
    expect(screen.getByText(msg.slice(0, 80))).toBeInTheDocument();
  });

  test('P4: SF case number renders as a link', () => {
    render(<BuildErrorsCard initialData={[makeLog()]} />);
    const link = screen.getByRole('link', { name: /#00001234/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('5001a00000XyzAbcDE'));
  });

  test('P5: row without sfCaseNumber shows "Pending"', () => {
    render(<BuildErrorsCard initialData={[makeLog({ sfCaseNumber: null, sfCaseId: null })]} />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test('P6: resolved row does NOT show open (critical) dot title', () => {
    const { container } = render(
      <BuildErrorsCard initialData={[makeLog({ resolvedAt: new Date().toISOString() })]} />,
    );
    const openDot = container.querySelector('[title="Open"]');
    expect(openDot).toBeNull();
  });

  test('P7: unresolved row shows open dot', () => {
    const { container } = render(
      <BuildErrorsCard initialData={[makeLog({ resolvedAt: null })]} />,
    );
    const openDot = container.querySelector('[title="Open"]');
    expect(openDot).toBeTruthy();
  });

  test('P8: first line of resolution plan is shown as preview', () => {
    render(<BuildErrorsCard initialData={[makeLog()]} />);
    expect(screen.getByText('1. Check null guards')).toBeInTheDocument();
  });

  test('P9: "No plan generated" shown when resolutionPlan is null', () => {
    render(<BuildErrorsCard initialData={[makeLog({ resolutionPlan: null })]} />);
    expect(screen.getByText(/no plan generated/i)).toBeInTheDocument();
  });

  test('P10: card header always shows "Build Errors" title', () => {
    render(<BuildErrorsCard initialData={[]} />);
    expect(screen.getByText('Build Errors')).toBeInTheDocument();
  });
});
