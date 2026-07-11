import { useState, useEffect } from 'react';

interface SfUser {
  userId: string;
  username: string;
  email: string;
}

export interface SalesforceAuthState {
  authenticated: boolean;
  contactId: string | null;
  user: SfUser | null;
  loading: boolean;
}

interface SfStatusResponse {
  authenticated: false;
}
interface SfStatusAuthenticated {
  authenticated: true;
  contactId: string;
  user: SfUser;
}
type SfStatusApiResponse = SfStatusResponse | SfStatusAuthenticated;

export function useSalesforceAuth(): SalesforceAuthState {
  const [state, setState] = useState<SalesforceAuthState>({
    authenticated: false,
    contactId:     null,
    user:          null,
    loading:       true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/salesforce/status', { credentials: 'include' })
      .then(async (resp) => {
        if (!resp.ok) {
          throw new Error(`SF status check failed: HTTP ${resp.status}`);
        }
        return resp.json() as Promise<SfStatusApiResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.authenticated) {
          setState({
            authenticated: true,
            contactId:     data.contactId,
            user:          data.user,
            loading:       false,
          });
        } else {
          setState({ authenticated: false, contactId: null, user: null, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ authenticated: false, contactId: null, user: null, loading: false });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
