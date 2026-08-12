/**
 * tourReplay.audienceAware.test.tsx
 *
 * Confirms that the Homebase tour replay path is audience-aware:
 *
 *   1. HomebaseTour renders the correct audience-specific first step for each
 *      of the four audiences (team / coach / learner / volunteer).
 *
 *   2. The "Take the tour" button in ReleaseNotes calls startTour() so the
 *      already-mounted HomebaseTour overlay can open — the audience it opens
 *      with is whatever the enclosing HomebaseShell received from auth, not
 *      something hard-coded in ReleaseNotes itself.
 *
 *   3. For homebase audience users (learner / coach / volunteer / team-as-homebase),
 *      clicking "Take the tour" opens the overlay IN-PLACE — no URL navigation
 *      happens (no pushState / popstate dispatch).
 *
 * Test matrix:
 *
 *  T1. HomebaseTour audience="team"      → first step "Welcome to your Homebase"
 *  T2. HomebaseTour audience="coach"     → first step "Welcome, Coach"
 *  T3. HomebaseTour audience="learner"   → first step "Welcome to your Homebase"
 *  T4. HomebaseTour audience="volunteer" → first step "Welcome, Volunteer"
 *  T1b. open=false → no tour content rendered
 *  T5. ReleaseNotes "Take the tour" (staff, non-homebase)  → calls startTour()
 *  T6. ReleaseNotes "Take the tour" (staff, non-homebase)  → navigates toward /homebase
 *  T7. ReleaseNotes "Take the tour" (homebase audience)    → overlay visible, NO URL change
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HomebaseAudience } from '@/hooks/useHomebaseAuth';

// ── Stub framer-motion so AnimatePresence renders children immediately ─────────
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: new Proxy({}, {
      get: (_: unknown, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ children, ...rest }: any) => React.createElement(tag, rest, children),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ── Configurable audience mock (controls isHombaseAudience in ReleaseNotes) ───

let _mockAudience: HomebaseAudience | null = null;

vi.mock('@/hooks/useHomebaseAuth', () => ({
  useHomebaseAuth: () => ({
    isLoading:   false,
    isSignedIn:  _mockAudience !== null,
    audience:    _mockAudience,
    email:       _mockAudience ? 'test@example.com' : null,
    displayName: _mockAudience ? 'Test User' : null,
    coachLevel:  null,
  }),
}));

// ── Stub hooks that make network calls ────────────────────────────────────────

const mockStartTour = vi.fn();

vi.mock('@/hooks/useHomebaseTour', () => ({
  useHomebaseTour: () => ({
    isReady:         true,
    tourActive:      false,
    shouldAutoStart: false,
    startTour:       mockStartTour,
    completeTour:    vi.fn(),
  }),
}));

vi.mock('@/hooks/useSeenVersion', () => ({
  useSeenVersion: () => ({
    hasUnseenRelease: false,
    lastSeenVersion:  '1.0',
    markSeen:         vi.fn(),
    isReady:          true,
  }),
}));

vi.mock('@/config/version', () => ({ APP_VERSION: '1.0' }));

// ── Stub SubmitCaseDrawer (uses browser APIs not in jsdom) ────────────────────

vi.mock('@/components/homebase/SubmitCaseDrawer', () => ({
  SubmitCaseDrawer: () => null,
}));

// ── Stub releaseData with minimal fixture ─────────────────────────────────────

vi.mock('@/data/releaseData', () => ({
  RELEASES: [
    {
      version: '1.0',
      date:    'Jan 2026',
      label:   'Current',
      entries: [{ kind: 'major', text: 'Initial release.' }],
    },
  ],
}));

// ── Import components AFTER vi.mock declarations ──────────────────────────────

import { HomebaseTour } from '../../components/homebase/HomebaseTour';
import ReleaseNotes from '../../pages/ReleaseNotes';

// ── First-step title map — the ground truth ──────────────────────────────────

const FIRST_STEP_TITLES: Record<string, string> = {
  team:      'Welcome to your Homebase',
  coach:     'Welcome, Coach',
  learner:   'Welcome to your Homebase',
  volunteer: 'Welcome, Volunteer',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HomebaseTour — audience-specific first step', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── T1 ────────────────────────────────────────────────────────────────────────

  test('T1: audience="team" → first step is "Welcome to your Homebase"', () => {
    render(
      <HomebaseTour
        open={true}
        onComplete={vi.fn()}
        audience="team"
        seenStepKeysAtOpen={new Set()}
        onMarkStepSeen={vi.fn()}
        onShowAllSteps={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: FIRST_STEP_TITLES.team }))
      .toBeInTheDocument();
  });

  // ── T2 ────────────────────────────────────────────────────────────────────────

  test('T2: audience="coach" → first step is "Welcome, Coach"', () => {
    render(
      <HomebaseTour
        open={true}
        onComplete={vi.fn()}
        audience="coach"
        seenStepKeysAtOpen={new Set()}
        onMarkStepSeen={vi.fn()}
        onShowAllSteps={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: FIRST_STEP_TITLES.coach }))
      .toBeInTheDocument();
  });

  // ── T3 ────────────────────────────────────────────────────────────────────────

  test('T3: audience="learner" → first step is "Welcome to your Homebase"', () => {
    render(
      <HomebaseTour
        open={true}
        onComplete={vi.fn()}
        audience="learner"
        seenStepKeysAtOpen={new Set()}
        onMarkStepSeen={vi.fn()}
        onShowAllSteps={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: FIRST_STEP_TITLES.learner }))
      .toBeInTheDocument();
  });

  // ── T4 ────────────────────────────────────────────────────────────────────────

  test('T4: audience="volunteer" → first step is "Welcome, Volunteer"', () => {
    render(
      <HomebaseTour
        open={true}
        onComplete={vi.fn()}
        audience="volunteer"
        seenStepKeysAtOpen={new Set()}
        onMarkStepSeen={vi.fn()}
        onShowAllSteps={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: FIRST_STEP_TITLES.volunteer }))
      .toBeInTheDocument();
  });

  // ── T1b: closed tour shows nothing ───────────────────────────────────────────

  test('T1b: open=false → no tour content rendered', () => {
    render(
      <HomebaseTour
        open={false}
        onComplete={vi.fn()}
        audience="team"
        seenStepKeysAtOpen={new Set()}
        onMarkStepSeen={vi.fn()}
        onShowAllSteps={vi.fn()}
      />,
    );

    expect(screen.queryByRole('heading', { name: FIRST_STEP_TITLES.team }))
      .not.toBeInTheDocument();
  });
});

// ── ReleaseNotes replay button — staff (non-homebase) path ────────────────────

describe('ReleaseNotes — tour replay button (staff / non-homebase)', () => {
  let origPushState: typeof window.history.pushState;
  let origDispatch: typeof window.dispatchEvent;
  const navigatedPaths: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    navigatedPaths.length = 0;
    _mockAudience = null; // staff: no homebase audience

    origPushState = window.history.pushState.bind(window.history);
    origDispatch  = window.dispatchEvent.bind(window);

    // Capture pushState calls so we can assert on navigation target
    window.history.pushState = vi.fn((_state, _title, url) => {
      if (typeof url === 'string') navigatedPaths.push(url);
    });
    // dispatchEvent is called for the PopStateEvent after pushState
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    window.history.pushState = origPushState;
    window.dispatchEvent     = origDispatch;
    vi.clearAllMocks();
  });

  // ── T5 ────────────────────────────────────────────────────────────────────────

  test('T5: clicking "Take the tour" calls startTour()', () => {
    render(<ReleaseNotes />);

    const btn = screen.getByRole('button', { name: /take the tour/i });
    fireEvent.click(btn);

    expect(mockStartTour).toHaveBeenCalledTimes(1);
  });

  // ── T6 ────────────────────────────────────────────────────────────────────────

  test('T6: clicking "Take the tour" navigates toward /homebase', () => {
    render(<ReleaseNotes />);

    const btn = screen.getByRole('button', { name: /take the tour/i });
    fireEvent.click(btn);

    // The button pushes "/homebase" so HomebaseShell becomes the active shell
    // and the already-mounted HomebaseTour (with the correct audience) can open.
    expect(navigatedPaths).toContain('/homebase');
  });
});

// ── ReleaseNotes replay button — homebase audience path ───────────────────────

describe('ReleaseNotes — tour replay button (homebase audience: learner)', () => {
  /**
   * Wrapper that wires ReleaseNotes + HomebaseTour together exactly as
   * HomebaseShell does at runtime:
   *
   *   - mockStartTour is replaced with an implementation that flips tourActive
   *     state, so clicking "Take the tour" in ReleaseNotes causes HomebaseTour
   *     to mount with open=true.
   *   - Both components share the same React tree, so DOM assertions work.
   */
  function HomebaseWrapper({ audience }: { audience: HomebaseAudience }) {
    const [tourActive, setTourActive] = useState(false);

    // Wire the shared mock so startTour() opens the overlay in this tree.
    mockStartTour.mockImplementation(() => setTourActive(true));

    return (
      <>
        <ReleaseNotes />
        <HomebaseTour
          open={tourActive}
          onComplete={() => setTourActive(false)}
          audience={audience}
          seenStepKeysAtOpen={new Set()}
          onMarkStepSeen={vi.fn()}
          onShowAllSteps={vi.fn()}
        />
      </>
    );
  }

  let origPushState: typeof window.history.pushState;
  let origDispatch: typeof window.dispatchEvent;
  const navigatedPaths: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    navigatedPaths.length = 0;
    _mockAudience = 'learner'; // homebase audience

    origPushState = window.history.pushState.bind(window.history);
    origDispatch  = window.dispatchEvent.bind(window);

    window.history.pushState = vi.fn((_state, _title, url) => {
      if (typeof url === 'string') navigatedPaths.push(url);
    });
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    window.history.pushState = origPushState;
    window.dispatchEvent     = origDispatch;
    vi.clearAllMocks();
  });

  // ── T7 ────────────────────────────────────────────────────────────────────────

  test(
    'T7: homebase audience user clicks "Take the tour" → overlay visible, no URL change',
    () => {
      render(<HomebaseWrapper audience="learner" />);

      // Tour overlay must NOT be visible before the button is clicked.
      expect(
        screen.queryByRole('heading', { name: FIRST_STEP_TITLES.learner }),
      ).not.toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /take the tour/i });
      fireEvent.click(btn);

      // startTour() must have been called (triggers the overlay).
      expect(mockStartTour).toHaveBeenCalledTimes(1);

      // The tour overlay must now be visible in-place.
      expect(
        screen.getByRole('heading', { name: FIRST_STEP_TITLES.learner }),
      ).toBeInTheDocument();

      // No navigation must have occurred — homebase audience users are already
      // inside HomebaseShell; redirecting to /homebase would cause a flash.
      expect(navigatedPaths).toHaveLength(0);
      expect(window.dispatchEvent).not.toHaveBeenCalled();
    },
  );
});
