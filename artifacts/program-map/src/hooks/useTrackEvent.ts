/**
 * useTrackEvent.ts
 *
 * Fire-and-forget frontend event tracking hook.
 * POSTs to POST /api/track; calls are non-blocking (no await at call sites).
 *
 * Only feature+action pairs from the server-side allowlist are accepted.
 * No caller-supplied strings beyond those two are sent — the server enforces
 * the same schema to prevent PII from entering the audit log.
 *
 * Usage:
 *   const { trackEvent } = useTrackEvent();
 *   trackEvent('penny', 'open');
 *   trackEvent('knowledge', 'navigate');
 */

import { useCallback } from 'react';
import { useGoogleAuth } from './useGoogleAuth';

export function useTrackEvent() {
  const { isSignedIn } = useGoogleAuth();

  const trackEvent = useCallback(
    (feature: string, action: string) => {
      // Guard: do not call the API when the user is not signed in
      if (!isSignedIn) return;

      // Fire-and-forget — intentionally not awaited at call sites
      fetch('/api/track', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only feature+action are sent; no caller-supplied strings that could carry PII
        body:    JSON.stringify({ feature, action }),
      }).catch(() => {
        // Silently swallow errors — tracking failures must never surface to users
      });
    },
    [isSignedIn],
  );

  return { trackEvent };
}
