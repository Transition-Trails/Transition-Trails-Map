/**
 * SlimSlackPanel
 *
 * Right-rail Slack panel for all Homebase pages.
 *
 * States:
 *   ─ loading    : checking connection status
 *   ─ unconnected: "Connect Slack" prompt (shows Slack logo + button)
 *   ─ connected  : conversation picker → message list → compose bar
 *
 * Collapsed width : 40px (icon strip + toggle chevron)
 * Expanded width  : 320px (managed by HomebaseShell's motion.div)
 *
 * Polling: message history is refreshed every 30 s while the panel is
 *          expanded and a conversation is selected.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LogOut,
  MessageSquare,
  Hash,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id:        string;
  type:      "im" | "mpim" | "channel";
  name:      string;
  isPrivate: boolean;
}

interface Message {
  ts:       string;
  text:     string;
  userId:   string | null;
  userName: string;
  isBot:    boolean;
}

// ── Slack wordmark SVG (official brand colours) ───────────────────────────────

function SlackIcon({ size = 20, muted = false }: { size?: number; muted?: boolean }) {
  if (muted) {
    return (
      <svg width={size} height={size} viewBox="0 0 54 54" fill="none">
        <rect width="54" height="54" rx="12" fill="#e5e7eb" />
        <text x="27" y="36" textAnchor="middle" fill="#9ca3af" fontSize="20" fontWeight="700">#</text>
      </svg>
    );
  }
  // Slack logo — four rounded-rectangle segments
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="54" height="54" rx="12" fill="white"/>
      {/* Green */}
      <path d="M20.5 33.5c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4h4v4z" fill="#2EB67D"/>
      <path d="M22.5 33.5c0-2.2 1.8-4 4-4s4 1.8 4 4v10c0 2.2-1.8 4-4 4s-4-1.8-4-4v-10z" fill="#2EB67D"/>
      {/* Yellow */}
      <path d="M26.5 20c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4v4h-4z" fill="#ECB22E"/>
      <path d="M26.5 22c2.2 0 4 1.8 4 4s-1.8 4-4 4h-10c-2.2 0-4-1.8-4-4s1.8-4 4-4h10z" fill="#ECB22E"/>
      {/* Red */}
      <path d="M39.5 26c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4h-4v-4z" fill="#E01E5A"/>
      <path d="M37.5 26c0 2.2-1.8 4-4 4s-4-1.8-4-4V16c0-2.2 1.8-4 4-4s4 1.8 4 4v10z" fill="#E01E5A"/>
      {/* Blue */}
      <path d="M33.5 39c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4v-4h4z" fill="#36C5F0"/>
      <path d="M33.5 37c-2.2 0-4-1.8-4-4s1.8-4 4-4h10c2.2 0 4 1.8 4 4s-1.8 4-4 4h-10z" fill="#36C5F0"/>
    </svg>
  );
}

// ── API helpers ───────────────────────────────────────────────────────────────

// Match the pattern used across all homebase hooks:
// BASE is the Vite base URL (e.g. /program-map) with trailing slash stripped.
const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method:      "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json" },
    body:        JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const time = (() => {
    try {
      const d = new Date(parseFloat(msg.ts) * 1000);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch { return ""; }
  })();

  return (
    <div className="flex flex-col gap-0.5 group">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-semibold text-foreground leading-tight truncate max-w-[140px]">
          {msg.userName}
        </span>
        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{time}</span>
      </div>
      <p className="text-[12px] text-foreground leading-relaxed break-words whitespace-pre-wrap">
        {msg.text}
      </p>
    </div>
  );
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConvItem({
  conv,
  selected,
  onSelect,
}: {
  conv:     Conversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const icon =
    conv.type === "channel" ? (
      <Hash className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
    ) : (
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
    );

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-md transition-colors text-sm ${
        selected
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      }`}
    >
      {icon}
      <span className="truncate text-[12px]">{conv.name}</span>
    </button>
  );
}

// ── Unconnected state ─────────────────────────────────────────────────────────

function UnconnectedView({ returnPath }: { returnPath: string }) {
  const authorizeUrl = `${BASE}/api/slack/oauth/authorize?return=${encodeURIComponent(returnPath)}`;

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
      <SlackIcon size={40} />
      <div>
        <p className="text-sm font-semibold text-foreground">Connect Slack</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Sign in with Slack to read your channels and DMs without leaving Trail OS.
        </p>
      </div>
      <a
        href={authorizeUrl}
        className="flex items-center gap-2 rounded-lg bg-[#4A154B] px-4 py-2 text-white text-sm font-medium hover:bg-[#611f69] transition-colors"
      >
        <SlackIcon size={16} />
        Connect Slack
      </a>
      <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
        Messages you send here post as you — not as a bot.
      </p>
    </div>
  );
}

// ── Connected panel content ───────────────────────────────────────────────────

function ConnectedView({
  teamName,
  onDisconnect,
  expanded,
}: {
  teamName:     string | null;
  onDisconnect: () => void;
  expanded:     boolean;
}) {
  const [conversations,     setConversations]     = useState<Conversation[]>([]);
  const [convLoading,       setConvLoading]       = useState(true);
  const [convError,         setConvError]         = useState<string | null>(null);
  const [selectedConv,      setSelectedConv]      = useState<Conversation | null>(null);
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [msgLoading,        setMsgLoading]        = useState(false);
  const [msgError,          setMsgError]          = useState<string | null>(null);
  const [composeText,       setComposeText]       = useState("");
  const [sending,           setSending]           = useState(false);
  const [disconnecting,     setDisconnecting]     = useState(false);
  const messagesEndRef                            = useRef<HTMLDivElement>(null);
  const pollRef                                   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load conversation list on mount
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setConvLoading(true);
    setConvError(null);

    apiGet<{ conversations: Conversation[] }>("/slack/conversations")
      .then(data => {
        if (!cancelled) {
          setConversations(data.conversations);
          if (data.conversations.length > 0 && !selectedConv) {
            setSelectedConv(data.conversations[0] ?? null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setConvError("Could not load conversations.");
      })
      .finally(() => {
        if (!cancelled) setConvLoading(false);
      });

    return () => { cancelled = true; };
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load + poll messages when a conversation is selected
  const fetchMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setMsgLoading(true);
    setMsgError(null);
    try {
      const data = await apiGet<{ messages: Message[] }>(
        `/slack/conversations/${convId}/history?limit=30`,
      );
      // API returns newest-first; reverse for chronological display
      setMessages([...data.messages].reverse());
    } catch {
      setMsgError("Could not load messages.");
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedConv || !expanded) return;

    void fetchMessages(selectedConv.id);

    // Poll every 30 s
    pollRef.current = setInterval(() => {
      void fetchMessages(selectedConv.id, true);
    }, 30_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedConv, expanded, fetchMessages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!composeText.trim() || !selectedConv || sending) return;
    setSending(true);
    const text = composeText.trim();
    setComposeText("");
    try {
      await apiPost(`/slack/conversations/${selectedConv.id}/messages`, { text });
      // Optimistically refresh messages
      await fetchMessages(selectedConv.id, true);
    } catch {
      // Put the text back if send failed
      setComposeText(text);
    } finally {
      setSending(false);
    }
  }, [composeText, selectedConv, sending, fetchMessages]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiDelete("/slack/oauth/disconnect");
      onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  const slackOpenUrl = selectedConv
    ? `https://slack.com/app_redirect?channel=${selectedConv.id}`
    : "https://slack.com";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <SlackIcon size={16} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground leading-tight truncate">
              {teamName ?? "Slack"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={slackOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="Open in Slack"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => void handleDisconnect()}
            disabled={disconnecting}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
            title="Disconnect Slack"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-shrink-0 border-b border-border bg-white max-h-[140px] overflow-y-auto py-1 px-1">
        {convLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : convError ? (
          <p className="text-[11px] text-destructive px-3 py-2">{convError}</p>
        ) : conversations.length === 0 ? (
          <p className="text-[11px] text-muted-foreground px-3 py-2">No conversations found.</p>
        ) : (
          conversations.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              selected={selectedConv?.id === conv.id}
              onSelect={() => setSelectedConv(conv)}
            />
          ))
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 bg-white">
        {!selectedConv ? (
          <p className="text-[11px] text-muted-foreground text-center pt-4">
            Select a conversation to see messages.
          </p>
        ) : msgLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : msgError ? (
          <div className="flex items-center gap-2 text-destructive text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {msgError}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center pt-4">
            No messages yet.
          </p>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.ts} msg={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose bar */}
      {selectedConv && (
        <div className="flex-shrink-0 border-t border-border bg-white px-2 py-2 flex items-end gap-1.5">
          <textarea
            value={composeText}
            onChange={e => setComposeText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message…"
            rows={2}
            className="flex-1 resize-none text-[12px] bg-muted/20 rounded-lg px-2.5 py-2 outline-none text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-primary/40 transition-colors"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!composeText.trim() || sending}
            className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex-shrink-0 mb-0.5"
            aria-label="Send"
          >
            {sending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ── SlimSlackPanel (exported) ─────────────────────────────────────────────────

interface SlimSlackPanelProps {
  open:       boolean;
  onToggle:   () => void;
  returnPath: string;
}

type ConnectionStatus =
  | { state: "loading" }
  | { state: "unconnected" }
  | { state: "connected"; teamName: string | null; slackUserId: string };

export function SlimSlackPanel({ open, onToggle, returnPath }: SlimSlackPanelProps) {
  const [status, setStatus] = useState<ConnectionStatus>({ state: "loading" });

  const checkStatus = useCallback(() => {
    setStatus({ state: "loading" });
    apiGet<{ connected: boolean; teamName?: string; slackUserId?: string }>("/slack/oauth/status")
      .then(data => {
        if (data.connected && data.slackUserId) {
          setStatus({ state: "connected", teamName: data.teamName ?? null, slackUserId: data.slackUserId });
        } else {
          setStatus({ state: "unconnected" });
        }
      })
      .catch(() => setStatus({ state: "unconnected" }));
  }, []);

  // Re-check connection status when the panel opens or when page query params change
  // (e.g. after OAuth callback redirect with ?slackOAuth=connected)
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Listen for OAuth callback return — the URL will have ?slackOAuth=connected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackOAuth = params.get("slackOAuth");
    if (slackOAuth === "connected") {
      checkStatus();
      // Clean up URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("slackOAuth");
      window.history.replaceState({}, "", url.toString());
    }
  }, [checkStatus]);

  // Collapsed icon
  const collapsedIcon = status.state === "connected"
    ? <SlackIcon size={18} />
    : <SlackIcon size={18} muted />;

  return (
    <>
      {/* Collapsed strip — clicking anywhere here opens the panel */}
      {!open && (
        <button
          onClick={onToggle}
          className="w-full flex flex-col items-center gap-2 pt-3 pb-2 hover:bg-muted/20 transition-colors cursor-pointer"
          aria-label="Expand Slack panel"
          title={status.state === "connected" ? "Slack (connected)" : "Connect Slack"}
        >
          {collapsedIcon}
          <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-muted-foreground" />
        </button>
      )}

      {/* Collapse chevron — shown when panel is open */}
      {open && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 border-b border-border text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors flex-shrink-0"
          aria-label="Collapse Slack panel"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {status.state === "loading" ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : status.state === "unconnected" ? (
              <UnconnectedView returnPath={returnPath} />
            ) : (
              <ConnectedView
                teamName={status.teamName}
                onDisconnect={() => setStatus({ state: "unconnected" })}
                expanded={open}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
