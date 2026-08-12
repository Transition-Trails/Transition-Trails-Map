/**
 * releaseNotes.shellDispatch.test.tsx
 *
 * Routing-level tests for the /release-notes shell dispatch in App.tsx.
 *
 * The route body in InnerApp wraps <ReleaseNotes /> in:
 *   • HomebaseShell (with the user's audience prop) when the signed-in user
 *     has a homebase audience (learner / coach / volunteer / team).
 *   • AppShell when the user is signed in but has no audience (staff).
 *   • SignInPage when the user is not signed in at all.
 *
 * These tests import and exercise `ReleaseNotesRouteBody` — the real function
 * used by App.tsx's <Route path="/release-notes"> block — with the auth hook
 * and the two shells stubbed.  Any change to the dispatch condition in App.tsx
 * will break the corresponding test here.
 *
 * Test matrix:
 *
 *  R1. audience="learner"   → HomebaseShell receives audience="learner"
 *  R2. audience="coach"     → HomebaseShell receives audience="coach"
 *  R3. audience="volunteer" → HomebaseShell receives audience="volunteer"
 *  R4. audience="team"      → HomebaseShell receives audience="team"
 *  R5. staff (no audience)  → AppShell renders; HomebaseShell absent
 *  R6. not signed in        → neither shell renders (SignInPage shown)
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Types mirrored from useGoogleAuth so the mock can be typed ────────────────

type HomebaseAudience = 'learner' | 'coach' | 'volunteer' | 'team';

interface MockAuth {
  isLoading:  boolean;
  isSignedIn: boolean;
  user: {
    name:     string;
    email:    string;
    audience: HomebaseAudience | null;
  } | null;
  isImpersonating:  boolean;
  impersonatedUser: null;
}

// ── Mutable auth state controlled per-test ────────────────────────────────────

let mockAuthState: MockAuth = {
  isLoading:        false,
  isSignedIn:       false,
  user:             null,
  isImpersonating:  false,
  impersonatedUser: null,
};

vi.mock('@/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => mockAuthState,
}));

// ── Shell stubs — render data-testid + audience so assertions stay simple ──────

vi.mock('@/components/layout/HomebaseShell', () => ({
  HomebaseShell: ({
    audience,
    children,
  }: {
    audience:    string;
    displayName: string;
    children:    React.ReactNode;
  }) => (
    <div data-testid="homebase-shell" data-audience={audience}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

// ── Stub pages rendered by the route body ─────────────────────────────────────

vi.mock('@/pages/ReleaseNotes', () => ({
  default: () => <div data-testid="release-notes-page" />,
}));

vi.mock('@/pages/SignIn', () => ({
  default: () => <div data-testid="sign-in-page" />,
}));

// ── Also stub useHomebaseAuth — ReleaseNotes calls it internally ──────────────

vi.mock('@/hooks/useHomebaseAuth', () => ({
  useHomebaseAuth: () => ({ isLoading: false, isSignedIn: false, audience: null, email: null, displayName: null, coachLevel: null }),
}));

// ── Stub hooks imported at module level in App.tsx ────────────────────────────

vi.mock('@/hooks/useSeenVersion', () => ({
  useSeenVersion: () => ({ hasUnseenRelease: false, markSeen: vi.fn(), isReady: true, lastSeenVersion: '1.0' }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/context/AppContext', () => ({
  AppProvider:    ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAppContext:  () => ({
    logTimeOpen:    false,
    logTimePrefill: null,
    closeLogTime:   vi.fn(),
    onLogTimeSaved: vi.fn(),
    setUserTier:    vi.fn(),
  }),
}));

vi.mock('@/config/version', () => ({ APP_VERSION: '1.0' }));

// ── Import the REAL route body from App.tsx (after all mocks are declared) ────

import { ReleaseNotesRouteBody } from '../../App';

// ── Helpers ───────────────────────────────────────────────────────────────────

function signedInAs(audience: HomebaseAudience | null) {
  mockAuthState = {
    isLoading:        false,
    isSignedIn:       true,
    user:             { name: 'Test User', email: 'test@example.com', audience },
    isImpersonating:  false,
    impersonatedUser: null,
  };
}

function notSignedIn() {
  mockAuthState = {
    isLoading:        false,
    isSignedIn:       false,
    user:             null,
    isImpersonating:  false,
    impersonatedUser: null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('/release-notes route — shell dispatch (ReleaseNotesRouteBody from App.tsx)', () => {
  beforeEach(() => {
    notSignedIn();
  });

  // ── R1 ──────────────────────────────────────────────────────────────────────

  test('R1: learner → HomebaseShell with audience="learner"', () => {
    signedInAs('learner');
    render(<ReleaseNotesRouteBody />);

    const shell = screen.getByTestId('homebase-shell');
    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-audience', 'learner');
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument();
  });

  // ── R2 ──────────────────────────────────────────────────────────────────────

  test('R2: coach → HomebaseShell with audience="coach"', () => {
    signedInAs('coach');
    render(<ReleaseNotesRouteBody />);

    const shell = screen.getByTestId('homebase-shell');
    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-audience', 'coach');
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument();
  });

  // ── R3 ──────────────────────────────────────────────────────────────────────

  test('R3: volunteer → HomebaseShell with audience="volunteer"', () => {
    signedInAs('volunteer');
    render(<ReleaseNotesRouteBody />);

    const shell = screen.getByTestId('homebase-shell');
    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-audience', 'volunteer');
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument();
  });

  // ── R4 ──────────────────────────────────────────────────────────────────────

  test('R4: team → HomebaseShell with audience="team"', () => {
    signedInAs('team');
    render(<ReleaseNotesRouteBody />);

    const shell = screen.getByTestId('homebase-shell');
    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-audience', 'team');
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument();
  });

  // ── R5 ──────────────────────────────────────────────────────────────────────

  test('R5: staff (no audience) → AppShell; HomebaseShell absent', () => {
    signedInAs(null);
    render(<ReleaseNotesRouteBody />);

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('homebase-shell')).not.toBeInTheDocument();
  });

  // ── R6 ──────────────────────────────────────────────────────────────────────

  test('R6: not signed in → SignInPage; neither shell renders', () => {
    notSignedIn();
    render(<ReleaseNotesRouteBody />);

    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument();
    expect(screen.queryByTestId('homebase-shell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument();
  });
});
