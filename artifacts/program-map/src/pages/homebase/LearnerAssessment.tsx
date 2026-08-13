/**
 * LearnerAssessment
 *
 * Full-page assessment experience for Homebase learners.
 *
 * Views:
 *   loading  — spinner while resolving session
 *   intake   — "Before you start" info screen
 *   item     — item shell (header + content slot + domain sidebar + Penny footer)
 *   debrief  — stub; full content delivered by Task 6
 *
 * Routing:
 *   /homebase/assessment           → intake (start fresh)
 *   /homebase/assessment/:sessionId → resume in-progress session
 *
 * Auth: requires a valid homebase learner session (requireHomebaseAuth on API).
 */

import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Lock, Clock, ChevronRight, CheckCircle } from "lucide-react";
import { HomebaseShell } from "@/components/layout/HomebaseShell";
import { DomainReadsSidebar } from "@/components/homebase/DomainReadsSidebar";
import { MCItemRenderer, type ConfidenceLevel } from "@/components/homebase/MCItemRenderer";
import { ScenarioItemRenderer, type CoachSignals, type ScenarioItem } from "@/components/homebase/ScenarioItemRenderer";
import BuildCheckItemRenderer from "@/components/homebase/BuildCheckItemRenderer";
import AssessmentDebrief from "@/components/homebase/AssessmentDebrief";
import { useHomebaseAuth } from "@/hooks/useHomebaseAuth";
import { useAppContext } from "@/context/AppContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

const INSTANCE_LABELS: Record<string, { label: string; badge: string }> = {
  "now":    { label: "Baseline",     badge: "1 of 3" },
  "week-6": { label: "Week 6 Check", badge: "2 of 3" },
  "end":    { label: "Final",        badge: "3 of 3" },
};

// Per-domain colour palette (mirrors DomainReadsSidebar)
const DOMAIN_COLORS: Record<string, { bar: string; chip: string; label: string }> = {
  "config-setup":           { bar: "#3B82F6", chip: "#EFF6FF", label: "#1D4ED8" },
  "object-manager-builder": { bar: "#7C3AED", chip: "#F5F3FF", label: "#6D28D9" },
  "sales-marketing":        { bar: "#10B981", chip: "#ECFDF5", label: "#065F46" },
  "service-support":        { bar: "#F97316", chip: "#FFF7ED", label: "#92400E" },
  "productivity":           { bar: "#F59E0B", chip: "#FFFBEB", label: "#78350F" },
  "data-analytics":         { bar: "#14B8A6", chip: "#F0FDFA", label: "#0F766E" },
  "workflow-automation":    { bar: "#6366F1", chip: "#EEF2FF", label: "#3730A3" },
  "security-access":        { bar: "#F43F5E", chip: "#FFF1F2", label: "#9F1239" },
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  "mc":          "Multiple Choice",
  "scenario":    "Scenario",
  "build-check": "Dev Org Verify",
};

// Static domain list for the intake screen bar chart
const SF_ADMIN_DOMAINS = [
  { domain: "config-setup",           domainLabel: "Configuration and Setup",                  domainWeight: 0.18 },
  { domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: 0.18 },
  { domain: "sales-marketing",        domainLabel: "Sales and Marketing Applications",          domainWeight: 0.12 },
  { domain: "service-support",        domainLabel: "Service and Support Applications",          domainWeight: 0.11 },
  { domain: "productivity",           domainLabel: "Productivity and Collaboration",             domainWeight: 0.07 },
  { domain: "data-analytics",         domainLabel: "Data and Analytics Management",             domainWeight: 0.13 },
  { domain: "workflow-automation",    domainLabel: "Workflow and Process Automation",            domainWeight: 0.15 },
  { domain: "security-access",        domainLabel: "Security and Access Management",            domainWeight: 0.06 },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  id:           number;
  learnerEmail: string;
  instance:     string;
  status:       string;
  startedAt:    string;
  completedAt?: string | null;
}

interface DomainState {
  domain:        string;
  domainLabel:   string;
  domainWeight:  number;
  read:          "settled" | "reading" | "not_yet";
  answeredCount: number;
  correctCount:  number;
}

interface AssessmentItem {
  id:          number;
  domain:      string;
  domainLabel: string;
  itemType:    string;
  question:    string;
  options?:    unknown[];
  /** Raw JSONB from API — parsed by ScenarioItemRenderer */
  rubric?:     unknown;
  weight:      number;
}

type View = "loading" | "intake" | "item" | "debrief";

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Intake screen ─────────────────────────────────────────────────────────────

function IntakeView({
  instance,
  onBegin,
  starting,
}: {
  instance: string;
  onBegin:  () => void;
  starting: boolean;
}) {
  const instanceInfo = INSTANCE_LABELS[instance] ?? { label: "Assessment", badge: "1 of 3" };

  const STAT_CARDS = [
    { label: "Length",       value: "~40 items", sub: "5–6 per domain"    },
    { label: "Times Taken",  value: "3 total",   sub: "Now, Week 6, End" },
    { label: "Who Sees It",  value: "Your coach", sub: "And program staff" },
    { label: "Retakes",      value: "None",       sub: "One shot per instance" },
  ];

  return (
    <div className="p-4 space-y-5 pb-8">

      {/* Instance badge */}
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "#EAF4EC", color: "#2F6B3F" }}
        >
          {instanceInfo.label}
        </span>
        <span className="text-[11px] text-muted-foreground">{instanceInfo.badge}</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#2A2E2C" }}>
          Before you start
        </h1>
        <p className="text-[14px] mt-1" style={{ color: "#4A4F4D" }}>
          This is a Salesforce Administrator skill check. Answer honestly — the results
          help your coach calibrate your learning path. There are no trick questions.
        </p>
      </div>

      {/* 4-card stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {STAT_CARDS.map(card => (
          <div
            key={card.label}
            className="rounded-lg border p-3"
            style={{ background: "white", borderColor: "#E2E4E1" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
              {card.label}
            </p>
            <p className="text-base font-bold mt-0.5" style={{ color: "#2A2E2C" }}>{card.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Domain bar chart */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ background: "white", borderColor: "#E2E4E1" }}
      >
        <p className="text-[13px] font-semibold" style={{ color: "#2A2E2C" }}>
          8 exam domains
        </p>
        {SF_ADMIN_DOMAINS.map(d => {
          const clr = DOMAIN_COLORS[d.domain] ?? { bar: "#9CA3AF", chip: "#F9FAFB", label: "#6B7280" };
          const pct = Math.round(d.domainWeight * 100);
          return (
            <div key={d.domain} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: clr.label }}>
                  {d.domainLabel}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: "#6B7280" }}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: clr.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Penny proctor disclaimer */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ background: "#F5FAF6", borderColor: "#BBD9C2" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "#2F6B3F" }}
        >
          <Lock className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "#2F6B3F" }}>
            Penny is in proctor mode
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: "#4A4F4D" }}>
            While you're taking the assessment Penny won't answer questions.
            She'll be back with full access once you submit.
          </p>
        </div>
      </div>

      {/* Begin button */}
      <button
        onClick={onBegin}
        disabled={starting}
        className="w-full h-12 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "#2F6B3F" }}
      >
        {starting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>Begin the assessment <ChevronRight className="w-4 h-4" /></>
        )}
      </button>

    </div>
  );
}

// ── Item shell ─────────────────────────────────────────────────────────────────

function ItemShell({
  itemNumber,
  elapsed,
  currentItem,
  domainReads,
  totalItems,
  sessionId,
  onRespond,
  submitting,
}: {
  itemNumber:  number;
  elapsed:     number;
  currentItem: AssessmentItem | null;
  domainReads: DomainState[];
  totalItems:  number;
  sessionId:   number | null;
  onRespond:   (answer: string, confidence: ConfidenceLevel, signals?: CoachSignals) => Promise<void>;
  submitting:  boolean;
}) {
  const domain    = currentItem?.domain ?? "";
  const clr       = DOMAIN_COLORS[domain] ?? { bar: "#9CA3AF", chip: "#F9FAFB", label: "#6B7280" };
  const typeLabel = ITEM_TYPE_LABELS[currentItem?.itemType ?? "mc"] ?? currentItem?.itemType;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0 flex-wrap"
        style={{ background: "white", borderColor: "#E2E4E1" }}
      >
        <span className="text-[12px] font-semibold" style={{ color: "#6B7280" }}>
          Item {itemNumber}
        </span>

        {currentItem && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: clr.chip, color: clr.label }}
          >
            {currentItem.domainLabel}
          </span>
        )}

        {currentItem && (
          <span className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>
            {typeLabel}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#4A4F4D" }}>
          <Clock className="w-3.5 h-3.5" />
          {formatElapsed(elapsed)}
        </div>
      </div>

      {/* ── Content + sidebar ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main content slot */}
        <div
          className="flex-1 overflow-y-auto p-4"
          data-slot="assessment-item-content"
        >
          {!currentItem && <LoadingView />}

          {currentItem?.itemType === "mc" && (
            <MCItemRenderer
              item={currentItem as unknown as import("@/components/homebase/MCItemRenderer").MCItem}
              onSubmit={onRespond}
              submitting={submitting}
            />
          )}

          {currentItem?.itemType === "scenario" && (
            <ScenarioItemRenderer
              item={currentItem as unknown as ScenarioItem}
              onSubmit={onRespond}
              submitting={submitting}
            />
          )}

          {currentItem?.itemType === "build-check" && sessionId && (
            <BuildCheckItemRenderer
              item={currentItem as unknown as import("@/components/homebase/BuildCheckItemRenderer").BuildCheckItem}
              sessionId={sessionId}
              onSubmit={onRespond}
              submitting={submitting}
            />
          )}

          {currentItem &&
            currentItem.itemType !== "mc" &&
            currentItem.itemType !== "scenario" &&
            currentItem.itemType !== "build-check" && (
            <div
              className="rounded-xl border p-4 min-h-[160px] flex items-center justify-center"
              style={{ borderColor: "#E2E4E1", borderStyle: "dashed", color: "#9CA3AF" }}
            >
              <div className="text-center">
                <p className="text-[13px] font-medium">{typeLabel} renderer</p>
                <p className="text-[11px] mt-1">Coming soon</p>
              </div>
            </div>
          )}
        </div>

        {/* Domain reads sidebar — hidden on very small screens */}
        <div className="hidden sm:flex flex-col p-3 border-l" style={{ borderColor: "#E2E4E1", width: 184 }}>
          <DomainReadsSidebar domainReads={domainReads} />
        </div>
      </div>

      {/* ── Penny proctor footer ───────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-t shrink-0"
        style={{ background: "#F5FAF6", borderColor: "#BBD9C2" }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#2F6B3F" }}
        >
          <Lock className="w-3 h-3 text-white" />
        </div>
        <p className="text-[12px] font-medium flex-1" style={{ color: "#4A4F4D" }}>
          Proctoring — I'll be back when you finish.
        </p>
        <input
          disabled
          placeholder="Penny is in proctor mode"
          className="flex-1 max-w-[200px] text-[12px] rounded-lg border px-2.5 py-1.5 bg-white opacity-50 cursor-not-allowed outline-none hidden md:block"
          style={{ borderColor: "#E2E4E1" }}
        />
      </div>

    </div>
  );
}

// DebriefStub removed — replaced by AssessmentDebrief component

// ── Main component ─────────────────────────────────────────────────────────────

export default function LearnerAssessment() {
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const { email, displayName, audience, isLoading: authLoading } = useHomebaseAuth();
  const { setAssessmentActive } = useAppContext();
  const [, navigate] = useLocation();

  const [view,        setView]        = useState<View>("loading");
  const [session,     setSession]     = useState<Session | null>(null);
  const [domainReads, setDomainReads] = useState<DomainState[]>([]);
  const [currentItem, setCurrentItem] = useState<AssessmentItem | null>(null);
  const [itemNumber,  setItemNumber]  = useState(1);
  const [elapsed,     setElapsed]     = useState(0);
  const [starting,    setStarting]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Estimate total items based on settling logic: ~40 items across 8 domains (5 per domain)
  const TOTAL_ESTIMATE = 40;

  // ── Session bootstrap ────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (audience !== "learner") return; // auth guard handled at route level
    if (routeSessionId) {
      void resumeSession(Number(routeSessionId));
    } else {
      setView("intake");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, audience, routeSessionId]);

  // ── Elapsed timer — only runs while in item view ─────────────────
  useEffect(() => {
    if (view !== "item") return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [view]);

  // ── Proctor lock — disable Penny while assessment is active ────────
  useEffect(() => {
    const active = view === "item";
    setAssessmentActive(active);
    return () => { setAssessmentActive(false); };
  }, [view, setAssessmentActive]);

  // ── API helpers ──────────────────────────────────────────────────

  async function fetchNextItem(sessionId: number): Promise<boolean> {
    const data = await apiJson<{
      done: boolean;
      item?: AssessmentItem;
      domainReads?: DomainState[];
    }>(`/api/assessments/next-item/${sessionId}`);

    if (data.domainReads) setDomainReads(data.domainReads);
    if (data.done) {
      // Mark session complete in DB + trigger SF write before showing debrief.
      // Fire-and-forget — don't block the transition on the complete call.
      try {
        const completed = await apiJson<{ session: Session; domainReads: DomainState[]; alreadyCompleted: boolean }>(
          `/api/assessments/sessions/${sessionId}/complete`,
          { method: "POST" },
        );
        if (completed.session) setSession(completed.session);
        if (completed.domainReads) setDomainReads(completed.domainReads);
      } catch {
        // Non-blocking — proceed to debrief even if complete call fails.
      }
      setView("debrief");
      return true;
    }
    if (data.item) setCurrentItem(data.item);
    return false;
  }

  async function beginSession() {
    if (!email) return;
    setStarting(true);
    try {
      const data = await apiJson<{ session: Session; domainReads: DomainState[]; resumed: boolean }>(
        "/api/assessments/sessions",
        {
          method: "POST",
          body:   JSON.stringify({ learnerEmail: email, instance: "now" }),
        },
      );
      setSession(data.session);
      setDomainReads(data.domainReads);
      setElapsed(0);
      setItemNumber(1);
      navigate(`/homebase/assessment/${data.session.id}`);
      const done = await fetchNextItem(data.session.id);
      if (!done) setView("item");
    } catch (err) {
      setError("Could not start the assessment. Please try again.");
      setView("intake");
    } finally {
      setStarting(false);
    }
  }

  async function handleRespond(
    answer:     string,
    confidence: ConfidenceLevel,
    signals?:   CoachSignals,
  ) {
    if (!session) return;
    setSubmitting(true);
    try {
      const data = await apiJson<{
        response:    unknown;
        domainReads: DomainState[];
      }>(
        `/api/assessments/sessions/${session.id}/respond`,
        {
          method: "POST",
          body:   JSON.stringify({
            itemId: currentItem?.id,
            answer,
            confidence,
            ...(signals ?? {}),
          }),
        },
      );
      if (data.domainReads) setDomainReads(data.domainReads);
      setItemNumber(n => n + 1);
      await fetchNextItem(session.id);
    } catch {
      setError("Could not save your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resumeSession(sessionId: number) {
    setView("loading");
    try {
      const data = await apiJson<{ session: Session; domainReads: DomainState[] }>(
        `/api/assessments/sessions/${sessionId}`,
      );
      setSession(data.session);
      setDomainReads(data.domainReads);

      if (data.session.status === "completed") {
        setView("debrief");
        return;
      }
      const done = await fetchNextItem(sessionId);
      if (!done) setView("item");
    } catch {
      // Session not found or unauthorized — fall back to intake
      setView("intake");
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <HomebaseShell audience="learner" displayName="">
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </HomebaseShell>
    );
  }

  return (
    <HomebaseShell audience={audience ?? "learner"} displayName={displayName ?? ""}>

      {error && (
        <div
          className="mx-4 mt-4 rounded-lg border p-3 text-[13px]"
          style={{ borderColor: "#FECACA", background: "#FEF2F2", color: "#991B1B" }}
        >
          {error}
        </div>
      )}

      {view === "loading" && (
        <div className="p-4">
          <LoadingView />
        </div>
      )}

      {view === "intake" && (
        <IntakeView
          instance={session?.instance ?? "now"}
          onBegin={() => void beginSession()}
          starting={starting}
        />
      )}

      {view === "item" && (
        <div className="h-full overflow-hidden">
          <ItemShell
            itemNumber={itemNumber}
            elapsed={elapsed}
            currentItem={currentItem}
            domainReads={domainReads}
            totalItems={TOTAL_ESTIMATE}
            sessionId={session?.id ?? null}
            onRespond={handleRespond}
            submitting={submitting}
          />
        </div>
      )}

      {view === "debrief" && session && (
        <AssessmentDebrief
          sessionId={session.id}
          session={session}
          initialDomainReads={domainReads}
        />
      )}

    </HomebaseShell>
  );
}
