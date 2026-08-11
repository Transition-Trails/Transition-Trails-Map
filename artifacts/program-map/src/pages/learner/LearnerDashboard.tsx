import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ExternalLink } from 'lucide-react';
import LearnerShell from '@/layouts/LearnerShell';

// ── Types matching GET /api/learner/profile ────────────────────────────────────

interface ContactProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  pennyTrail: string | null;
  currentPhase: string | null;
  currentGoal: string | null;
  confidenceScore: number | null;
}

interface CompletionRecord {
  id: string;
  name: string;
  status: string | null;
  submittedAt: string | null;
  activityName: string | null;
  moduleName: string | null;
}

interface EnrollmentRecord {
  id: string;
  name: string;
  currentModuleName: string | null;
  courseName: string | null;
}

interface ProfileResponse {
  ok: boolean;
  contact: ContactProfile | null;
  completions: CompletionRecord[];
  enrollments: EnrollmentRecord[];
  programEngagements: unknown[];
  emptyFields: string[];
  contactError?: string;
}

interface DailyQuest {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  pointValue: number;
  category: string;
  acceptanceCriteria: string;
  cached?: boolean;
}

interface GamificationResponse {
  points: number;
  recordId: string | null;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Beginner:     { bg: '#EAF4EC', text: '#2F6B3F' },
  Intermediate: { bg: '#FEF3C7', text: '#92400E' },
  Expert:       { bg: '#FEE2E2', text: '#991B1B' },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d?: string | null): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return d; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnerDashboard() {
  const [, navigate] = useLocation();

  const [contact,      setContact]      = useState<ContactProfile | null>(null);
  const [completions,  setCompletions]  = useState<CompletionRecord[]>([]);
  const [dailyQuest,   setDailyQuest]   = useState<DailyQuest | null>(null);
  const [questLoading, setQuestLoading] = useState(true);
  const [points,       setPoints]       = useState(0);
  const [loading,      setLoading]      = useState(true);
  // Distinguishes SF-down from genuinely no data
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/learner/profile').then(r => r.json() as Promise<ProfileResponse>),
      fetch('/api/learner/gamification').then(r => r.ok ? r.json() as Promise<GamificationResponse> : null),
    ]).then(([profile, gamif]) => {
      if (profile.ok && profile.contact) {
        setContact(profile.contact);
        setCompletions(profile.completions ?? []);
      } else if (!profile.ok) {
        // Permissions failure — surface it so admin can diagnose
        setProfileError(profile.contactError ?? 'Salesforce unavailable');
      }
      if (gamif) setPoints(gamif.points ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));

    fetch('/api/learner/daily-quest')
      .then(r => r.ok ? r.json() as Promise<DailyQuest> : null)
      .then(q => { if (q) setDailyQuest(q); setQuestLoading(false); })
      .catch(() => setQuestLoading(false));
  }, []);

  const firstName = contact?.firstName ?? '';
  const trail     = contact?.pennyTrail ?? null;
  const phase     = contact?.currentPhase ?? null;
  const diffClrs  = dailyQuest ? (DIFFICULTY_COLORS[dailyQuest.difficulty] ?? DIFFICULTY_COLORS.Beginner) : DIFFICULTY_COLORS.Beginner;

  // Recent completions — substitute for assignment list while Course_Enrollment__c is unseeded
  const recentActivity = completions.slice(0, 5);

  return (
    <LearnerShell>
      <div className="p-4 space-y-4 pb-6">

        {/* ── Header ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-gray-100 animate-pulse" />
            <div className="h-5 w-24 rounded-full bg-gray-100 animate-pulse" />
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#2A2E2C' }}>
              {greeting()}{firstName ? `, ${firstName}` : ''}.
            </h1>
            {trail && (
              <span
                className="inline-block text-[14px] font-semibold px-2.5 py-1 rounded-full mt-1"
                style={{ background: '#EAF4EC', color: '#2F6B3F' }}
              >
                {trail}
              </span>
            )}
            {phase && (
              <p className="text-[14px] mt-0.5" style={{ color: '#4A4F4D' }}>
                Phase: {phase}
              </p>
            )}
          </div>
        )}

        {/* ── SF error banner — only shown on permissions failure ─────── */}
        {!loading && profileError && (
          <div
            className="rounded-lg border p-3 text-[13px]"
            style={{ borderColor: '#FECACA', background: '#FEF2F2', color: '#991B1B' }}
          >
            Could not load your profile from Salesforce. Your admin has been notified.
          </div>
        )}

        {/* ── Points banner ─────────────────────────────────────────────── */}
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: '#2F6B3F' }}
        >
          <div>
            <p className="font-bold text-lg text-white">⚡ {points} points</p>
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.7)' }}>personal best</p>
          </div>
          <Sparkles className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>

        {/* ── Today's Quest ─────────────────────────────────────────────── */}
        <div
          className="rounded-xl border p-4 shadow-sm"
          style={{ background: 'white', borderColor: '#E2E4E1' }}
        >
          {questLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-24 rounded bg-gray-100" />
              <div className="h-5 w-48 rounded bg-gray-100" />
              <div className="h-3 w-32 rounded bg-gray-100" />
            </div>
          ) : dailyQuest ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[14px] font-bold" style={{ color: '#4A4F4D' }}>
                  Today's Quest
                </p>
                <span
                  className="text-[14px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: diffClrs.bg, color: diffClrs.text }}
                >
                  {dailyQuest.difficulty}
                </span>
              </div>
              <p className="text-[15px] font-semibold mt-1" style={{ color: '#2A2E2C' }}>
                {dailyQuest.title}
              </p>
              <p className="text-[14px] font-medium mt-0.5" style={{ color: '#2F6B3F' }}>
                Worth {dailyQuest.pointValue} points
              </p>
              <button
                onClick={() => navigate('/learner/quest')}
                className="mt-3 px-4 py-2 rounded-lg text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#2F6B3F' }}
              >
                Accept Today's Quest →
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: '#2F6B3F' }} />
              <p className="text-[14px]" style={{ color: '#4A4F4D' }}>
                Penny is preparing today's quest — check back soon.
              </p>
            </div>
          )}
        </div>

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        <div>
          <p className="text-[14px] font-bold mb-2" style={{ color: '#2A2E2C' }}>Recent Activity</p>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => (
                <div key={i} className="h-14 rounded-lg border animate-pulse" style={{ background: '#F3F4F6', borderColor: '#E2E4E1' }} />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div
              className="rounded-lg border p-3 text-center text-[14px]"
              style={{ borderColor: '#E2E4E1', color: '#4A4F4D' }}
            >
              No activity yet — complete your first quest to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map(c => (
                <div
                  key={c.id}
                  className="rounded-lg border p-3 flex items-center justify-between"
                  style={{ background: 'white', borderColor: '#E2E4E1' }}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: '#2A2E2C' }}>
                      {c.activityName ?? c.name}
                    </p>
                    {c.moduleName && (
                      <p className="text-[14px]" style={{ color: '#4A4F4D' }}>{c.moduleName}</p>
                    )}
                  </div>
                  {c.status && (
                    <span
                      className="text-[13px] shrink-0 ml-2 px-2 py-0.5 rounded-full"
                      style={{
                        background: c.status === 'Submitted' ? '#EAF4EC' : '#F3F4F6',
                        color: c.status === 'Submitted' ? '#2F6B3F' : '#4A4F4D',
                      }}
                    >
                      {c.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Google Classroom link */}
          <button
            onClick={() => window.open('https://classroom.google.com', '_blank')}
            className="mt-2 w-full h-10 rounded-lg border flex items-center justify-center gap-2 text-[14px] font-medium transition-colors"
            style={{ background: 'white', borderColor: '#E2E4E1', color: '#2A2E2C' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F5FAF6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            <ExternalLink className="w-4 h-4" />
            Open Google Classroom
          </button>
        </div>

      </div>
    </LearnerShell>
  );
}
