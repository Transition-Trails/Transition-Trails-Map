/**
 * alertSettingsCard.test.tsx
 *
 * UI smoke tests for the AlertSettingsCard admin component.
 *
 * Test matrix:
 *
 *   R1. Renders the "Error Alert Settings" heading
 *   R2. Renders both threshold and window inputs
 *   R3. Inputs are populated with fetched values once the query resolves
 *   R4. Changing the threshold input updates its displayed value
 *   R5. Clicking "Save settings" fires a PATCH /api/slack/alert-settings
 *   R6. "Saved" confirmation banner appears after a successful PATCH
 *   R7. Error message appears when PATCH returns a non-ok response
 *   R8. Save button is disabled while the mutation is pending
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AlertSettingsCard } from '../../pages/collaboration/CollaborationHub';

// ── Response fixtures ─────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const DEFAULT_SETTINGS = {
  threshold:     10,
  windowMinutes: 15,
  updatedBy:     null,
  updatedAt:     null,
  source:        'default' as const,
  envFallback:   10,
};

const DB_SETTINGS = {
  threshold:     25,
  windowMinutes: 30,
  updatedBy:     'admin@transitiontrails.org',
  updatedAt:     '2026-08-01T10:00:00.000Z',
  source:        'db' as const,
  envFallback:   10,
};

/** Empty status response — no routes in cooldown. */
const EMPTY_STATUS = { entries: [], timestamp: new Date().toISOString() };

// ── Test harness ──────────────────────────────────────────────────────────────

/**
 * Render AlertSettingsCard with a fresh QueryClient and a fetch mock that
 * routes by URL:
 *   GET /api/slack/alert-settings         → settingsPayload (default: DEFAULT_SETTINGS)
 *   GET /api/slack/alert-settings/status  → statusPayload   (default: EMPTY_STATUS)
 *   PATCH /api/slack/alert-settings       → patchHandler    (default: success echo)
 *
 * All other URLs return 404 so spurious calls are obvious.
 */
function renderCard(opts: {
  settings?:     unknown;
  status?:       unknown;
  patchHandler?: (body: unknown) => Response | Promise<Response>;
} = {}) {
  const {
    settings     = DEFAULT_SETTINGS,
    status       = EMPTY_STATUS,
    patchHandler = () => jsonResponse({ ok: true, threshold: 10, windowMinutes: 15 }),
  } = opts;

  const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url    = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/api/slack/alert-settings/status')) {
        return jsonResponse(status);
      }
      if (url.includes('/api/slack/alert-settings')) {
        if (method === 'PATCH') return patchHandler(JSON.parse((init?.body as string) ?? '{}'));
        return jsonResponse(settings);
      }
      return new Response('not found', { status: 404 });
    },
  );

  const qc = new QueryClient({
    defaultOptions: {
      queries:   { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const utils = render(
    <QueryClientProvider client={qc}>
      <AlertSettingsCard />
    </QueryClientProvider>,
  );

  return { ...utils, fetchSpy, qc };
}

/**
 * Wait for both number inputs to be populated with non-empty values.
 * This ensures the useEffect that seeds inputs from query data has run.
 */
async function waitForPopulatedInputs(): Promise<HTMLInputElement[]> {
  let inputs: HTMLInputElement[] = [];
  await waitFor(() => {
    inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs[0]!.value).not.toBe('');
    expect(inputs[1]!.value).not.toBe('');
  });
  return inputs;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AlertSettingsCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Render tests ────────────────────────────────────────────────────────────

  it('R1. renders the "Error Alert Settings" heading', () => {
    renderCard();
    expect(screen.getByText('Error Alert Settings')).toBeInTheDocument();
  });

  it('R2. renders threshold and window inputs once query resolves', async () => {
    renderCard();
    await waitFor(() => {
      expect(screen.getAllByRole('spinbutton').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('R3. inputs are populated with fetched DB values once query resolves', async () => {
    renderCard({ settings: DB_SETTINGS });

    const inputs = await waitForPopulatedInputs();
    const values = inputs.map(i => i.value);
    expect(values).toContain('25');
    expect(values).toContain('30');
  });

  it('R3b. malformed status response (missing entries) does not crash the card', async () => {
    // Status endpoint returns a payload without an `entries` array
    renderCard({ status: { timestamp: new Date().toISOString() } });

    // Card must still render — the guard `?.entries?.filter()` keeps it alive
    await waitFor(() => {
      expect(screen.getByText('Error Alert Settings')).toBeInTheDocument();
    });
    // No crash means the inputs still appear
    await waitFor(() => {
      expect(screen.getAllByRole('spinbutton').length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Interaction tests ───────────────────────────────────────────────────────

  it('R4. changing the threshold input updates its displayed value', async () => {
    renderCard();
    const [thresholdInput] = await waitForPopulatedInputs();
    fireEvent.change(thresholdInput, { target: { value: '42' } });
    expect(thresholdInput.value).toBe('42');
  });

  it('R5. clicking Save fires a PATCH /api/slack/alert-settings', async () => {
    const patchSpy = vi.fn(() => jsonResponse({ ok: true, threshold: 10, windowMinutes: 15 }));
    renderCard({ patchHandler: patchSpy });

    await waitForPopulatedInputs();

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('R6. "Saved" confirmation banner appears after a successful PATCH', async () => {
    renderCard();
    await waitForPopulatedInputs();

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  it('R7. error message appears when PATCH returns a non-ok response', async () => {
    renderCard({
      patchHandler: () =>
        jsonResponse({ ok: false, error: 'threshold must be between 1 and 10 000' }, 400),
    });

    await waitForPopulatedInputs();

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText('threshold must be between 1 and 10 000'),
      ).toBeInTheDocument();
    });
  });

  it('R8. Save button is disabled or shows pending label while mutation is in flight', async () => {
    let resolvePatch!: (v: Response) => void;
    const patchPromise = new Promise<Response>(res => { resolvePatch = res; });

    renderCard({ patchHandler: () => patchPromise });
    await waitForPopulatedInputs();

    const saveButton = screen.getByRole('button', { name: /save settings/i });

    // Click without awaiting act so the mutation stays in flight
    fireEvent.click(saveButton);

    // While the PATCH is unresolved the button must be disabled or read "Saving…"
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /save|saving/i });
      const isPending = btn.hasAttribute('disabled') || /saving/i.test(btn.textContent ?? '');
      expect(isPending).toBe(true);
    });

    // Resolve to let React clean up without "act" warnings
    await act(async () => {
      resolvePatch(jsonResponse({ ok: true, threshold: 10, windowMinutes: 15 }));
    });
  });
});
