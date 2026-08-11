/**
 * canvasView.reconnect.test.tsx
 *
 * Component-level test for the CanvasView reconnect cycle.
 *
 * Scenario (mirrors the real UI flow):
 *
 *   1. Token is revoked while the Canvas tab is open.
 *      → CanvasView's fetchCanvas() catches token_expired
 *      → calls onTokenExpired() immediately (before any error-state update)
 *      → returns early — no "Could not load canvas" error text is shown
 *      → parent (SlimSlackPanel) unmounts CanvasView and mounts TokenExpiredView
 *
 *   2. User clicks "Reconnect Slack" and the popup closes.
 *      → SlimSlackPanel re-checks status → gets "connected"
 *      → ConnectedView (and CanvasView) re-mounts fresh
 *
 *   3. CanvasView's useEffect fires on mount → fetchCanvas() runs
 *      → API returns the loaded canvas
 *      → CanvasView renders canvas title and content — no error state on screen
 *
 * These tests exercise steps 1 and 3 directly on the CanvasView component.
 * Step 2 (the status/reconnect check) is covered by the API-level test 37
 * in slackOAuthRoutes.test.ts.
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CanvasView } from '../../components/homebase/SlimSlackPanel';

// ── fetch helper ──────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CanvasView reconnect cycle', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  // ── Step 1: token revoked ──────────────────────────────────────────────────
  //
  // When the API returns 401 { error: "token_expired" }, CanvasView must call
  // onTokenExpired() immediately and leave no error text on screen.
  // The component stays in "loading" internally — the parent unmounts it.

  it('calls onTokenExpired immediately when canvas fetch returns token_expired, leaving no error state', async () => {
    const onTokenExpired = vi.fn();

    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ error: 'token_expired' }, 401),
    );

    render(
      <CanvasView channelId="C_RECONNECT" onTokenExpired={onTokenExpired} />,
    );

    // Wait for the async fetch to complete and the component to react
    await waitFor(() => {
      expect(onTokenExpired).toHaveBeenCalledOnce();
    });

    // No "Could not load canvas" error banner — the token_expired path returns
    // early before setting canvasState to "error"
    expect(screen.queryByText(/could not load canvas/i)).not.toBeInTheDocument();

    // No "Reconnect Slack to enable canvas access" missing-scope banner either
    expect(screen.queryByText(/reconnect slack to enable canvas access/i)).not.toBeInTheDocument();
  });

  // ── Step 3: after reconnect, canvas re-fetch returns loaded canvas ─────────
  //
  // After SlimSlackPanel transitions back to "connected" status the parent
  // re-mounts CanvasView fresh.  The fresh mount must fetch the canvas and
  // render the loaded title + content — confirming no stale error state remains.

  it('shows loaded canvas content after reconnect (fresh mount with valid token)', async () => {
    const onTokenExpired = vi.fn();

    // API now returns a loaded canvas (reconnect succeeded)
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        canvas: {
          id:      'F_CANVAS_RECONNECTED',
          title:   'Channel Canvas',
          content: 'Notes from the reconnected session',
        },
      }),
    );

    render(
      <CanvasView channelId="C_RECONNECT" onTokenExpired={onTokenExpired} />,
    );

    // Canvas content must appear — CanvasView reached status="loaded"
    await waitFor(() => {
      expect(screen.getByText('Notes from the reconnected session')).toBeInTheDocument();
    });

    // Canvas title is shown in the header
    expect(screen.getByText('Channel Canvas')).toBeInTheDocument();

    // No error state on screen after a successful reconnect
    expect(screen.queryByText(/could not load canvas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reconnect slack/i)).not.toBeInTheDocument();

    // onTokenExpired was never triggered — the reconnect produced a clean load
    expect(onTokenExpired).not.toHaveBeenCalled();
  });

  // ── Combined: expired then reconnected (simulates the full cycle) ──────────
  //
  // Unmounts CanvasView after token_expired fires, then re-mounts it fresh —
  // exactly what SlimSlackPanel does when transitioning "token_expired" →
  // "connected".  Confirms the second mount fetches and renders successfully.

  it('full cycle: expired → onTokenExpired → re-mount → loaded canvas shown', async () => {
    const onTokenExpired = vi.fn();

    // Phase A — token expired
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ error: 'token_expired' }, 401))
      // Phase B — fresh canvas fetch after reconnect
      .mockResolvedValueOnce(
        jsonResponse({
          canvas: {
            id:      'F_CANVAS_AFTER_RECONNECT',
            title:   'Channel Canvas',
            content: 'Canvas data after reconnecting Slack',
          },
        }),
      );

    const { unmount } = render(
      <CanvasView channelId="C_RECONNECT" onTokenExpired={onTokenExpired} />,
    );

    // Phase A: onTokenExpired fires; no error state on screen
    await waitFor(() => {
      expect(onTokenExpired).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText(/could not load canvas/i)).not.toBeInTheDocument();

    // SlimSlackPanel unmounts CanvasView when status transitions to "token_expired"
    unmount();

    // SlimSlackPanel re-mounts CanvasView once status returns to "connected"
    render(
      <CanvasView channelId="C_RECONNECT" onTokenExpired={onTokenExpired} />,
    );

    // Phase B: canvas content is shown — CanvasView recovered successfully
    await waitFor(() => {
      expect(
        screen.getByText('Canvas data after reconnecting Slack'),
      ).toBeInTheDocument();
    });

    // No error or reconnect prompt — clean loaded state after reconnect
    expect(screen.queryByText(/could not load canvas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reconnect slack/i)).not.toBeInTheDocument();

    // onTokenExpired was not triggered again — second mount loaded cleanly
    expect(onTokenExpired).toHaveBeenCalledOnce();
  });
});
