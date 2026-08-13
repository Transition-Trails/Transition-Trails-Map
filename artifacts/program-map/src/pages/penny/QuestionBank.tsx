/**
 * QuestionBank
 *
 * Admin page for managing skill assessment items.
 * Allows staff to view, create, edit, and delete questions in the
 * assessment_items table, organised by domain.
 *
 * Routes:
 *   GET    /api/assessments/items
 *   POST   /api/assessments/items
 *   PATCH  /api/assessments/items/:id
 *   DELETE /api/assessments/items/:id
 */

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, ChevronDown, ChevronRight, Pencil, Trash2,
  BookOpen, CheckCircle2, AlertTriangle, X, Loader2, Database,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface McOption { id: string; text: string }

interface AssessmentItem {
  id:             number;
  domain:         string;
  domainLabel:    string;
  domainWeight:   string;
  itemType:       string;
  question:       string;
  options:        McOption[] | null;
  correctOption:  string | null;
  rubric:         Record<string, unknown> | null;
  explanation:    string | null;
  weight:         string;
}

const ITEM_TYPES = [
  { value: "mc",          label: "Multiple Choice",  color: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "scenario",    label: "Scenario",         color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "build-check", label: "Build Check",      color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const OPTION_IDS = ["a", "b", "c", "d"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemTypeMeta(t: string) {
  return ITEM_TYPES.find(x => x.value === t) ?? { label: t, color: "bg-gray-50 text-gray-600 border-gray-200" };
}

function TypeBadge({ type }: { type: string }) {
  const m = itemTypeMeta(type);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${m.color}`}>
      {m.label}
    </span>
  );
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Empty domain state ─────────────────────────────────────────────────────────

const BLANK_FORM = {
  domain:        "",
  domainLabel:   "",
  domainWeight:  "0.125",
  itemType:      "mc",
  question:      "",
  options:       [
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
    { id: "d", text: "" },
  ] as McOption[],
  correctOption: "a",
  rubricText:    "",
  explanation:   "",
  weight:        "1",
};

type FormState = typeof BLANK_FORM;

// ── Item drawer ────────────────────────────────────────────────────────────────

function ItemDrawer({
  open,
  item,
  existingDomains,
  onClose,
  onSaved,
}: {
  open:            boolean;
  item:            AssessmentItem | null;
  existingDomains: { domain: string; domainLabel: string; domainWeight: string }[];
  onClose:         () => void;
  onSaved:         () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState<FormState>(BLANK_FORM);

  // Populate form when editing
  useEffect(() => {
    if (!open) return;
    if (item) {
      const opts: McOption[] = item.options?.length
        ? item.options
        : [{ id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" }];
      setForm({
        domain:        item.domain,
        domainLabel:   item.domainLabel,
        domainWeight:  item.domainWeight,
        itemType:      item.itemType,
        question:      item.question,
        options:        opts,
        correctOption: item.correctOption ?? "a",
        rubricText:    item.rubric ? JSON.stringify(item.rubric, null, 2) : "",
        explanation:   item.explanation ?? "",
        weight:        item.weight,
      });
    } else {
      setForm(BLANK_FORM);
    }
  }, [open, item]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function setOption(idx: number, text: string) {
    setForm(f => {
      const opts = [...f.options];
      opts[idx] = { ...opts[idx], text };
      return { ...f, options: opts };
    });
  }

  function pickDomain(slug: string) {
    const d = existingDomains.find(x => x.domain === slug);
    if (d) {
      set("domain",       d.domain);
      set("domainLabel",  d.domainLabel);
      set("domainWeight", d.domainWeight);
    } else {
      set("domain", slug);
    }
  }

  async function handleSave() {
    if (!form.domain || !form.domainLabel || !form.question.trim()) {
      toast({ variant: "destructive", title: "Missing required fields", description: "Domain, domain label, and question are required." });
      return;
    }

    setSaving(true);
    try {
      let rubric: unknown = null;
      if (form.itemType !== "mc" && form.rubricText.trim()) {
        try { rubric = JSON.parse(form.rubricText); } catch {
          toast({ variant: "destructive", title: "Invalid rubric JSON", description: "Fix the JSON syntax before saving." });
          setSaving(false);
          return;
        }
      }

      const body: Record<string, unknown> = {
        domain:        form.domain,
        domainLabel:   form.domainLabel,
        domainWeight:  form.domainWeight,
        itemType:      form.itemType,
        question:      form.question.trim(),
        explanation:   form.explanation.trim() || null,
        weight:        form.weight,
      };

      if (form.itemType === "mc") {
        body["options"]       = form.options.filter(o => o.text.trim());
        body["correctOption"] = form.correctOption;
        body["rubric"]        = null;
      } else {
        body["options"]       = null;
        body["correctOption"] = null;
        body["rubric"]        = rubric;
      }

      if (item) {
        await apiFetch(`/api/assessments/items/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ title: "Question updated" });
      } else {
        await apiFetch("/api/assessments/items", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Question created" });
      }

      onSaved();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Save failed", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 h-full w-full max-w-[560px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
              {item ? "Edit Question" : "New Question"}
            </p>
            <p className="text-base font-semibold">
              {item ? `Item #${item.id}` : "Question Bank"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">

            {/* Domain */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Domain *</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Slug (e.g. config-setup)</p>
                  <input
                    list="domain-slugs"
                    value={form.domain}
                    onChange={e => pickDomain(e.target.value)}
                    placeholder="config-setup"
                    className="w-full text-[13px] px-3 py-1.5 rounded-lg border outline-none focus:ring-1 focus:ring-primary"
                  />
                  <datalist id="domain-slugs">
                    {existingDomains.map(d => <option key={d.domain} value={d.domain} />)}
                  </datalist>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Label (display name)</p>
                  <input
                    value={form.domainLabel}
                    onChange={e => set("domainLabel", e.target.value)}
                    placeholder="Configuration and Setup"
                    className="w-full text-[13px] px-3 py-1.5 rounded-lg border outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground shrink-0">Domain weight (fraction, e.g. 0.125 = 12.5%)</p>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={form.domainWeight}
                  onChange={e => set("domainWeight", e.target.value)}
                  className="w-24 text-[13px] px-3 py-1.5 rounded-lg border outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Item type */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Item type *</label>
              <div className="flex gap-2">
                {ITEM_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("itemType", t.value)}
                    className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all ${
                      form.itemType === t.value ? t.color + " ring-2 ring-offset-1 ring-current/30" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Question *</label>
              <textarea
                rows={4}
                value={form.question}
                onChange={e => set("question", e.target.value)}
                placeholder="What does the Permission Set override on a User's profile?"
                className="w-full text-[13px] px-3 py-2 rounded-lg border outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* MC options */}
            {form.itemType === "mc" && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Answer options</label>
                <div className="space-y-2">
                  {OPTION_IDS.map((id, idx) => (
                    <div key={id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => set("correctOption", id)}
                        className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-[11px] font-bold transition-all ${
                          form.correctOption === id
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border text-muted-foreground hover:border-emerald-300"
                        }`}
                        title="Mark as correct"
                      >
                        {id.toUpperCase()}
                      </button>
                      <input
                        value={form.options[idx]?.text ?? ""}
                        onChange={e => setOption(idx, e.target.value)}
                        placeholder={`Option ${id.toUpperCase()}`}
                        className="flex-1 text-[13px] px-3 py-1.5 rounded-lg border outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Click the letter button to mark the correct answer (shown in green).</p>
              </div>
            )}

            {/* Rubric (scenario / build-check) */}
            {form.itemType !== "mc" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Rubric <span className="font-normal normal-case">(JSON)</span>
                </label>
                <textarea
                  rows={6}
                  value={form.rubricText}
                  onChange={e => set("rubricText", e.target.value)}
                  placeholder={form.itemType === "scenario"
                    ? '{\n  "criteria": "Learner must identify the correct data type and explain nillability",\n  "passingThreshold": 0.7\n}'
                    : '{\n  "verificationSteps": ["Check that the field exists", "Verify field-level security"]\n}'}
                  className="w-full text-[12px] font-mono px-3 py-2 rounded-lg border outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>
            )}

            {/* Explanation */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Explanation <span className="font-normal normal-case">(shown in debrief)</span></label>
              <textarea
                rows={3}
                value={form.explanation}
                onChange={e => set("explanation", e.target.value)}
                placeholder="Permission Sets extend (not override) profile settings. They add access but cannot restrict what a profile allows."
                className="w-full text-[13px] px-3 py-2 rounded-lg border outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* Weight */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Difficulty weight within domain</label>
              <div className="flex items-center gap-3">
                {["0.5", "1", "1.5", "2"].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => set("weight", w)}
                    className={`px-3 py-1 rounded-lg border text-[12px] font-medium transition-all ${
                      form.weight === w ? "bg-primary text-white border-primary" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {w === "0.5" ? "Easy (0.5)" : w === "1" ? "Normal (1)" : w === "1.5" ? "Hard (1.5)" : "Expert (2)"}
                  </button>
                ))}
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={form.weight}
                  onChange={e => set("weight", e.target.value)}
                  className="w-16 text-[12px] px-2 py-1 rounded-lg border outline-none text-center"
                />
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] rounded-lg border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {item ? "Save changes" : "Create question"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ item, onCancel, onDeleted }: { item: AssessmentItem; onCancel: () => void; onDeleted: () => void }) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/assessments/items/${item.id}`, { method: "DELETE" });
      toast({ title: "Question deleted" });
      onDeleted();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Delete failed", description: e instanceof Error ? e.message : String(e) });
      setDeleting(false);
    }
  }

  return (
    <div className="mx-4 my-2 rounded-xl border-2 border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-rose-800">Delete this question?</p>
        <p className="text-[11px] text-rose-600 mt-0.5 line-clamp-2">{item.question}</p>
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="px-3 py-1 text-[12px] rounded-lg border hover:bg-white transition-colors text-rose-700">
            Cancel
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="px-3 py-1 text-[12px] font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item:     AssessmentItem;
  onEdit:   (item: AssessmentItem) => void;
  onDelete: (item: AssessmentItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-white overflow-hidden transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 group"
      >
        <div className="mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <TypeBadge type={item.itemType} />
            <span className="text-[10px] text-muted-foreground font-medium">#{item.id}</span>
            <span className="text-[10px] text-muted-foreground">weight {item.weight}</span>
          </div>
          <p className="text-[13px] text-foreground leading-snug line-clamp-2">{item.question}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onEdit(item); }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(item); }}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/30 space-y-3">
          {/* MC options */}
          {item.itemType === "mc" && item.options != null && (
            <div className="space-y-1">
              {(item.options as McOption[]).map(o => (
                <div key={o.id} className={`flex items-start gap-2 text-[12px] ${o.id === item.correctOption ? "text-emerald-700 font-medium" : "text-muted-foreground"}`}>
                  <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border mt-0.5 ${o.id === item.correctOption ? "border-emerald-500 bg-emerald-50" : "border-border"}`}>
                    {o.id.toUpperCase()}
                  </span>
                  <span>{o.text}</span>
                  {o.id === item.correctOption && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          )}

          {/* Rubric */}
          {item.itemType !== "mc" && item.rubric != null && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Rubric</p>
              <pre className="text-[11px] font-mono text-muted-foreground bg-white rounded border p-2 overflow-auto max-h-32">
                {JSON.stringify(item.rubric, null, 2)}
              </pre>
            </div>
          )}

          {/* Explanation */}
          {item.explanation && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Explanation (shown in debrief)</p>
              <p className="text-[12px] text-foreground/80 leading-relaxed">{item.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QuestionBank() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search,        setSearch]        = useState("");
  const [domainFilter,  setDomainFilter]  = useState<string>("all");
  const [typeFilter,    setTypeFilter]    = useState<string>("all");
  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [editing,          setEditing]          = useState<AssessmentItem | null>(null);
  const [deleting,         setDeleting]         = useState<AssessmentItem | null>(null);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());

  function toggleDomain(domain: string) {
    setCollapsedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain); else next.add(domain);
      return next;
    });
  }

  function collapseAll() {
    setCollapsedDomains(new Set([...grouped.keys()]));
  }

  function expandAll() {
    setCollapsedDomains(new Set());
  }

  const { data, isLoading, error } = useQuery<{ items: AssessmentItem[] }>({
    queryKey: ["/api/assessments/items"],
    staleTime: 30_000,
  });

  const items = data?.items ?? [];

  // Derived domain list
  const domains = [...new Map(
    items.map(i => [i.domain, { domain: i.domain, domainLabel: i.domainLabel, domainWeight: i.domainWeight }])
  ).values()].sort((a, b) => a.domainLabel.localeCompare(b.domainLabel));

  // Filtered items
  const filtered = items.filter(i => {
    if (domainFilter !== "all" && i.domain !== domainFilter) return false;
    if (typeFilter !== "all" && i.itemType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!i.question.toLowerCase().includes(q) && !i.domainLabel.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Group by domain
  const grouped = new Map<string, { label: string; weight: string; items: AssessmentItem[] }>();
  for (const item of filtered) {
    if (!grouped.has(item.domain)) {
      grouped.set(item.domain, { label: item.domainLabel, weight: item.domainWeight, items: [] });
    }
    grouped.get(item.domain)!.items.push(item);
  }

  const totalWeight = domains.reduce((s, d) => s + Number(d.domainWeight), 0);
  const weightOk = Math.abs(totalWeight - 1) < 0.01;

  function handleSaved() {
    void queryClient.invalidateQueries({ queryKey: ["/api/assessments/items"] });
    setDrawerOpen(false);
    setEditing(null);
  }

  function handleDeleted() {
    void queryClient.invalidateQueries({ queryKey: ["/api/assessments/items"] });
    setDeleting(null);
  }

  function openCreate() { setEditing(null); setDrawerOpen(true); }
  function openEdit(item: AssessmentItem) { setEditing(item); setDrawerOpen(true); }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-muted-foreground" />
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Penny</p>
            </div>
            <h1 className="text-lg font-semibold font-serif">Question Bank</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {isLoading ? "Loading…" : `${items.length} question${items.length !== 1 ? "s" : ""} across ${domains.length} domain${domains.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New question
          </button>
        </div>

        {/* Domain weight warning */}
        {!isLoading && domains.length > 0 && !weightOk && (
          <div className="mt-3 flex items-center gap-2 text-[11px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Domain weights sum to {(totalWeight * 100).toFixed(1)}% — they should total 100%. Edit domain weights to balance.
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap shrink-0 bg-muted/20">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-lg border bg-white outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Domain filter */}
        <select
          value={domainFilter}
          onChange={e => setDomainFilter(e.target.value)}
          className="text-[13px] rounded-lg border px-3 py-1.5 bg-white outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All domains</option>
          {domains.map(d => (
            <option key={d.domain} value={d.domain}>{d.domainLabel}</option>
          ))}
        </select>

        {/* Type filter */}
        <div className="flex gap-1">
          {["all", ...ITEM_TYPES.map(t => t.value)].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all border ${
                typeFilter === t
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              {t === "all" ? "All types" : itemTypeMeta(t).label}
            </button>
          ))}
        </div>

        {filtered.length !== items.length && (
          <span className="text-[11px] text-muted-foreground">{filtered.length} shown</span>
        )}

        {/* Collapse / expand all */}
        {grouped.size > 1 && (
          <div className="flex gap-1 border-l pl-3 ml-1">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Expand all
            </button>
            <span className="text-muted-foreground/40 text-[11px]">·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading questions…
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 text-[13px]">
            Failed to load questions — {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3 text-muted-foreground">
            <BookOpen className="w-8 h-8 opacity-30" />
            <div>
              <p className="text-[14px] font-medium">No questions yet</p>
              <p className="text-[12px] mt-0.5">Create your first question to build the assessment bank.</p>
            </div>
            <button onClick={openCreate} className="mt-1 px-4 py-1.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors">
              New question
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {[...grouped.entries()].map(([domain, group]) => {
              const isCollapsed = collapsedDomains.has(domain);
              return (
                <div key={domain}>
                  {/* Domain header — clickable to collapse/expand */}
                  <button
                    type="button"
                    onClick={() => toggleDomain(domain)}
                    className="w-full flex items-center gap-3 mb-3 group text-left"
                  >
                    <div className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                      {isCollapsed
                        ? <ChevronRight className="w-4 h-4" />
                        : <ChevronDown  className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                          {group.label}
                        </h2>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">
                          {(Number(group.weight) * 100).toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {group.items.length} question{group.items.length !== 1 ? "s" : ""}
                          {isCollapsed && <span className="ml-1 text-muted-foreground/50">· collapsed</span>}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 font-mono">{domain}</p>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <>
                      {/* Delete confirm */}
                      {deleting && deleting.domain === domain && (
                        <div className="mb-2">
                          <DeleteConfirm
                            item={deleting}
                            onCancel={() => setDeleting(null)}
                            onDeleted={handleDeleted}
                          />
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-2">
                        {group.items.map(item => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            onEdit={openEdit}
                            onDelete={i => setDeleting(deleting?.id === i.id ? null : i)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Drawer */}
      <ItemDrawer
        open={drawerOpen}
        item={editing}
        existingDomains={domains}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
}
