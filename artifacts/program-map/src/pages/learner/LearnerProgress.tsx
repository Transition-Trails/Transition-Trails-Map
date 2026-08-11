import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import LearnerShell from '@/layouts/LearnerShell';

// ── Types matching GET /api/learner/profile ────────────────────────────────────

interface ContactProfile {
  id: string;
  firstName: string;
  lastName: string;
  pennyTrail: string | null;
  currentPhase: string | null;
  currentGoal: string | null;
  confidenceScore: number | null;
  sprintWeek: number | null;
}

interface CompletionRecord {
  id: string;
  name: string;
  status: string | null;
  score: number | null;
  pointsEarned: number | null;
  activityName: string | null;
  moduleName: string | null;
  submittedAt: string | null;
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
  emptyFields: string[];
  contactError?: string;
}

interface GamificationResponse {
  points: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnerProgress() {
  const [contact,     setContact]     = useState<ContactProfile | null>(null);
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [points,      setPoints]      = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [sfError,     setSfError]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/learner/profile').then(r => r.json() as Promise<ProfileResponse>),
      fetch('/api/learner/gamification').then(r => r.ok ? r.json() as Promise<GamificationResponse> : null),
    ]).then(([profile, gamif]) => {
      if (profile.ok && profile.contact) {
        setContact(profile.contact);
        setCompletions(profile.completions ?? []);
        setEnrollments(profile.enrollments ?? []);
      } else if (!profile.ok) {
        setSfError(profile.contactError ?? 'Salesforce unavailable');
      }
      if (gamif) setPoints(gamif.points ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const firstName      = contact?.firstName ?? '';
  const trail          = contact?.pennyTrail ?? null;
  const phase          = contact?.currentPhase ?? null;
  const goal           = contact?.currentGoal ?? null;
  const confidence     = contact?.confidenceScore ?? 0;
  const confidencePct  = Math.min(100, Math.max(0, ((confidence ?? 0) / 10) * 100));
  const currentEnroll  = enrollments[0] ?? null;

  // Score average across graded completions
  const gradedCompletions = completions.filter(c => c.score !== null);
  const avgScore = gradedCompletions.length > 0
    ? Math.round(gradedCompletions.reduce((sum, c) => sum + (c.score ?? 0), 0) / gradedCompletions.length)
    : null;

  return (
    <LearnerShell>
      <div className="p-4 space-y-4 pb-6">

        {/* ── SF error banner ────────────────────────────────────────────── */}
        {!loading && sfError && (
          <div
            className="rounded-lg border p-3 text-[13px]"
            style={{ borderColor: '#FECACA', background: '#FEF2F2', color: '#991B1B' }}
          >
            Could not load your progress from Salesforce.
          </div>
        )}

        {/* ── Points card ───────────────────────────────────────────────── */}
        <div className="rounded-xl p-5 text-white" style={{ background: '#2F6B3F' }}>
          <p className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ⚡ My Points
          </p>
          {loading ? (
            <div className="h-12 w-24 mt-1 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.2)' }} />
          ) : (
            <p className="text-5xl font-bold mt-1">{points}</p>
          )}
          <p className="text-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>personal progress</p>
        </div>

        {/* ── Trail info ────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ background: 'white', borderColor: '#E2E4E1' }}
        >
          <p className="text-[14px] font-bold" style={{ color: '#4A4F4D' }}>My Trail</p>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-5 w-36 rounded bg-gray-100" />
              <div className="h-4 w-24 rounded bg-gray-100" />
            </div>
          ) : (
            <>
              <p className="text-[15px] font-semibold" style={{ color: '#2A2E2C' }}>
                {trail ?? '—'}
              </p>
              {phase && (
                <p className="text-[14px]" style={{ color: '#4A4F4D' }}>Phase: {phase}</p>
              )}
              {goal && (
                <p className="text-[14px]" style={{ color: '#4A4F4D' }}>Goal: {goal}</p>
              )}
              {currentEnroll?.currentModuleName && (
                <p className="text-[14px]" style={{ color: '#4A4F4D' }}>
                  Current module: {currentEnroll.currentModuleName}
                </p>
              )}

              {/* Confidence score bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px]" style={{ color: '#4A4F4D' }}>Confidence score</p>
                  <p className="text-[14px] font-semibold" style={{ color: '#2F6B3F' }}>{confidence}/10</p>
                </div>
                <div className="rounded-full h-2" style={{ background: '#E2E4E1' }}>
                  <div
                    className="rounded-full h-2 transition-all"
                    style={{ background: '#2F6B3F', width: `${confidencePct}%` }}
                  />
                </div>
              </div>

              {/* Average score across graded completions */}
              {avgScore !== null && (
                <p className="text-[14px]" style={{ color: '#4A4F4D' }}>
                  Average score: <span className="font-semibold" style={{ color: '#2F6B3F' }}>{avgScore}%</span>
                  {' '}across {gradedCompletions.length} graded activities
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Recent completions ────────────────────────────────────────── */}
        {!loading && completions.length > 0 && (
          <div
            className="rounded-xl border p-4 space-y-2"
            style={{ background: 'white', borderColor: '#E2E4E1' }}
          >
            <p className="text-[14px] font-bold" style={{ color: '#4A4F4D' }}>Recent Completions</p>
            {completions.slice(0, 5).map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between py-1.5 border-b last:border-b-0"
                style={{ borderColor: '#F3F4F6' }}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: '#2A2E2C' }}>
                    {c.activityName ?? c.name}
                  </p>
                  {c.moduleName && (
                    <p className="text-[13px]" style={{ color: '#4A4F4D' }}>{c.moduleName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {c.score !== null && (
                    <span className="text-[13px] font-semibold" style={{ color: '#2F6B3F' }}>
                      {c.score}%
                    </span>
                  )}
                  {c.status && (
                    <span
                      className="text-[13px] px-2 py-0.5 rounded-full"
                      style={{
                        background: c.status === 'Submitted' ? '#EAF4EC' : '#F3F4F6',
                        color: c.status === 'Submitted' ? '#2F6B3F' : '#4A4F4D',
                      }}
                    >
                      {c.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Encouragement from Penny ──────────────────────────────────── */}
        <div className="rounded-xl p-4 flex gap-3" style={{ background: '#EAF4EC' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#2F6B3F' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <p className="text-[14px]" style={{ color: '#2A2E2C' }}>
            Keep going{firstName ? `, ${firstName}` : ''}!
            {points >= 50
              ? ` You've earned ${points} points — you're building real momentum on your ${trail ?? 'trail'}.`
              : ` Every quest brings you closer to your goal. Keep showing up!`}
          </p>
        </div>

      </div>
    </LearnerShell>
  );
}
