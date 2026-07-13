import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import LearnerShell from '@/layouts/LearnerShell';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SFContact {
  FirstName?: string;
  LastName?: string;
  Penny_Trail__c?: string | null;
  Penny_Current_Phase__c?: string | null;
  Penny_Current_Goal__c?: string | null;
  Penny_Confidence_Score__c?: number | null;
}

interface MeResponse {
  authenticated: boolean;
  contact: SFContact | null;
}

interface GamificationResponse {
  points: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnerProgress() {
  const [contact, setContact] = useState<SFContact | null>(null);
  const [points,  setPoints]  = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/learner/me').then(r => r.ok ? r.json() as Promise<MeResponse> : null),
      fetch('/api/learner/gamification').then(r => r.ok ? r.json() as Promise<GamificationResponse> : null),
    ]).then(([me, gamif]) => {
      if (me?.contact) setContact(me.contact);
      if (gamif) setPoints(gamif.points ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const firstName = contact?.FirstName ?? '';
  const trail     = contact?.Penny_Trail__c ?? null;
  const phase     = contact?.Penny_Current_Phase__c ?? null;
  const goal      = contact?.Penny_Current_Goal__c ?? null;
  const confidence = contact?.Penny_Confidence_Score__c ?? 0;
  const confidencePct = Math.min(100, Math.max(0, (confidence / 10) * 100));

  return (
    <LearnerShell>
      <div className="p-4 space-y-4 max-w-2xl mx-auto pb-6">

        {/* ── Points card ───────────────────────────────────────────────── */}
        <div className="rounded-xl p-5 text-white" style={{ background: '#2F6B3F' }}>
          <p className="text-[11px] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ⚡ My Points
          </p>
          {loading ? (
            <div className="h-12 w-24 mt-1 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.2)' }} />
          ) : (
            <p className="text-5xl font-bold mt-1">{points}</p>
          )}
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>personal progress</p>
        </div>

        {/* ── Trail info ────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ background: 'white', borderColor: '#E2E4E1' }}
        >
          <p className="text-[10px] font-bold uppercase" style={{ color: '#4A4F4D' }}>My Trail</p>

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
                <p className="text-[13px]" style={{ color: '#4A4F4D' }}>Phase: {phase}</p>
              )}
              {goal && (
                <p className="text-[13px]" style={{ color: '#4A4F4D' }}>Goal: {goal}</p>
              )}

              {/* Confidence score bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px]" style={{ color: '#4A4F4D' }}>Confidence score</p>
                  <p className="text-[11px] font-semibold" style={{ color: '#2F6B3F' }}>{confidence}/10</p>
                </div>
                <div className="rounded-full h-2" style={{ background: '#E2E4E1' }}>
                  <div
                    className="rounded-full h-2 transition-all"
                    style={{ background: '#2F6B3F', width: `${confidencePct}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Encouragement from Penny ──────────────────────────────────── */}
        <div className="rounded-xl p-4 flex gap-3" style={{ background: '#EAF4EC' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#2F6B3F' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <p className="text-[13px]" style={{ color: '#2A2E2C' }}>
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
