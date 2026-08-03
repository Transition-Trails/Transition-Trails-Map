import { useState, useEffect } from 'react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import { Sparkles, CheckCircle } from 'lucide-react';
import LearnerShell from '@/layouts/LearnerShell';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyQuest {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  pointValue: number;
  category: string;
  acceptanceCriteria: string;
}

interface SubmitResult {
  success: boolean;
  feedback: string;
  pointsEarned: number;
  totalPoints: number;
}

interface GamificationResponse {
  points: number;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Beginner:     { bg: '#EAF4EC', text: '#2F6B3F'  },
  Intermediate: { bg: '#FEF3C7', text: '#92400E'  },
  Expert:       { bg: '#FEE2E2', text: '#991B1B'  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnerQuest() {
  const [, navigate] = useLocation();

  const [quest,      setQuest]      = useState<DailyQuest | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [response,   setResponse]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState<SubmitResult | null>(null);
  const [points,     setPoints]     = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/learner/daily-quest').then(r => r.ok ? r.json() as Promise<DailyQuest> : null),
      fetch('/api/learner/gamification').then(r => r.ok ? r.json() as Promise<GamificationResponse> : null),
    ]).then(([q, g]) => {
      if (q) setQuest(q);
      if (g) setPoints(g.points ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function submit() {
    if (!quest || !response.trim() || submitting) return;
    setSubmitting(true);
    try {
      const resp = await fetch('/api/learner/quest/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          questTitle:       quest.title,
          questDescription: quest.acceptanceCriteria,
          pointValue:       quest.pointValue,
          learnerResponse:  response.trim(),
        }),
      });
      if (resp.ok) {
        const data = await resp.json() as SubmitResult;
        setResult(data);
      } else {
        setResult({ success: false, feedback: 'Submission failed — please try again.', pointsEarned: 0, totalPoints: points });
      }
    } catch {
      setResult({ success: false, feedback: 'Network error — please try again.', pointsEarned: 0, totalPoints: points });
    } finally {
      setSubmitting(false);
    }
  }

  const diffClrs = quest ? (DIFFICULTY_COLORS[quest.difficulty] ?? DIFFICULTY_COLORS.Beginner) : DIFFICULTY_COLORS.Beginner;

  return (
    <LearnerShell>
      <div className="p-4 space-y-4 max-w-2xl mx-auto pb-6">

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-28 rounded-xl" style={{ background: '#E2E4E1' }} />
            <div className="h-20 rounded-xl" style={{ background: '#E2E4E1' }} />
            <div className="h-36 rounded-xl" style={{ background: '#E2E4E1' }} />
          </div>
        )}

        {/* ── No quest ──────────────────────────────────────────────────── */}
        {!loading && !quest && (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#EAF4EC' }}
            >
              <Sparkles className="w-7 h-7" style={{ color: '#2F6B3F' }} />
            </div>
            <p className="text-[14px]" style={{ color: '#4A4F4D' }}>
              Penny is preparing today's quest — check back soon.
            </p>
          </div>
        )}

        {/* ── Quest available, not yet submitted ────────────────────────── */}
        {!loading && quest && !result && (
          <>
            {/* Quest header */}
            <div className="rounded-xl p-4 text-white" style={{ background: '#2F6B3F' }}>
              <p className="text-[14px]  font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Today's Quest
              </p>
              <p className="text-xl font-bold mt-1">{quest.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-[14px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: diffClrs.bg, color: diffClrs.text }}
                >
                  {quest.difficulty}
                </span>
                <span className="text-[14px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Worth {quest.pointValue} points
                </span>
              </div>
            </div>

            {/* Description */}
            <div
              className="rounded-xl border p-4 text-[14px]"
              style={{ background: 'white', borderColor: '#E2E4E1', color: '#2A2E2C' }}
            >
              {quest.description}
            </div>

            {/* Acceptance criteria */}
            <div className="rounded-xl p-4" style={{ background: '#EAF4EC' }}>
              <p className="text-[14px] font-bold " style={{ color: '#2F6B3F' }}>
                What a good answer looks like
              </p>
              <p className="text-[14px] mt-1" style={{ color: '#2A2E2C' }}>
                {quest.acceptanceCriteria}
              </p>
            </div>

            {/* Response textarea */}
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              disabled={submitting}
              placeholder="Write your response here..."
              className="w-full min-h-[150px] rounded-xl border p-3 text-[14px] resize-none focus:outline-none focus:ring-1"
              style={{
                borderColor: '#E2E4E1',
                '--tw-ring-color': '#2F6B3F',
              } as React.CSSProperties}
            />

            {/* Submit */}
            <button
              onClick={() => void submit()}
              disabled={!response.trim() || submitting}
              className="w-full h-11 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: '#2F6B3F' }}
            >
              {submitting ? 'Submitting…' : 'Submit Quest'}
            </button>
          </>
        )}

        {/* ── Submitted — show feedback ─────────────────────────────────── */}
        {result && quest && (
          <>
            {/* Success banner */}
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: '#EAF4EC' }}
            >
              <CheckCircle className="w-6 h-6 shrink-0" style={{ color: '#2F6B3F' }} />
              <div>
                <p className="font-bold text-lg" style={{ color: '#2F6B3F' }}>
                  +{result.pointsEarned} points earned!
                </p>
                <p className="text-[14px]" style={{ color: '#2A2E2C' }}>
                  Total: {result.totalPoints} points
                </p>
              </div>
            </div>

            {/* Penny feedback */}
            <div
              className="rounded-xl border p-4"
              style={{ background: 'white', borderColor: '#E2E4E1' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: '#2F6B3F' }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <p className="text-[14px] font-bold" style={{ color: '#4A4F4D' }}>{TERMS.aiAssistant}'s feedback</p>
              </div>
              <p className="text-[14px] whitespace-pre-line" style={{ color: '#2A2E2C' }}>
                {result.feedback}
              </p>
            </div>

            {/* Back home */}
            <button
              onClick={() => navigate('/learner/dashboard')}
              className="w-full h-11 rounded-xl border font-semibold text-[14px] transition-colors"
              style={{ background: 'white', borderColor: '#E2E4E1', color: '#2A2E2C' }}
            >
              Back to Home
            </button>
          </>
        )}

      </div>
    </LearnerShell>
  );
}
