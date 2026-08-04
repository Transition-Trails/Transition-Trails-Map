import { useState, useEffect, useRef } from 'react';

/** In-memory cache so we never hit the directory more than once per email per page load. */
const cache = new Map<string, string | null>();

/**
 * Resolves a real display name for a Google Workspace user email via the
 * Admin Directory API.  Returns the formatted email fallback immediately,
 * then swaps in the real name once the API responds.
 *
 * @param email  The user's email address, or null/undefined when unknown.
 * @returns      The best available display name string.
 */
export function useDirectoryDisplayName(email: string | null | undefined): string {
  const fallback = formatEmailAsName(email ?? '');
  const [displayName, setDisplayName] = useState<string>(() => {
    if (!email) return fallback;
    const cached = cache.get(email);
    return cached !== undefined ? (cached ?? fallback) : fallback;
  });

  const emailRef = useRef(email);
  emailRef.current = email;

  useEffect(() => {
    if (!email) return;

    // Already resolved
    if (cache.has(email)) {
      const cached = cache.get(email);
      setDisplayName(cached ?? formatEmailAsName(email));
      return;
    }

    let cancelled = false;

    fetch(`/api/google/directory/user?email=${encodeURIComponent(email)}`)
      .then(r => r.ok ? r.json() as Promise<{ email: string; displayName: string | null }> : null)
      .then(data => {
        if (cancelled) return;
        const resolved = data?.displayName ?? null;
        cache.set(email, resolved);
        if (emailRef.current === email) {
          setDisplayName(resolved ?? formatEmailAsName(email));
        }
      })
      .catch(() => {
        if (!cancelled) cache.set(email, null);
      });

    return () => { cancelled = true; };
  }, [email]);

  return displayName;
}

/** Convert a Google email to a readable display name as a fallback.
 *  e.g. "angela.landrith@example.com" → "Angela Landrith"
 */
export function formatEmailAsName(email: string): string {
  if (!email) return '';
  const local = email.split('@')[0] ?? email;
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
