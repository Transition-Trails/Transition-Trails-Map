/**
 * ImpersonationBanner.tsx
 *
 * A fixed amber strip that sits at the very top of the viewport whenever a
 * superadmin is viewing the platform as another user.
 *
 * Features:
 *  - Cannot be dismissed — only "Exit" removes it.
 *  - Exit calls POST /api/admin/impersonate/exit, clears the React Query
 *    auth cache (so /me is re-fetched and the banner disappears), then
 *    navigates back to /admin/users.
 *  - z-index 200 so it stacks above all modals, slide-overs, and overlays.
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';

interface ImpersonationBannerProps {
  impersonatedEmail: string;
  impersonatedName:  string;
  realEmail:         string;
}

export function ImpersonationBanner({
  impersonatedEmail,
  impersonatedName,
  realEmail,
}: ImpersonationBannerProps) {
  const [exiting, setExiting]   = useState(false);
  const [, navigate]            = useLocation();
  const queryClient             = useQueryClient();
  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

  async function handleExit() {
    if (exiting) return;
    setExiting(true);
    try {
      await fetch(`${BASE}/api/admin/impersonate/exit`, {
        method:      'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the request fails, clear the local cache and navigate —
      // the server session will expire naturally.
    }
    // Re-fetch /me so the hook reflects the real session again
    await queryClient.invalidateQueries({ queryKey: ['google-auth-me'] });
    navigate('/admin/users');
  }

  const displayLabel =
    impersonatedName && impersonatedName !== impersonatedEmail
      ? `${impersonatedName} (${impersonatedEmail})`
      : impersonatedEmail;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] flex items-center gap-3 px-4 py-2 bg-amber-400 text-amber-950 select-none"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />

      <p className="flex-1 text-[13px] font-semibold truncate">
        Viewing as{' '}
        <span className="font-bold">{displayLabel}</span>
        <span className="font-normal mx-2 opacity-60">·</span>
        <span className="font-normal opacity-70">Signed in as {realEmail}</span>
      </p>

      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/15 hover:bg-amber-950/25 text-amber-950 text-[12px] font-bold transition-colors disabled:opacity-50 flex-shrink-0"
        aria-label="Exit impersonation and return to your own session"
      >
        {exiting ? (
          'Exiting…'
        ) : (
          <>
            <X className="w-3 h-3" />
            Exit
          </>
        )}
      </button>
    </div>
  );
}
