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
  ExternalLink,
  LogOut,
  MessageSquare,
  Hash,
  Send,
  Loader2,
  AlertCircle,
  User,
  Search,
  Smile,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id:        string;
  type:      "im" | "mpim" | "channel";
  name:      string;
  isPrivate: boolean;
  userId?:   string;   // DM partner's Slack user ID — used for presence
}

interface Reaction {
  name:  string;
  count: number;
  users: string[];
}

interface Message {
  ts:        string;
  text:      string;
  userId:    string | null;
  userName:  string;
  isBot:     boolean;
  reactions: Reaction[];
}

interface SearchResult {
  ts:          string;
  text:        string;
  userId:      string | null;
  userName:    string;
  channelId?:  string;
  channelName?: string;
  permalink?:  string;
}

// Common emojis available in the reaction picker
const REACTION_EMOJIS: Array<{ emoji: string; name: string }> = [
  { emoji: "👍", name: "thumbsup" },
  { emoji: "❤️",  name: "heart" },
  { emoji: "😂", name: "joy" },
  { emoji: "🎉", name: "tada" },
  { emoji: "🤔", name: "thinking_face" },
  { emoji: "✅", name: "white_check_mark" },
];

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

/**
 * Typed fetch error that carries the HTTP status and the server-side error
 * code parsed from the JSON body (when available).  Callers can inspect
 * `err.code === "token_expired"` to show targeted reconnect prompts instead
 * of generic error strings.
 */
class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null) {
    super(`HTTP ${status}${code ? ` (${code})` : ""}`);
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = await res.clone().json() as { error?: string };
      code = body.error ?? null;
    } catch { /* ignore parse failure */ }
    throw new ApiError(res.status, code);
  }
  return res.json() as Promise<T>;
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method:      "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(res.status, null);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json" },
    body:        JSON.stringify(body),
  });
  if (!res.ok) {
    let code: string | null = null;
    try {
      const b = await res.clone().json() as { error?: string };
      code = b.error ?? null;
    } catch { /* ignore */ }
    throw new ApiError(res.status, code);
  }
  return res.json() as Promise<T>;
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  channelId,
  onReacted,
}: {
  msg:       Message;
  channelId: string | null;
  onReacted: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reacting,   setReacting]   = useState(false);

  const time = (() => {
    try {
      const d = new Date(parseFloat(msg.ts) * 1000);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch { return ""; }
  })();

  const handleReact = useCallback(async (emojiName: string) => {
    if (!channelId || reacting) return;
    setPickerOpen(false);
    setReacting(true);
    try {
      await apiPost(`/api/slack/conversations/${channelId}/messages/${msg.ts}/reactions`, { name: emojiName });
      onReacted();
    } catch { /* ignore — already_reacted is silent */ }
    finally { setReacting(false); }
  }, [channelId, msg.ts, reacting, onReacted]);

  return (
    <div className="flex flex-col gap-0.5 group relative">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-foreground leading-tight truncate max-w-[130px]">
          {msg.userName}
        </span>
        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{time}</span>
        {channelId && (
          <button
            onClick={() => setPickerOpen(o => !o)}
            className="opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-all"
            title="Add reaction"
          >
            <Smile className="w-3 h-3" />
          </button>
        )}
      </div>

      <p className="text-[12px] text-foreground leading-relaxed break-words whitespace-pre-wrap">
        {msg.text}
      </p>

      {/* Existing reactions */}
      {msg.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {msg.reactions.map(r => (
            <button
              key={r.name}
              onClick={() => void handleReact(r.name)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted/40 hover:bg-primary/10 border border-border text-[11px] transition-colors"
              title={`:${r.name}:`}
            >
              <span>{REACTION_EMOJIS.find(e => e.name === r.name)?.emoji ?? "🙂"}</span>
              <span className="text-muted-foreground ml-0.5">{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {pickerOpen && (
        <div className="absolute right-0 top-5 z-20 bg-white border border-border rounded-lg shadow-lg p-1.5 flex gap-0.5">
          {REACTION_EMOJIS.map(({ emoji, name }) => (
            <button
              key={name}
              onClick={() => void handleReact(name)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted/40 text-base leading-none transition-colors"
              title={`:${name}:`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConvItem({
  conv,
  selected,
  onSelect,
  presence,
}: {
  conv:      Conversation;
  selected:  boolean;
  onSelect:  () => void;
  presence?: "active" | "away";
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md transition-colors ${
        selected
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      }`}
    >
      {conv.type === "channel" ? (
        <Hash className={`w-3 h-3 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground/60"}`} />
      ) : (
        <span className="relative flex-shrink-0 w-3 h-3">
          <span className={`absolute inset-0 rounded-full border-2 ${selected ? "border-primary bg-primary/20" : "border-muted-foreground/40"}`} />
          {presence && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white ${presence === "active" ? "bg-green-500" : "bg-muted-foreground/30"}`} />
          )}
        </span>
      )}
      <span className={`truncate text-[12px] leading-tight ${selected ? "font-semibold" : "font-normal"}`}>
        {conv.name}
      </span>
    </button>
  );
}

// ── Collapsible section ────────────────────────────────────────────────────────

function ConvSection({
  label,
  icon,
  items,
  selectedId,
  onSelect,
  defaultOpen = true,
  presenceMap,
}: {
  label:        string;
  icon:         React.ReactNode;
  items:        Conversation[];
  selectedId:   string | null;
  onSelect:     (conv: Conversation) => void;
  defaultOpen?: boolean;
  presenceMap?: Map<string, "active" | "away">;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/20 transition-colors group"
      >
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground/50 flex-shrink-0 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
        <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase flex-1 text-left">
          {icon}{label}
        </span>
        <span className="text-[10px] text-muted-foreground/40">{items.length}</span>
      </button>
      {open && (
        <div className="pl-1 pr-1 pb-0.5 flex flex-col gap-0.5">
          {items.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              selected={selectedId === conv.id}
              onSelect={() => onSelect(conv)}
              presence={conv.userId ? presenceMap?.get(conv.userId) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Token-expired state ───────────────────────────────────────────────────────

/**
 * Shown when the panel has a stored connection but the Slack API rejects the
 * token (revoked, expired, or account deactivated).  Distinct from the first-
 * time "Connect Slack" screen so staff understand they need to RE-connect, not
 * connect for the first time.
 */
function TokenExpiredView({
  returnPath,
  onReconnected,
}: {
  returnPath:   string;
  onReconnected: () => void;
}) {
  const authorizeUrl = `${BASE}/api/slack/oauth/authorize?return=${encodeURIComponent(returnPath)}`;

  const handleReconnect = useCallback(() => {
    const popup = window.open(
      authorizeUrl,
      "slack-oauth",
      "width=620,height=720,scrollbars=yes,resizable=yes",
    );

    if (!popup) {
      window.open(authorizeUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        onReconnected();
      }
    }, 600);
  }, [authorizeUrl, onReconnected]);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
      <SlackIcon size={40} />
      <div>
        <p className="text-sm font-semibold text-foreground">Reconnect your Slack account</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Your Slack session has expired or been revoked. Sign in again to restore access.
        </p>
      </div>
      <button
        onClick={handleReconnect}
        className="flex items-center gap-2 rounded-lg bg-[#4A154B] px-4 py-2 text-white text-sm font-medium hover:bg-[#611f69] transition-colors"
      >
        <SlackIcon size={16} />
        Reconnect Slack
      </button>
      <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
        Your previous Slack connection is no longer active.
      </p>
    </div>
  );
}

// ── Unconnected state ─────────────────────────────────────────────────────────

function UnconnectedView({
  returnPath,
  onConnected,
}: {
  returnPath:  string;
  onConnected: () => void;
}) {
  // Use the homebase page itself as the OAuth return destination so the
  // callback lands somewhere the panel can detect ?slackOAuth=connected.
  const authorizeUrl = `${BASE}/api/slack/oauth/authorize?return=${encodeURIComponent(returnPath)}`;

  const handleConnect = useCallback(() => {
    // Open in a popup so the original tab's panel auto-refreshes on completion.
    const popup = window.open(
      authorizeUrl,
      "slack-oauth",
      "width=620,height=720,scrollbars=yes,resizable=yes",
    );

    if (!popup) {
      // Popup blocked (e.g. strict browser settings) — open in a new tab.
      window.open(authorizeUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Poll until the popup closes, then re-check connection status.
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        onConnected();
      }
    }, 600);
  }, [authorizeUrl, onConnected]);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
      <SlackIcon size={40} />
      <div>
        <p className="text-sm font-semibold text-foreground">Connect Slack</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Sign in with Slack to read your channels and DMs without leaving Trail OS.
        </p>
      </div>
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 rounded-lg bg-[#4A154B] px-4 py-2 text-white text-sm font-medium hover:bg-[#611f69] transition-colors"
      >
        <SlackIcon size={16} />
        Connect Slack
      </button>
      <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
        Messages you send here post as you — not as a bot.
      </p>
    </div>
  );
}

// ── Search result row ─────────────────────────────────────────────────────────

function SearchResultRow({
  result,
  onSelectChannel,
}: {
  result:          SearchResult;
  onSelectChannel: (channelId: string, channelName: string) => void;
}) {
  const time = (() => {
    try {
      const d = new Date(parseFloat(result.ts) * 1000);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch { return ""; }
  })();

  const handleClick = () => {
    if (result.channelId) {
      onSelectChannel(result.channelId, result.channelName ?? result.channelId);
    } else if (result.permalink) {
      window.open(result.permalink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-3 py-2.5 hover:bg-muted/20 transition-colors flex flex-col gap-0.5"
    >
      <div className="flex items-center gap-1.5">
        {result.channelName ? (
          <span className="text-[10px] font-semibold text-primary flex items-center gap-0.5">
            <Hash className="w-2.5 h-2.5" />{result.channelName}
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-muted-foreground">DM</span>
        )}
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{time}</span>
      </div>
      <p className="text-[11px] font-medium text-foreground leading-none">{result.userName}</p>
      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{result.text}</p>
    </button>
  );
}

// ── Connected panel content ───────────────────────────────────────────────────

function ConnectedView({
  teamName,
  onDisconnect,
  onTokenExpired,
  expanded,
}: {
  teamName:       string | null;
  onDisconnect:   () => void;
  onTokenExpired: () => void;
  expanded:       boolean;
}) {
  // ── Conversation list ─────────────────────────────────────────────────────
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [convLoading,    setConvLoading]    = useState(true);
  const [convError,      setConvError]      = useState<string | null>(null);
  const [selectedConv,   setSelectedConv]   = useState<Conversation | null>(null);

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [msgLoading,     setMsgLoading]     = useState(false);
  const [msgError,       setMsgError]       = useState<string | null>(null);
  const [composeText,    setComposeText]    = useState("");
  const [sending,        setSending]        = useState(false);
  const [disconnecting,  setDisconnecting]  = useState(false);

  // ── Presence ──────────────────────────────────────────────────────────────
  const [presenceMap,    setPresenceMap]    = useState<Map<string, "active" | "away">>(new Map());

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchActive,   setSearchActive]   = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchResults,  setSearchResults]  = useState<SearchResult[]>([]);
  const [searchLoading,  setSearchLoading]  = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load conversation list on mount
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setConvLoading(true);
    setConvError(null);

    apiGet<{ conversations: Conversation[] }>("/api/slack/conversations")
      .then(data => {
        if (!cancelled) {
          setConversations(data.conversations);
          if (data.conversations.length > 0 && !selectedConv) {
            setSelectedConv(data.conversations[0] ?? null);
          }
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "token_expired") { onTokenExpired(); return; }
        setConvError("Could not load conversations.");
      })
      .finally(() => { if (!cancelled) setConvLoading(false); });

    return () => { cancelled = true; };
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch presence for DM partners once conversations load
  useEffect(() => {
    const dmConvs = conversations.filter(c => c.type === "im" && c.userId);
    if (dmConvs.length === 0) return;

    void Promise.allSettled(
      dmConvs.map(c =>
        apiGet<{ presence: string }>(`/api/slack/users/${c.userId!}/presence`)
          .then(({ presence }) => ({ userId: c.userId!, presence })),
      ),
    ).then(results => {
      setPresenceMap(prev => {
        const next = new Map(prev);
        for (const r of results) {
          if (r.status === "fulfilled") {
            next.set(r.value.userId, r.value.presence === "active" ? "active" : "away");
          }
        }
        return next;
      });
    });
  }, [conversations]);

  // Search — debounced 400 ms
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      apiGet<{ results: SearchResult[] }>(`/api/slack/search?q=${encodeURIComponent(q)}`)
        .then(data => setSearchResults(data.results))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchActive) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchActive]);

  // Load + poll messages when a conversation is selected
  const fetchMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setMsgLoading(true);
    setMsgError(null);
    try {
      const data = await apiGet<{ messages: Message[] }>(
        `/api/slack/conversations/${convId}/history?limit=30`,
      );
      setMessages([...data.messages].reverse());
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "token_expired") { onTokenExpired(); return; }
      setMsgError("Could not load messages.");
    } finally {
      setMsgLoading(false);
    }
  }, [onTokenExpired]);

  useEffect(() => {
    if (!selectedConv || !expanded) return;
    void fetchMessages(selectedConv.id);
    pollRef.current = setInterval(() => void fetchMessages(selectedConv.id, true), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConv, expanded, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!composeText.trim() || !selectedConv || sending) return;
    setSending(true);
    const text = composeText.trim();
    setComposeText("");
    try {
      await apiPost(`/api/slack/conversations/${selectedConv.id}/messages`, { text });
      await fetchMessages(selectedConv.id, true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "token_expired") {
        setComposeText(text); onTokenExpired(); return;
      }
      setComposeText(text);
    } finally {
      setSending(false);
    }
  }, [composeText, selectedConv, sending, fetchMessages, onTokenExpired]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try { await apiDelete("/api/slack/oauth/disconnect"); onDisconnect(); }
    finally { setDisconnecting(false); }
  };

  const closeSearch = () => { setSearchActive(false); setSearchQuery(""); setSearchResults([]); };

  const slackOpenUrl = selectedConv
    ? `https://slack.com/app_redirect?channel=${selectedConv.id}`
    : "https://slack.com";

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-border bg-white">
        {searchActive ? (
          <>
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="flex-1 text-[12px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
            />
            <button
              onClick={closeSearch}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title="Cancel search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <SlackIcon size={16} />
            <p className="text-[11px] font-semibold text-foreground leading-tight truncate flex-1 min-w-0">
              {teamName ?? "Slack"}
            </p>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setSearchActive(true)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                title="Search messages"
              >
                <Search className="w-3 h-3" />
              </button>
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
          </>
        )}
      </div>

      {/* ── Search results view ── */}
      {searchActive ? (
        <div className="flex-1 overflow-y-auto bg-white">
          {!searchQuery.trim() || searchQuery.trim().length < 2 ? (
            <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">
              Type at least 2 characters to search.
            </p>
          ) : searchLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">
              No results for &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {searchResults.map(r => (
                <SearchResultRow
                  key={`${r.channelId ?? "dm"}-${r.ts}`}
                  result={r}
                  onSelectChannel={(channelId) => {
                    const conv = conversations.find(c => c.id === channelId);
                    if (conv) { setSelectedConv(conv); closeSearch(); }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Conversation list ── */}
          <div
            className="flex-shrink-0 border-b border-border bg-white overflow-y-auto py-1.5 px-1.5"
            style={{ maxHeight: "45%" }}
          >
            {convLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : convError ? (
              <p className="text-[11px] text-destructive px-2 py-2">{convError}</p>
            ) : conversations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground px-2 py-2">No conversations found.</p>
            ) : (
              <>
                <ConvSection
                  label="Channels"
                  icon={<Hash className="w-3 h-3" />}
                  items={conversations.filter(c => c.type === "channel")}
                  selectedId={selectedConv?.id ?? null}
                  onSelect={setSelectedConv}
                  defaultOpen={true}
                />
                <ConvSection
                  label="Direct Messages"
                  icon={<User className="w-3 h-3" />}
                  items={conversations.filter(c => c.type === "im" || c.type === "mpim")}
                  selectedId={selectedConv?.id ?? null}
                  onSelect={setSelectedConv}
                  defaultOpen={true}
                  presenceMap={presenceMap}
                />
              </>
            )}
          </div>

          {/* ── Messages ── */}
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
              <p className="text-[11px] text-muted-foreground text-center pt-4">No messages yet.</p>
            ) : (
              messages.map(msg => (
                <MessageBubble
                  key={msg.ts}
                  msg={msg}
                  channelId={selectedConv.id}
                  onReacted={() => void fetchMessages(selectedConv.id, true)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Compose bar ── */}
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
        </>
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
  | { state: "connected"; teamName: string | null; slackUserId: string }
  | { state: "token_expired" };

export function SlimSlackPanel({ open, onToggle, returnPath }: SlimSlackPanelProps) {
  const [status, setStatus] = useState<ConnectionStatus>({ state: "loading" });

  const checkStatus = useCallback(() => {
    setStatus({ state: "loading" });
    apiGet<{ connected: boolean; teamName?: string; slackUserId?: string }>("/api/slack/oauth/status")
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

  // Collapsed icon — show muted icon for expired token too (needs re-auth)
  const collapsedIcon = status.state === "connected"
    ? <SlackIcon size={18} />
    : <SlackIcon size={18} muted />;

  const collapsedTitle =
    status.state === "connected" ? "Slack (connected)" :
    status.state === "token_expired" ? "Slack (reconnect required)" :
    "Connect Slack";

  return (
    <>
      {/* Collapsed strip — clicking anywhere here opens the panel */}
      {!open && (
        <button
          onClick={onToggle}
          className="w-full flex flex-col items-center gap-2 pt-3 pb-2 hover:bg-muted/20 transition-colors cursor-pointer"
          aria-label="Expand Slack panel"
          title={collapsedTitle}
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
              <UnconnectedView returnPath={returnPath} onConnected={checkStatus} />
            ) : status.state === "token_expired" ? (
              <TokenExpiredView returnPath={returnPath} onReconnected={checkStatus} />
            ) : (
              <ConnectedView
                teamName={status.teamName}
                onDisconnect={() => setStatus({ state: "unconnected" })}
                onTokenExpired={() => setStatus({ state: "token_expired" })}
                expanded={open}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
