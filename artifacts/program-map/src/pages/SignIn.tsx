/**
 * SignIn.tsx
 *
 * Trail OS sign-in page. Staff authenticate via Google SSO — clicking
 * "Sign in with Google" sends the browser to /api/auth/google/login,
 * which redirects to Google's consent screen. On return the API server
 * validates domain and group membership, then sets a server-side session.
 *
 * Error messages are passed back as ?sign_in_error= query params so this
 * page can show a specific, actionable message without JS frameworks.
 */

import { Map, AlertTriangle, ShieldOff, Users } from 'lucide-react';

// ── Error message map ─────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, (email?: string, detail?: string) => { title: string; body: string }> = {
  wrong_domain: (email) => ({
    title: 'Wrong Google account',
    body:  email
      ? `You signed in as ${email}. Please use your @transitiontrails.org Google Workspace account instead. If you are a learner or program participant and do not have one, contact your program coordinator.`
      : `Please sign in with your @transitiontrails.org Google Workspace account. If you are a learner or program participant and do not have one, contact your program coordinator.`,
  }),
  no_groups: (email) => ({
    title: 'Access not set up yet',
    body:  email
      ? `${email} is not linked to any Trail OS program or role yet. If you are a learner or participant, contact your program coordinator. If you are staff, ask your Trail OS administrator to add your account to the appropriate Google Group.`
      : `Your account is not linked to any Trail OS program or role yet. If you are a learner or participant, contact your program coordinator. If you are staff, ask your Trail OS administrator to add your account to the appropriate Google Group.`,
  }),
  state_mismatch: () => ({
    title: 'Sign-in session expired',
    body:  'The sign-in flow timed out or was opened in another tab. Please try again.',
  }),
  state_expired: () => ({
    title: 'Sign-in took too long',
    body:  'The sign-in link expired (it is valid for 10 minutes). Please try again.',
  }),
  token_exchange: () => ({
    title: 'Sign-in could not complete',
    body:  'There was a problem communicating with Google. Please try again — if this keeps happening, contact your program coordinator or administrator.',
  }),
  not_configured: () => ({
    title: 'Sign-in not configured',
    body:  'Google Sign-In has not been set up for this Trail OS instance. Contact your administrator.',
  }),
  unverified: () => ({
    title: 'Email not verified',
    body:  'Your Google account email is not verified. Please verify it in your Google Account settings and try again.',
  }),
  google_error: (_email, detail?: string) => ({
    title: 'Google sign-in returned an error',
    body:  detail
      ? `Google reported: "${detail}". Please try again or contact your program coordinator if this continues.`
      : 'Google returned an error during sign-in. Please try again or contact your program coordinator.',
  }),
  missing_params: () => ({
    title: 'Sign-in link was incomplete',
    body:  'The sign-in link was missing required information. Please try signing in again from the beginning.',
  }),
  no_id_token: () => ({
    title: 'Sign-in could not complete',
    body:  'Google did not return the expected information. Please try again — if this keeps happening, contact your program coordinator or administrator.',
  }),
  missing_identity: () => ({
    title: 'Sign-in could not complete',
    body:  'We could not read your account information from Google. Please try again or use a different browser.',
  }),
  session_save: () => ({
    title: 'Sign-in could not be saved',
    body:  'Your sign-in succeeded but could not be saved due to a session error. Please try again or clear your browser cookies.',
  }),
  unexpected: () => ({
    title: 'Something went wrong',
    body:  'An unexpected error occurred during sign-in. Please try again — if this keeps happening, contact your program coordinator or administrator.',
  }),
};

function getError(code: string | null, email: string | null, detail: string | null) {
  if (!code) return null;
  const factory = ERROR_MESSAGES[code] ?? ((_e?: string, _d?: string) => ({
    title: 'Sign-in failed',
    body:  `An unexpected error occurred (${code}). Please try again or contact your program coordinator.`,
  }));
  return factory(email ?? undefined, detail ?? undefined);
}

// ── Error card icons ──────────────────────────────────────────────────────────

function errorIcon(code: string | null) {
  if (code === 'wrong_domain')  return <ShieldOff className="w-5 h-5 text-[#A93F2F]" />;
  if (code === 'no_groups')     return <Users     className="w-5 h-5 text-[#CC8400]" />;
  return <AlertTriangle className="w-5 h-5 text-[#A93F2F]" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const BASE  = (import.meta.env.BASE_URL as string).replace(/\/$/, '');
  const params = new URLSearchParams(window.location.search);
  const errorCode  = params.get('sign_in_error');
  const errorEmail = params.get('email');
  const errorDetail = params.get('detail');
  const error = getError(errorCode, errorEmail, errorDetail);

  // If rendered inside an iframe (Replit preview), open OAuth in a new tab so
  // Google's consent screen isn't blocked by the iframe sandbox.
  const inIframe = window.self !== window.top;
  const linkTarget = inIframe ? '_blank' : '_self';

  return (
    <div className="min-h-screen bg-[hsl(40_30%_94%)] flex flex-col">
      {/* Top bar */}
      <div className="h-[52px] border-b bg-card flex items-center px-5 gap-3 flex-shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
          <Map className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold text-foreground leading-none">Trail OS</span>
        <span className="text-muted-foreground/30 select-none">·</span>
        <span className="text-sm text-muted-foreground font-medium">Transition Trails</span>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-6">
        {/* Logo + heading */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Map className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Sign in to Trail OS</h1>
          <p className="text-sm text-muted-foreground">Internal platform · Transition Trails Academy</p>
        </div>

        {/* Error card */}
        {error && (
          <div className={`w-full max-w-[400px] rounded-xl border p-4 flex gap-3 ${
            errorCode === 'no_groups'
              ? 'bg-[#FFF3E0] border-[#FFD08A]'
              : 'bg-[#FBEAE6] border-[#E8B9B4]'
          }`}>
            <div className="mt-0.5 flex-shrink-0">{errorIcon(errorCode)}</div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{error.title}</p>
              <p className="text-[14px] text-muted-foreground mt-1 leading-snug">{error.body}</p>
            </div>
          </div>
        )}

        {/* Sign-in card */}
        <div className="w-full max-w-[400px] bg-card rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Welcome back</h2>
            <p className="text-[14px] text-muted-foreground mb-6">
              Use your Transition Trails Google Workspace account to continue.
            </p>

            {/* Google sign-in button */}
            <a
              href={`${BASE}/api/auth/google/login`}
              target={linkTarget}
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 rounded-lg transition-colors text-[14px] font-medium text-foreground shadow-sm"
            >
              {/* Google G logo */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </a>
          </div>

          <div className="px-8 py-4 bg-stone-50 border-t border-stone-200">
            <div className="flex items-center gap-2 text-[14px] text-muted-foreground/70">
              <svg className="w-3 h-3 flex-shrink-0 text-muted-foreground/40" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              @transitiontrails.org accounts only · Access determined by Google Group membership
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
