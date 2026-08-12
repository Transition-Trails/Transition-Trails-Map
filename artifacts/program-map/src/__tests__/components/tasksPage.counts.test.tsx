/**
 * tasksPage.counts.test.tsx
 *
 * Component-level tests for the count badges on the Tasks page filter tabs.
 *
 * Covers:
 *   B1. Badges show "—" while counts are loading (fetch not yet resolved)
 *   B2. Badges update to numeric values once /api/sf/tasks/counts resolves
 *   B3. Badges remain "—" when the counts endpoint returns an error
 *   B4. Active badge uses primary background when Active count > 0 (and Active
 *       tab is selected — the default)
 *   B5. Active badge uses muted background when Active count is 0
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mock heavyweight deps that TasksPage imports ──────────────────────────────

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/homebase/CreateTaskDrawer', () => ({
  CreateTaskDrawer: () => null,
}));

vi.mock('@/components/homebase/TaskHoverCard', () => ({
  // Pass children through so TaskRow content still renders
  TaskHoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ openLogTime: vi.fn() }),
}));

// ── Component under test (imported after mocks are registered) ────────────────

import TasksPage from '../../pages/homebase/TasksPage';

// ── fetch helper ──────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Returns a promise that never settles — simulates an in-flight fetch. */
function pendingFetch(): Promise<Response> {
  return new Promise(() => { /* never resolves */ });
}

/** Standard mock: task list returns empty, counts returns given values. */
function mockFetch(counts: { active: number; all: number; completed: number }) {
  return vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
    if (String(url).includes('/api/sf/tasks/counts')) {
      return Promise.resolve(jsonResponse(counts));
    }
    return Promise.resolve(jsonResponse({ tasks: [], orgBaseUrl: '' }));
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TasksPage — filter tab count badges', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    fetchSpy?.mockRestore();
    vi.clearAllMocks();
  });

  // ── B1: loading state — badges show "—" ───────────────────────────────────

  it('B1: shows "—" on each tab badge while counts are loading', () => {
    // Neither fetch resolves — component stays in its initial state
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => pendingFetch());

    render(<TasksPage />);

    // All three tab badges must show the loading placeholder
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  // ── B2: success — badges show numeric counts ──────────────────────────────

  it('B2: shows numeric count on each tab badge when counts load', async () => {
    fetchSpy = mockFetch({ active: 4, all: 11, completed: 7 });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('B2: counts of zero are displayed as "0", not "—"', async () => {
    fetchSpy = mockFetch({ active: 0, all: 5, completed: 5 });

    render(<TasksPage />);

    // Wait for task list to settle (empty state renders)
    await waitFor(() => {
      expect(screen.getByText(/no open tasks/i)).toBeInTheDocument();
    });

    // Active count is 0 — must show "0", not "—"
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  // ── B3: error — badges remain "—" ────────────────────────────────────────

  it('B3: keeps "—" on all badges when counts endpoint returns an error', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      if (String(url).includes('/api/sf/tasks/counts')) {
        return Promise.resolve(jsonResponse({ error: 'SF unavailable' }, 500));
      }
      return Promise.resolve(jsonResponse({ tasks: [], orgBaseUrl: '' }));
    });

    render(<TasksPage />);

    // Wait for task list to finish loading so we know all fetches have settled
    await waitFor(() => {
      expect(screen.getByText(/no open tasks/i)).toBeInTheDocument();
    });

    // All three count badges must still show "—" (counts never updated)
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it('B3: keeps "—" on all badges when counts endpoint returns 401', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      if (String(url).includes('/api/sf/tasks/counts')) {
        return Promise.resolve(jsonResponse({ error: 'Unauthenticated' }, 401));
      }
      return Promise.resolve(jsonResponse({ tasks: [], orgBaseUrl: '' }));
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText(/no open tasks/i)).toBeInTheDocument();
    });

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  // ── B4: Active badge styling when count > 0 ───────────────────────────────

  it('B4: Active badge has primary background when Active count > 0 and Active tab is selected', async () => {
    fetchSpy = mockFetch({ active: 3, all: 8, completed: 5 });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Active tab is selected by default; badge with count > 0 gets primary bg
    const activeBadge = screen.getByText('3');
    expect(activeBadge).toHaveClass('bg-primary');
  });

  // ── B5: Active badge styling when count is 0 ──────────────────────────────

  it('B5: Active badge has muted background when Active count is 0', async () => {
    fetchSpy = mockFetch({ active: 0, all: 6, completed: 6 });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    // Active count is 0 — badge must not use primary styling
    const activeBadge = screen.getByText('0');
    expect(activeBadge).not.toHaveClass('bg-primary');
    expect(activeBadge).toHaveClass('bg-muted');
  });
});
