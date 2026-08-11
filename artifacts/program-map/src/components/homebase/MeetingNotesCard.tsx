/**
 * MeetingNotesCard
 *
 * Team Homebase (staff only) card that surfaces the current user's recent
 * Fathom meeting recordings.  Each staff member connects their own personal
 * Fathom API key — the card then lists their most-recent meetings with a
 * direct "Open notes" link.
 *
 * States:
 *   checking    — checking /api/fathom/status on mount
 *   connect     — not connected; inline form to enter the API key
 *   connecting  — PUT in flight
 *   loading     — connected; fetching meetings
 *   empty       — connected; no recordings found
 *   list        — connected; showing up to 10 meetings
 *   error       — Fathom API call failed
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Loader2, ExternalLink, Key, AlertCircle } from "lucide-react";
import { MeetingPopover } from "./MeetingPopover";
import type { FathomMeetingDetail } from "./MeetingPopover";

// ── Types ─────────────────────────────────────────────────────────────────────

// Re-export shape used throughout this file; includes summary + action_items
type FathomMeeting = FathomMeetingDetail;

type ViewState =
  | "checking"
  | "connect"
  | "connecting"
  | "loading"
  | "empty"
  | "list"
  | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  const hr   = Math.floor(diff / 3_600_000);
  const day  = Math.floor(diff / 86_400_000);
  if (min < 2)   return "Just now";
  if (min < 60)  return `${min}m ago`;
  if (hr  < 24)  return `${hr}h ago`;
  if (day < 7)   return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Meeting row ───────────────────────────────────────────────────────────────

function MeetingRow({ meeting }: { meeting: FathomMeeting }) {
  return (
    <MeetingPopover meeting={meeting}>
      <li className="flex items-start justify-between gap-2 py-2.5 border-b border-border/50 last:border-0 cursor-pointer rounded hover:bg-muted/30 transition-colors px-1 -mx-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug truncate">
            {meeting.title}
          </p>
          {meeting.started_at && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {relativeTime(meeting.started_at)}
            </p>
          )}
        </div>
        {meeting.share_url && (
          <a
            href={meeting.share_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors mt-0.5"
            title="Open meeting notes in Fathom"
          >
            Notes
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </li>
    </MeetingPopover>
  );
}

// ── MeetingNotesCard ──────────────────────────────────────────────────────────

export function MeetingNotesCard() {
  const [view,        setView]        = useState<ViewState>("checking");
  const [meetings,    setMeetings]    = useState<FathomMeeting[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [connectErr,  setConnectErr]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Status check on mount ──────────────────────────────────────────────────

  const checkStatus = useCallback(async () => {
    setView("checking");
    try {
      const res  = await fetch("/api/fathom/status");
      const data = await res.json() as { connected: boolean };
      if (data.connected) {
        setView("loading");
        void loadMeetings();
      } else {
        setView("connect");
      }
    } catch {
      setView("connect");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void checkStatus(); }, [checkStatus]);

  // Focus input when the connect form appears
  useEffect(() => {
    if (view === "connect") inputRef.current?.focus();
  }, [view]);

  // ── Load meetings ──────────────────────────────────────────────────────────

  const loadMeetings = useCallback(async () => {
    setView("loading");
    try {
      const res = await fetch("/api/fathom/meetings");
      if (res.status === 401) {
        // Key was revoked server-side
        setView("connect");
        return;
      }
      if (!res.ok) {
        setView("error");
        return;
      }
      const data = await res.json() as { meetings: FathomMeeting[] };
      setMeetings(data.meetings ?? []);
      setView(data.meetings?.length ? "list" : "empty");
    } catch {
      setView("error");
    }
  }, []);

  // ── Connect (save API key) ─────────────────────────────────────────────────

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKeyInput.trim();
    if (!key) return;
    setConnectErr(null);
    setView("connecting");

    try {
      const res  = await fetch("/api/fathom/key", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ apiKey: key }),
      });
      const data = await res.json() as { connected?: boolean; error?: string };

      if (res.ok && data.connected) {
        setApiKeyInput("");
        setView("loading");
        void loadMeetings();
      } else {
        setConnectErr(data.error ?? "Could not verify key. Please try again.");
        setView("connect");
      }
    } catch {
      setConnectErr("Network error. Please try again.");
      setView("connect");
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────

  async function handleDisconnect() {
    try {
      await fetch("/api/fathom/key", { method: "DELETE" });
    } catch { /* best-effort */ }
    setMeetings([]);
    setApiKeyInput("");
    setConnectErr(null);
    setView("connect");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Meeting Notes</span>
          {view === "list" && meetings.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {meetings.length}
            </span>
          )}
        </div>
        {(view === "list" || view === "empty") && (
          <a
            href="https://app.fathom.video"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Fathom →
          </a>
        )}
      </div>

      {/* Body */}
      <div className="px-4 flex-1">

        {/* Checking / loading */}
        {(view === "checking" || view === "loading") && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Connect form */}
        {(view === "connect" || view === "connecting") && (
          <form onSubmit={handleConnect} className="py-4 space-y-3">
            <div className="space-y-1">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Connect your Fathom account to see your recent meeting notes here.
              </p>
              <a
                href="https://app.fathom.video/settings/api-access"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
              >
                <Key className="w-3 h-3" />
                Get your API key
              </a>
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="Paste API key…"
                className="flex-1 min-w-0 text-[12px] border border-border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 disabled:opacity-50"
                disabled={view === "connecting"}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!apiKeyInput.trim() || view === "connecting"}
                className="flex-shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {view === "connecting" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Connect"
                )}
              </button>
            </div>

            {connectErr && (
              <div className="flex items-start gap-1.5 text-[11px] text-rose-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{connectErr}</span>
              </div>
            )}
          </form>
        )}

        {/* Meetings list */}
        {view === "list" && (
          <ul>
            {meetings.map((m, i) => (
              <MeetingRow key={m.id || `meeting-${i}`} meeting={m} />
            ))}
          </ul>
        )}

        {/* Empty */}
        {view === "empty" && (
          <div className="py-5 text-center">
            <p className="text-sm text-muted-foreground">No recordings yet.</p>
            <a
              href="https://app.fathom.video"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[12px] text-primary hover:text-primary/80 transition-colors"
            >
              Open Fathom →
            </a>
          </div>
        )}

        {/* Error */}
        {view === "error" && (
          <div className="py-4 space-y-1.5">
            <p className="text-[12px] text-muted-foreground">
              Couldn't load meeting notes.
            </p>
            <button
              onClick={() => void loadMeetings()}
              className="text-[12px] text-primary hover:text-primary/80 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Disconnect — shown when connected */}
        {(view === "list" || view === "empty") && (
          <div className="border-t border-border/40 py-2 mt-1">
            <button
              onClick={() => void handleDisconnect()}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Disconnect Fathom
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
