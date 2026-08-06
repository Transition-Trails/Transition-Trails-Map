/**
 * VolunteersAdmin
 *
 * Staff-only page at /admin/volunteers.
 * Lists all volunteer_profiles rows with their current field values.
 * Each row opens an edit drawer where staff can set:
 *   - monthly_commitment_hours
 *   - case_limit
 *   - specialty
 *   - coordinator_name
 *   - coordinator_slack_id
 *   - volunteer_slack_channel
 *
 * Changes persist via PATCH /api/homebase/volunteer/profile/:email.
 * The Volunteer Homebase immediately reflects updated values on next load.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Users, Pencil, X, Save, RefreshCw, CheckCircle2,
  AlertTriangle, ChevronRight, UserCheck,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VolunteerProfile {
  userEmail:              string;
  monthlyCommitmentHours: number | null;
  caseLimit:              number | null;
  specialty:              string | null;
  coordinatorName:        string | null;
  coordinatorSlackId:     string | null;
  volunteerSlackChannel:  string | null;
  updatedAt:              string;
}

interface DraftForm {
  monthlyCommitmentHours: string;
  caseLimit:              string;
  specialty:              string;
  coordinatorName:        string;
  coordinatorSlackId:     string;
  volunteerSlackChannel:  string;
}

function emptyDraft(p: VolunteerProfile): DraftForm {
  return {
    monthlyCommitmentHours: p.monthlyCommitmentHours?.toString() ?? "",
    caseLimit:              p.caseLimit?.toString()              ?? "",
    specialty:              p.specialty                          ?? "",
    coordinatorName:        p.coordinatorName                   ?? "",
    coordinatorSlackId:     p.coordinatorSlackId                ?? "",
    volunteerSlackChannel:  p.volunteerSlackChannel             ?? "",
  };
}

function profileComplete(p: VolunteerProfile): boolean {
  return (
    p.monthlyCommitmentHours !== null &&
    p.specialty              !== null &&
    p.coordinatorName        !== null
  );
}

// ── Edit drawer ───────────────────────────────────────────────────────────────

interface EditDrawerProps {
  profile:  VolunteerProfile;
  onClose:  () => void;
  onSaved:  (updated: VolunteerProfile) => void;
}

function EditDrawer({ profile, onClose, onSaved }: EditDrawerProps) {
  const [draft,   setDraft]   = useState<DraftForm>(() => emptyDraft(profile));
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Re-initialise if the target profile changes
  useEffect(() => {
    setDraft(emptyDraft(profile));
    setError(null);
    setSuccess(false);
  }, [profile.userEmail]);

  function field(key: keyof DraftForm) {
    return {
      value: draft[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(d => ({ ...d, [key]: e.target.value })),
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const body: Record<string, unknown> = {
      specialty:             draft.specialty.trim()             || null,
      coordinatorName:       draft.coordinatorName.trim()       || null,
      coordinatorSlackId:    draft.coordinatorSlackId.trim()    || null,
      volunteerSlackChannel: draft.volunteerSlackChannel.trim() || null,
    };

    // Numeric fields — send null when blank
    if (draft.monthlyCommitmentHours.trim() === "") {
      body["monthlyCommitmentHours"] = null;
    } else {
      const n = Number(draft.monthlyCommitmentHours);
      if (!Number.isFinite(n) || n < 0) {
        setError("Monthly commitment must be a positive number.");
        setSaving(false);
        return;
      }
      body["monthlyCommitmentHours"] = Math.round(n);
    }

    if (draft.caseLimit.trim() === "") {
      body["caseLimit"] = null;
    } else {
      const n = Number(draft.caseLimit);
      if (!Number.isFinite(n) || n < 0) {
        setError("Case limit must be a positive number.");
        setSaving(false);
        return;
      }
      body["caseLimit"] = Math.round(n);
    }

    try {
      const res = await fetch(
        `/api/homebase/volunteer/profile/${encodeURIComponent(profile.userEmail)}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const d = await res.json() as { profile: VolunteerProfile };
      setSuccess(true);
      onSaved(d.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-xl border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
              Edit volunteer profile
            </p>
            <p className="text-sm font-semibold text-foreground truncate max-w-[260px]">
              {profile.userEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 px-5 py-5">
          <div className="flex flex-col gap-5">

            {/* Commitment & limit */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Commitment
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Monthly hours</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 8"
                    className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                    {...field("monthlyCommitmentHours")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Case limit</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="default 3"
                    className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                    {...field("caseLimit")}
                  />
                </label>
              </div>
            </section>

            {/* Specialty */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Specialty
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  What types of cases this volunteer handles best
                </span>
                <textarea
                  rows={3}
                  placeholder="e.g. Benefits navigation, housing assistance"
                  className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background resize-none"
                  {...field("specialty")}
                />
              </label>
            </section>

            {/* Coordinator */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Coordinator
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Coordinator name</span>
                  <input
                    type="text"
                    placeholder="e.g. Kim Nguyen"
                    className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                    {...field("coordinatorName")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Coordinator Slack ID</span>
                  <input
                    type="text"
                    placeholder="e.g. U01AB2CD3EF"
                    className="rounded-md border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                    {...field("coordinatorSlackId")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Volunteer Slack channel ID</span>
                  <input
                    type="text"
                    placeholder="e.g. C01AB2CD3EF"
                    className="rounded-md border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                    {...field("volunteerSlackChannel")}
                  />
                </label>
              </div>
            </section>

          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 flex flex-col gap-2">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Profile saved
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Profile row ───────────────────────────────────────────────────────────────

function ProfileRow({
  profile,
  onEdit,
}: {
  profile: VolunteerProfile;
  onEdit:  (p: VolunteerProfile) => void;
}) {
  const complete = profileComplete(profile);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 hover:border-primary/30 transition-colors">
      {/* Status dot */}
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${
          complete ? "bg-emerald-500" : "bg-amber-400"
        }`}
        title={complete ? "Profile complete" : "Profile incomplete"}
      />

      {/* Email + fields */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{profile.userEmail}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          <span className="text-[11px] text-muted-foreground">
            <span className="text-foreground/60">Hours:</span>{" "}
            {profile.monthlyCommitmentHours !== null
              ? `${profile.monthlyCommitmentHours} / mo`
              : <em className="text-amber-600">not set</em>}
          </span>
          <span className="text-[11px] text-muted-foreground">
            <span className="text-foreground/60">Cases:</span>{" "}
            {profile.caseLimit !== null ? profile.caseLimit : <em className="text-muted-foreground">default 3</em>}
          </span>
          <span className="text-[11px] text-muted-foreground">
            <span className="text-foreground/60">Specialty:</span>{" "}
            {profile.specialty
              ? <span className="text-foreground">{profile.specialty}</span>
              : <em className="text-amber-600">not set</em>}
          </span>
          <span className="text-[11px] text-muted-foreground">
            <span className="text-foreground/60">Coordinator:</span>{" "}
            {profile.coordinatorName
              ? <span className="text-foreground">{profile.coordinatorName}</span>
              : <em className="text-amber-600">not set</em>}
          </span>
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={() => onEdit(profile)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors flex-shrink-0"
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>
    </div>
  );
}

// ── VolunteersAdmin (exported) ────────────────────────────────────────────────

export default function VolunteersAdmin() {
  const [profiles,  setProfiles]  = useState<VolunteerProfile[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editing,   setEditing]   = useState<VolunteerProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/homebase/volunteer/profiles");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json() as { profiles: VolunteerProfile[] };
      setProfiles(d.profiles);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleSaved(updated: VolunteerProfile) {
    setProfiles(ps => ps.map(p => p.userEmail === updated.userEmail ? updated : p));
  }

  const complete   = profiles.filter(profileComplete).length;
  const incomplete = profiles.length - complete;

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Administration
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Volunteer Profiles</h1>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            Set commitment hours, specialty, and coordinator for each volunteer.
            These fields power the Volunteer Homebase commitment bar, specialty card, and coordinator contact.
          </p>
        </div>

        {/* Stats strip */}
        {!loading && !fetchError && profiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Total</p>
              <p className="text-xl font-semibold text-foreground">{profiles.length}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-1">Complete</p>
              <p className="text-xl font-semibold text-emerald-700">{complete}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">Needs setup</p>
              <p className="text-xl font-semibold text-amber-700">{incomplete}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading profiles…
          </div>
        ) : fetchError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load profiles</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fetchError}</p>
              <button
                onClick={load}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
            <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No volunteer profiles yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Profiles are created automatically when a volunteer signs in for the first time.
            </p>
          </div>
        ) : (
          <>
            {/* Incomplete first, then complete */}
            {[false, true].map(isComplete => {
              const group = profiles.filter(p => profileComplete(p) === isComplete);
              if (!group.length) return null;
              return (
                <div key={String(isComplete)} className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {isComplete ? "Complete" : "Needs setup"}
                      <span className="ml-1.5 text-muted-foreground/60 normal-case font-normal">
                        ({group.length})
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.map(p => (
                      <ProfileRow key={p.userEmail} profile={p} onEdit={setEditing} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Edit drawer */}
      {editing && (
        <EditDrawer
          profile={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { handleSaved(updated); }}
        />
      )}
    </div>
  );
}
