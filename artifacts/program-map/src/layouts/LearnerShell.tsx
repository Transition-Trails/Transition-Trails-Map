import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { House, MessageCircle, Zap, TrendingUp } from 'lucide-react';

interface AuthStatus {
  authenticated: boolean;
  name: string | null;
  trail: string | null;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: House,         label: 'Home',     path: '/learner/dashboard' },
  { icon: MessageCircle, label: 'Penny',    path: '/learner/penny'     },
  { icon: Zap,           label: 'Quest',    path: '/learner/quest'     },
  { icon: TrendingUp,    label: 'Progress', path: '/learner/progress'  },
];

interface LearnerShellProps {
  children: React.ReactNode;
}

export default function LearnerShell({ children }: LearnerShellProps) {
  const [location] = useLocation();
  const [auth, setAuth] = useState<AuthStatus>({ authenticated: false, name: null, trail: null });

  useEffect(() => {
    fetch('/api/learner/auth/status')
      .then(r => r.ok ? r.json() as Promise<AuthStatus> : Promise.resolve({ authenticated: false, name: null, trail: null }))
      .then(setAuth)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#FAFAF7' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="h-12 flex items-center justify-between px-4 shrink-0" style={{ background: '#2F6B3F' }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-[15px] tracking-tight">TT</span>
          <span className="text-white/70 text-[14px] font-medium">Trail OS</span>
        </div>
        <div className="flex items-center gap-2">
          {auth.name && (
            <span className="text-white text-[14px]">{auth.name}</span>
          )}
          {auth.trail && (
            <span
              className="text-[14px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
            >
              {auth.trail}
            </span>
          )}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* ── Bottom nav ────────────────────────────────────────────────────── */}
      <div
        className="h-14 flex items-center justify-around shrink-0 border-t"
        style={{ background: 'white', borderColor: '#E2E4E1' }}
      >
        {NAV_ITEMS.map(item => {
          const isActive = location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <div className="flex flex-col items-center gap-0.5 cursor-pointer px-4">
                <item.icon
                  className="w-5 h-5"
                  style={{ color: isActive ? '#2F6B3F' : 'rgba(74,79,77,0.5)' }}
                />
                <span
                  className="text-[14px]"
                  style={{
                    color:      isActive ? '#2F6B3F' : 'rgba(74,79,77,0.5)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
