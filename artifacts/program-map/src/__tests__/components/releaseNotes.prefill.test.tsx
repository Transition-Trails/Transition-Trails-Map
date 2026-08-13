/**
 * releaseNotes.prefill.test.tsx
 *
 * Confirms that clicking the flag icon on a release-note entry opens
 * SubmitCaseDrawer with the correct pre-filled `initialSubject` and
 * `initialDescription` props.
 *
 * The pre-fill helpers tested indirectly here:
 *   • truncateAtWord(text, 80)  — truncates at a word boundary and appends "…"
 *   • escapeHtml(s)             — escapes & < > in the description HTML
 *   • makeReportSubject(version, text)
 *   • makeReportDescription(version, date, kind, text)
 *
 * Test matrix
 * ───────────
 *  P1. Short text (< 80 chars) — no truncation; full text appears in subject
 *  P2. Text exactly 80 chars   — text.length <= maxLen → returned unchanged
 *  P3. Text > 80 chars         — truncated at word boundary; "…" appended
 *  P4. Text with special HTML chars (& < >) — escaped in description; raw in subject
 *  P5. Multiple entries on the same release — each flag targets the correct entry
 *  P6. "minor" kind entry — description block contains "Minor" as the kind label
 *  P7. "fix" kind entry — description block contains "Bug Fix" as the kind label
 *  P8. Version and date appear correctly in subject and description
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted: runs before module mocks, so these values are available
//               inside vi.mock() factories as well as in test bodies ──────────

const FIXTURE = vi.hoisted(() => {
  const SHORT_TEXT   = 'Short entry text under 80 chars.';
  // 80 chars exactly — text.length <= maxLen path returns unchanged
  const EXACT80      = 'E'.repeat(79) + 'X';
  const LONG_TEXT    = 'The quick brown fox jumped over the lazy dog and then continued running far away.';
  const HTML_SPECIAL = 'Entry with & ampersand, <less>, and >greater< chars.';

  return { SHORT_TEXT, EXACT80, LONG_TEXT, HTML_SPECIAL };
});

// ── Controlled RELEASES fixture ───────────────────────────────────────────────
// Entries are grouped by kind when rendered (major → minor → fix), so the
// rendered flag-button order is:
//   index 0: major — SHORT_TEXT
//   index 1: major — HTML_SPECIAL
//   index 2: minor — EXACT80
//   index 3: fix   — LONG_TEXT

vi.mock('@/data/releaseData', () => ({
  RELEASES: [
    {
      version: '9.9',
      date:    'January 1, 2025',
      label:   'Test',
      entries: [
        { kind: 'major', text: FIXTURE.SHORT_TEXT   },
        { kind: 'major', text: FIXTURE.HTML_SPECIAL },
        { kind: 'minor', text: FIXTURE.EXACT80      },
        { kind: 'fix',   text: FIXTURE.LONG_TEXT    },
      ],
    },
  ],
}));

// ── Stable kind-label map (mirrors KIND_META in ReleaseNotes.tsx) ─────────────

const KIND_LABEL: Record<string, string> = {
  major: 'Major',
  minor: 'Minor',
  fix:   'Bug Fix',
};

// ── Local copies of the pure helpers (mirrors ReleaseNotes.tsx exactly) ───────
// Any logic drift between these copies and the source will be caught by the
// integration assertions below (the rendered props must equal the expected
// values computed by these helpers).

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced) + '…';
}

function makeReportSubject(version: string, text: string): string {
  return `Issue with v${version}: ${truncateAtWord(text, 80)}`;
}

function makeReportDescription(
  version: string,
  date: string,
  kind: string,
  text: string,
): string {
  const kindLabel = KIND_LABEL[kind];
  return [
    `<p><strong>Version:</strong> v${escapeHtml(version)} — ${escapeHtml(date)}</p>`,
    `<p><strong>Change kind:</strong> ${escapeHtml(kindLabel)}</p>`,
    `<p><strong>Entry:</strong> ${escapeHtml(text)}</p>`,
    `<p>&nbsp;</p>`,
    `<p>Describe the issue below:</p>`,
  ].join('');
}

// ── Spy on SubmitCaseDrawer — capture the last props it was rendered with ──────

interface DrawerProps {
  open:                boolean;
  onClose:             () => void;
  initialType?:        string;
  initialSubject?:     string;
  initialDescription?: string;
}

let capturedDrawerProps: DrawerProps | null = null;

vi.mock('@/components/homebase/SubmitCaseDrawer', () => ({
  SubmitCaseDrawer: (props: DrawerProps) => {
    capturedDrawerProps = props;
    return <div data-testid="submit-case-drawer" data-open={String(props.open)} />;
  },
}));

// ── Stub all hooks ReleaseNotes depends on ────────────────────────────────────

vi.mock('@/hooks/useSeenVersion', () => ({
  useSeenVersion: () => ({
    lastSeenVersion:  '1.0',
    markSeen:         vi.fn(),
    isReady:          true,
    hasUnseenRelease: false,
  }),
}));

vi.mock('@/hooks/useHomebaseTour', () => ({
  useHomebaseTour: () => ({ startTour: vi.fn() }),
}));

vi.mock('@/hooks/useMissionControlTour', () => ({
  useMissionControlTour: () => ({ startTour: vi.fn() }),
}));

vi.mock('@/hooks/useHomebaseAuth', () => ({
  useHomebaseAuth: () => ({
    isLoading:   false,
    isSignedIn:  true,
    audience:    null,   // staff path — no HomebaseShell navigation side-effects
    email:       null,
    displayName: null,
    coachLevel:  null,
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/release-notes', vi.fn()],
}));

// ── Import the component AFTER all vi.mock declarations ───────────────────────

import ReleaseNotes from '../../pages/ReleaseNotes';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns all flag icon buttons rendered in the entry list. */
function getFlagButtons(): HTMLElement[] {
  return screen.getAllByTitle('Report an issue with this change');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReleaseNotes — flag icon pre-fill (initialSubject / initialDescription)', () => {

  beforeEach(() => {
    capturedDrawerProps = null;
  });

  // ── P1: short text (< 80 chars) ──────────────────────────────────────────────

  test(
    'P1: short text (< 80 chars) — subject contains full text without truncation',
    () => {
      render(<ReleaseNotes />);

      // Entry order after grouping by kind: major[0]=SHORT_TEXT, major[1]=HTML_SPECIAL,
      // minor[2]=EXACT80, fix[3]=LONG_TEXT
      const flags = getFlagButtons();
      fireEvent.click(flags[0]);   // SHORT_TEXT (major)

      expect(capturedDrawerProps).not.toBeNull();
      const { initialSubject, initialDescription } = capturedDrawerProps!;

      const expectedSubject = makeReportSubject('9.9', FIXTURE.SHORT_TEXT);
      expect(initialSubject).toBe(expectedSubject);
      // Full text — no ellipsis appended
      expect(initialSubject).not.toContain('…');
      expect(initialSubject).toContain(FIXTURE.SHORT_TEXT);

      const expectedDesc = makeReportDescription('9.9', 'January 1, 2025', 'major', FIXTURE.SHORT_TEXT);
      expect(initialDescription).toBe(expectedDesc);
      expect(initialDescription).toContain(escapeHtml(FIXTURE.SHORT_TEXT));
      expect(initialDescription).toContain('Major');
    },
  );

  // ── P2: text exactly 80 chars ─────────────────────────────────────────────────

  test(
    'P2: text exactly 80 chars — truncateAtWord returns the full string (≤ maxLen path, no "…")',
    () => {
      // Self-check: fixture must be exactly 80 chars or the test proves nothing
      expect(FIXTURE.EXACT80.length).toBe(80);

      render(<ReleaseNotes />);

      const flags = getFlagButtons();
      fireEvent.click(flags[2]);   // EXACT80 (minor)

      expect(capturedDrawerProps).not.toBeNull();
      const { initialSubject, initialDescription } = capturedDrawerProps!;

      const expectedSubject = makeReportSubject('9.9', FIXTURE.EXACT80);
      expect(initialSubject).toBe(expectedSubject);
      // text.length === maxLen → no truncation, no ellipsis
      expect(initialSubject).not.toContain('…');
      expect(initialSubject).toContain(FIXTURE.EXACT80);

      const expectedDesc = makeReportDescription('9.9', 'January 1, 2025', 'minor', FIXTURE.EXACT80);
      expect(initialDescription).toBe(expectedDesc);
      expect(initialDescription).toContain('Minor');
    },
  );

  // ── P3: text longer than 80 chars → word-boundary truncation ─────────────────

  test(
    'P3: text > 80 chars — subject truncated at a word boundary with "…" appended',
    () => {
      expect(FIXTURE.LONG_TEXT.length).toBeGreaterThan(80);   // self-check

      render(<ReleaseNotes />);

      const flags = getFlagButtons();
      fireEvent.click(flags[3]);   // LONG_TEXT (fix)

      expect(capturedDrawerProps).not.toBeNull();
      const { initialSubject, initialDescription } = capturedDrawerProps!;

      const expectedSubject = makeReportSubject('9.9', FIXTURE.LONG_TEXT);
      expect(initialSubject).toBe(expectedSubject);

      // Ellipsis must be present
      expect(initialSubject).toContain('…');

      // The truncated portion must end at a word boundary (no mid-word cut)
      const prefix = 'Issue with v9.9: ';
      const truncated = initialSubject!.slice(prefix.length);
      expect(truncated.endsWith('…')).toBe(true);
      // The char just before the ellipsis is a word character (part of the last complete word)
      const beforeEllipsis = truncated.slice(0, -1);
      expect(beforeEllipsis.at(-1)).not.toBe(' ');

      // Description must contain the FULL (untruncated) text
      const expectedDesc = makeReportDescription('9.9', 'January 1, 2025', 'fix', FIXTURE.LONG_TEXT);
      expect(initialDescription).toBe(expectedDesc);
      expect(initialDescription).toContain(escapeHtml(FIXTURE.LONG_TEXT));
      expect(initialDescription).toContain('Bug Fix');
    },
  );

  // ── P4: special HTML chars → escaped in description; raw in subject ───────────

  test(
    'P4: text with & < > — escaped in initialDescription; appear raw in initialSubject',
    () => {
      render(<ReleaseNotes />);

      const flags = getFlagButtons();
      fireEvent.click(flags[1]);   // HTML_SPECIAL (second major entry)

      expect(capturedDrawerProps).not.toBeNull();
      const { initialSubject, initialDescription } = capturedDrawerProps!;

      const expectedSubject = makeReportSubject('9.9', FIXTURE.HTML_SPECIAL);
      expect(initialSubject).toBe(expectedSubject);
      // Subject carries the raw text — no HTML escaping applied
      expect(initialSubject).toContain('&');
      expect(initialSubject).toContain('<');
      expect(initialSubject).toContain('>');

      const expectedDesc = makeReportDescription('9.9', 'January 1, 2025', 'major', FIXTURE.HTML_SPECIAL);
      expect(initialDescription).toBe(expectedDesc);
      // Description must contain escaped entities
      expect(initialDescription).toContain('&amp;');
      expect(initialDescription).toContain('&lt;');
      expect(initialDescription).toContain('&gt;');

      // The <Entry> paragraph specifically must not expose raw < or raw standalone &
      const entryMatch = initialDescription!.match(/<p><strong>Entry:<\/strong>(.*?)<\/p>/s);
      const entryBlock = entryMatch?.[1] ?? '';
      // Raw unescaped ampersand (followed by a space or letter that would form an entity)
      // must not appear inside the entry block
      expect(entryBlock).not.toMatch(/&(?!amp;|lt;|gt;|nbsp;)/);
    },
  );

  // ── P5: each flag targets its own entry ──────────────────────────────────────

  test(
    'P5: clicking different flag icons pre-fills each with the correct entry text',
    () => {
      render(<ReleaseNotes />);
      const flags = getFlagButtons();

      // Click first flag → SHORT_TEXT (major)
      fireEvent.click(flags[0]);
      const firstSubject = capturedDrawerProps?.initialSubject;

      // Click fourth flag → LONG_TEXT (fix)
      capturedDrawerProps = null;
      fireEvent.click(flags[3]);
      const fourthSubject = capturedDrawerProps?.initialSubject;

      expect(firstSubject).toContain(FIXTURE.SHORT_TEXT);   // not truncated
      expect(firstSubject).not.toContain('…');
      expect(fourthSubject).toContain('…');                 // LONG_TEXT was truncated
      expect(fourthSubject).not.toBe(firstSubject);
    },
  );

  // ── P6: "minor" kind → description shows "Minor" ─────────────────────────────

  test(
    'P6: minor-kind entry — initialDescription contains "Minor" as the change-kind label',
    () => {
      render(<ReleaseNotes />);
      const flags = getFlagButtons();
      fireEvent.click(flags[2]);   // EXACT80 (minor)

      expect(capturedDrawerProps?.initialDescription).toContain('Minor');
      expect(capturedDrawerProps?.initialDescription).not.toContain('Bug Fix');
      expect(capturedDrawerProps?.initialDescription).not.toContain('Major');
    },
  );

  // ── P7: "fix" kind → description shows "Bug Fix" ─────────────────────────────

  test(
    'P7: fix-kind entry — initialDescription contains "Bug Fix" as the change-kind label',
    () => {
      render(<ReleaseNotes />);
      const flags = getFlagButtons();
      fireEvent.click(flags[3]);   // LONG_TEXT (fix)

      expect(capturedDrawerProps?.initialDescription).toContain('Bug Fix');
      expect(capturedDrawerProps?.initialDescription).not.toContain('Minor');
      expect(capturedDrawerProps?.initialDescription).not.toContain('Major');
    },
  );

  // ── P8: version and date appear in subject and description ───────────────────

  test(
    'P8: version "9.9" and date "January 1, 2025" appear correctly in subject and description',
    () => {
      render(<ReleaseNotes />);
      const flags = getFlagButtons();
      fireEvent.click(flags[0]);

      expect(capturedDrawerProps?.initialSubject).toContain('v9.9');
      expect(capturedDrawerProps?.initialDescription).toContain('v9.9');
      expect(capturedDrawerProps?.initialDescription).toContain('January 1, 2025');
    },
  );
});
