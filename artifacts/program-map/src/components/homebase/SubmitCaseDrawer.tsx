/**
 * SubmitCaseDrawer
 *
 * Multi-step slide-over for submitting a new Salesforce Case.
 *
 * Step 1 — Pick a record type (skipped automatically when only one is available)
 * Step 2 — Fill required fields (Subject, Description, Priority, Owner, Contact, Account)
 * Step 3 — Result (success with case number / error with retry)
 *
 * Local-first: the case is written to the local DB first, then synced to
 * Salesforce.  A local-only record can be retried from the Cases page.
 */

import { useState, useEffect, useRef } from "react";
import {
  X, Loader2, CheckCircle2, AlertCircle,
  ChevronLeft, Briefcase, ExternalLink, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RecordType { id: string; name: string; isDefault: boolean }
interface Queue      { id: string; name: string }
interface SearchHit  { id: string; type: string; label: string; subtitle?: string }

interface SubmitResult {
  synced:        boolean;
  sfCaseId?:     string;
  sfCaseNumber?: string;
  message?:      string;
}

export interface SubmitCaseDrawerProps {
  open:        boolean;
  onClose:     () => void;
  /** Called after a successful (or local-only) submission so callers can refresh. */
  onSubmitted?: () => void;
}

type Step = "type" | "form" | "result";
type OwnerMode = "self" | "queue";

// ── Lookup field ───────────────────────────────────────────────────────────────

function LookupField({
  label, types, placeholder, value, onChange,
}: {
  label:       string;
  types:       string;   // comma-separated SF object types e.g. "Account,Contact"
  placeholder: string;
  value:       SearchHit | null;
  onChange:    (hit: SearchHit | null) => void;
}) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SearchHit[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const ref     = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setResults([]); return undefined; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/sf/records/search?q=${encodeURIComponent(query)}&types=${encodeURIComponent(types)}`);
        if (r.ok) {
          const d = await r.json() as { results: SearchHit[] };
          setResults(d.results ?? []);
          setOpen(true);
        }
      } finally { setLoading(false); }
    }, 320);
    return undefined;
  }, [query, types]);

  if (value) {
    return (
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-sm flex-1 truncate">{value.label}</span>
          <button type="button" onClick={() => onChange(null)}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground">{label}</label>
      <div className="relative" ref={ref}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        {loading && <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background pl-8 pr-8 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {open && results.length > 0 && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 rounded-lg border border-border bg-white shadow-lg overflow-hidden">
            {results.map(r => (
              <button key={r.id} type="button"
                onClick={() => { onChange(r); setQuery(""); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0">
                <span className="text-sm truncate flex-1">{r.label}</span>
                {r.subtitle && r.subtitle !== r.type && (
                  <span className="text-[11px] text-muted-foreground shrink-0">{r.subtitle}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SubmitCaseDrawer({ open, onClose, onSubmitted }: SubmitCaseDrawerProps) {
  const { toast } = useToast();

  // Steps
  const [step,        setStep]        = useState<Step>("type");

  // Step 1 — record types
  const [types,       setTypes]       = useState<RecordType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<RecordType | null>(null);

  // Step 2 — form
  const [subject,     setSubject]     = useState("");
  const [description, setDesc]        = useState("");
  const [priority,    setPriority]    = useState<"High" | "Medium" | "Low">("Medium");
  const [ownerMode,   setOwnerMode]   = useState<OwnerMode>("self");
  const [queues,      setQueues]      = useState<Queue[]>([]);
  const [queuesLoading, setQueuesLoading] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [contact,     setContact]     = useState<SearchHit | null>(null);
  const [account,     setAccount]     = useState<SearchHit | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState<string | null>(null);

  // Step 3 — result
  const [result,      setResult]      = useState<SubmitResult | null>(null);

  // ── Load record types when drawer opens ─────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setTypesLoading(true);
    fetch("/api/sf/cases/record-types")
      .then(r => r.ok ? r.json() as Promise<{ recordTypes: RecordType[] }> : Promise.reject())
      .then(d => {
        const rt = d.recordTypes ?? [];
        setTypes(rt);
        // If only one type (or zero), skip step 1
        if (rt.length <= 1) {
          setSelectedType(rt[0] ?? null);
          setStep("form");
          void loadQueues();
        } else {
          setStep("type");
        }
      })
      .catch(() => {
        // SF not connected or describe failed — go straight to form with no record type
        setTypes([]);
        setSelectedType(null);
        setStep("form");
        void loadQueues();
      })
      .finally(() => setTypesLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQueues() {
    setQueuesLoading(true);
    try {
      const r = await fetch("/api/sf/cases/queues");
      if (r.ok) {
        const d = await r.json() as { queues: Queue[] };
        setQueues(d.queues ?? []);
      }
    } finally { setQueuesLoading(false); }
  }

  // ── Reset when closed ────────────────────────────────────────────────────────

  function reset() {
    setStep("type");
    setSelectedType(null);
    setSubject("");
    setDesc("");
    setPriority("Medium");
    setOwnerMode("self");
    setSelectedQueue(null);
    setContact(null);
    setAccount(null);
    setFormError(null);
    setResult(null);
    setTypes([]);
    setQueues([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ── Step 1 → Step 2 ─────────────────────────────────────────────────────────

  function selectType(rt: RecordType) {
    setSelectedType(rt);
    setStep("form");
    void loadQueues();
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { setFormError("Subject is required."); return; }
    if (ownerMode === "queue" && !selectedQueue) { setFormError("Please select a queue."); return; }
    setFormError(null);
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        subject:         subject.trim(),
        description:     description.trim() || undefined,
        priority,
        recordTypeId:    selectedType?.id     || undefined,
        recordTypeName:  selectedType?.name   || undefined,
        contactId:       contact?.id          || undefined,
        contactName:     contact?.label       || undefined,
        accountId:       account?.id          || undefined,
        accountName:     account?.label       || undefined,
      };
      if (ownerMode === "queue" && selectedQueue) {
        body["ownerId"]   = selectedQueue.id;
        body["ownerName"] = selectedQueue.name;
        body["ownerType"] = "queue";
      } else {
        body["ownerType"] = "self";
      }

      const r = await fetch("/api/cases/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await r.json() as { synced?: boolean; sfCaseNumber?: string; sfCaseId?: string; message?: string; error?: string };

      if (!r.ok && r.status !== 201) {
        throw new Error(data.error ?? `HTTP ${r.status}`);
      }

      const res: SubmitResult = {
        synced:       data.synced ?? false,
        sfCaseId:     data.sfCaseId,
        sfCaseNumber: data.sfCaseNumber,
        message:      data.message,
      };
      setResult(res);
      setStep("result");

      if (res.synced) {
        toast({ title: "Case submitted", description: res.sfCaseNumber ? `Case #${res.sfCaseNumber} created` : "Case created in Salesforce" });
      } else {
        toast({ title: "Case saved locally", description: res.message ?? "Sync pending", variant: "default" });
      }

      onSubmitted?.();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to submit case.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" onClick={handleClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Submit a Case</h2>
            {selectedType && step === "form" && (
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                {selectedType.name}
              </span>
            )}
          </div>
          <button onClick={handleClose} aria-label="Close"
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Record type ─────────────────────────────────────────── */}
          {step === "type" && (
            <div className="px-5 py-5">
              {typesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading case types…
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Select the type of case you'd like to submit.
                  </p>
                  <div className="space-y-2">
                    {types.map(rt => (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => selectType(rt)}
                        className="w-full text-left rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/[0.03] px-4 py-3.5 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {rt.name}
                          </span>
                          {rt.isDefault && (
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                              Default
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Form ────────────────────────────────────────────────── */}
          {step === "form" && (
            <form id="case-form" onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground" htmlFor="case-subject">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  id="case-subject"
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                  maxLength={255}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground" htmlFor="case-desc">
                  Description
                </label>
                <textarea
                  id="case-desc"
                  rows={4}
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Provide additional context, steps to reproduce, or relevant details…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Priority</label>
                <div className="flex gap-2">
                  {(["High", "Medium", "Low"] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                        priority === p
                          ? p === "High"   ? "bg-rose-50 border-rose-300 text-rose-700"
                          : p === "Medium" ? "bg-amber-50 border-amber-300 text-amber-700"
                          :                  "bg-sky-50 border-sky-300 text-sky-700"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owner / Assignment */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">Assign to</label>
                <div className="flex gap-2">
                  {(["self", "queue"] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setOwnerMode(mode)}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                        ownerMode === mode
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {mode === "self" ? "Myself" : "A Queue"}
                    </button>
                  ))}
                </div>

                {ownerMode === "queue" && (
                  <div className="mt-2">
                    {queuesLoading ? (
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading queues…
                      </div>
                    ) : queues.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground">No case queues found in Salesforce.</p>
                    ) : (
                      <select
                        value={selectedQueue?.id ?? ""}
                        onChange={e => {
                          const q = queues.find(q => q.id === e.target.value) ?? null;
                          setSelectedQueue(q);
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Select a queue…</option>
                        {queues.map(q => (
                          <option key={q.id} value={q.id}>{q.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {ownerMode === "self" && (
                  <p className="text-[11px] text-muted-foreground">
                    The case will be owned by you in Salesforce.
                  </p>
                )}
              </div>

              {/* Contact lookup */}
              <LookupField
                label="Contact"
                types="Contact"
                placeholder="Search contacts…"
                value={contact}
                onChange={setContact}
              />

              {/* Account lookup */}
              <LookupField
                label="Account"
                types="Account"
                placeholder="Search accounts…"
                value={account}
                onChange={setAccount}
              />

              {/* Error */}
              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </form>
          )}

          {/* ── Step 3: Result ──────────────────────────────────────────────── */}
          {step === "result" && result && (
            <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
              {result.synced ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Case submitted</p>
                    {result.sfCaseNumber && (
                      <p className="text-[13px] text-muted-foreground mt-1">
                        Case #{result.sfCaseNumber} created in Salesforce
                      </p>
                    )}
                  </div>
                  {result.sfCaseId && (
                    <a
                      href={`https://salesforce.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors"
                    >
                      View in Salesforce
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Saved locally</p>
                    <p className="text-[13px] text-muted-foreground mt-1 max-w-[280px] mx-auto leading-relaxed">
                      {result.message ?? "Your case was saved and will sync to Salesforce when connectivity is restored."}
                    </p>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => { reset(); setStep("form"); void loadQueues(); }}
                className="mt-2 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Submit another case
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "form" && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                if (types.length > 1) { setStep("type"); }
                else { handleClose(); }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {types.length > 1 ? "Back" : "Cancel"}
            </button>
            <button
              form="case-form"
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Case
            </button>
          </div>
        )}

        {step === "result" && (
          <div className="flex items-center justify-end px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
