import { Sparkles } from 'lucide-react';

export default function LearnerLogin() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const error  = params.get('error');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#FAFAF7' }}
    >
      {/* Logo */}
      <div className="text-center">
        <p className="font-bold text-2xl" style={{ color: '#2F6B3F' }}>
          Transition Trails Academy
        </p>
        <p className="text-sm mt-1" style={{ color: '#4A4F4D' }}>Your learning companion</p>
      </div>

      {/* Penny avatar */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mt-8"
        style={{ background: '#2F6B3F' }}
      >
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      {/* Heading */}
      <h1 className="text-xl font-semibold mt-6" style={{ color: '#2A2E2C' }}>
        Welcome back.
      </h1>
      <p
        className="text-[14px] text-center mt-2 max-w-xs"
        style={{ color: '#4A4F4D' }}
      >
        Sign in with your Google account to access your trail, daily quests, and Penny.
      </p>

      {/* Error callout */}
      {error === 'not_enrolled' && (
        <div
          className="mt-4 w-full max-w-xs rounded-lg px-4 py-3 border text-[14px] text-center"
          style={{ background: '#FFFBEB', borderColor: '#FCD34D', color: '#92400E' }}
        >
          We couldn't find your enrollment. Contact your program coordinator.
        </div>
      )}
      {error === 'oauth_failed' && (
        <div
          className="mt-4 w-full max-w-xs rounded-lg px-4 py-3 border text-[14px] text-center"
          style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B' }}
        >
          Sign-in failed — please try again.
        </div>
      )}

      {/* Google sign-in button */}
      <button
        onClick={() => { window.location.href = '/api/learner/auth/google'; }}
        className="mt-6 w-full max-w-xs h-11 rounded-lg border flex items-center justify-center gap-3 text-[14px] font-medium shadow-sm transition-colors"
        style={{
          background:   'white',
          borderColor:  '#E2E4E1',
          color:        '#2A2E2C',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F5FAF6')}
        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
      >
        {/* Google G icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      {/* Footer */}
      <p className="mt-8 text-[14px]" style={{ color: 'rgba(74,79,77,0.4)' }}>
        Powered by Penny AI · Transition Trails Academy
      </p>
    </div>
  );
}
