/**
 * App.tsx — Buyer Kit Page
 *
 * Standalone public-facing surface for Trail Kit buyers.
 * Token is read from the URL; the API validates it and returns kit data.
 * No Trail OS session required — the token is the credential.
 *
 * Routes (relative to BASE_PATH /buyer-kit/):
 *   /:token  — load and display the kit
 *   /        — missing token error
 *   *        — 404 fallback
 */

import { useEffect, useState } from "react";
import { type ReactNode } from "react";
import { Route, Switch, useParams, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KitPageData {
  assetId:      string;
  seriesLabel:  string;
  kitTitle:     string;
  editionName:  string;
  contentTypes: string[];
}

type LoadState =
  | { status: "loading" }
  | { status: "ok";    data: KitPageData }
  | { status: "error"; code: number; message: string };

// ── API ───────────────────────────────────────────────────────────────────────

// In development, VITE_API_URL is empty and requests go through the same
// origin (the Replit proxy routes /api to the API server).
const API_ORIGIN = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

async function fetchKitPage(token: string): Promise<KitPageData> {
  const res = await fetch(`${API_ORIGIN}/api/buyer/page/${encodeURIComponent(token)}`);
  if (!res.ok) {
    let message = "This link is invalid or has been removed.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // keep default
    }
    const err = new Error(message);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  const body = (await res.json()) as { ok: boolean; data: KitPageData };
  return body.data;
}

// ── Header ────────────────────────────────────────────────────────────────────

function KitHeader() {
  return (
    <header
      style={{ backgroundColor: "#2F6F7E", height: "60px" }}
      className="flex items-center px-6 shrink-0"
    >
      <span
        className="text-white text-lg font-semibold tracking-tight"
        style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
      >
        Transition Trails
      </span>
      <div className="flex-1" />
      <span
        className="text-xs font-medium px-3 py-1 rounded-full"
        style={{
          color:           "rgba(255,255,255,0.90)",
          border:          "1px solid rgba(255,255,255,0.30)",
          backgroundColor: "rgba(255,255,255,0.10)",
          fontFamily:      "'Open Sans', system-ui, sans-serif",
        }}
      >
        No account needed
      </span>
    </header>
  );
}

// ── Section 1 — Magic-link notice ─────────────────────────────────────────────

function MagicLinkNotice() {
  return (
    <section
      className="rounded-lg px-6 py-5"
      style={{ backgroundColor: "#EDF5F8", border: "1px solid #C7DFE8" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="mt-0.5 shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
          style={{ backgroundColor: "#2F6F7E" }}
          aria-hidden="true"
        >
          {/* Link / magic-link icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div>
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: "#2F6F7E", fontFamily: "'Poppins', system-ui, sans-serif" }}
          >
            This is your personal kit link — no password required
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#4A4F4D" }}>
            You can bookmark this page or come back using the link in your receipt email at
            any time, from any device. There is nothing to install and no account to manage.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Section 2 — Kit as an object ──────────────────────────────────────────────

function KitPanel({ data }: { data: KitPageData }) {
  return (
    <section
      className="rounded-lg px-8 py-7"
      style={{ backgroundColor: "#FBF7F0", border: "1px solid #EDE4D3" }}
    >
      {/* Series label — Clay colour only here */}
      <p
        className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: "#B4552D", fontFamily: "'Open Sans', system-ui, sans-serif" }}
      >
        {data.seriesLabel}
      </p>

      {/* Kit title — Poppins H1 32px */}
      <h1
        className="font-semibold mb-2"
        style={{
          fontSize:   "32px",
          lineHeight: "1.25",
          color:      "#2A2E2C",
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}
      >
        {data.kitTitle}
      </h1>

      {/* Edition */}
      <p className="text-sm mb-6" style={{ color: "#4A4F4D" }}>
        {data.editionName}
      </p>

      {/* Content type pills */}
      <div className="flex flex-wrap gap-2">
        {data.contentTypes.map((type) => (
          <span
            key={type}
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ backgroundColor: "#EDE4D3", color: "#6B4226" }}
          >
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Error page ────────────────────────────────────────────────────────────────

function ErrorPage({ code, message }: { code: number; message: string }) {
  const is404 = code === 404;
  return (
    <div
      style={{ minHeight: "100dvh", backgroundColor: "#FAFAF7" }}
      className="flex flex-col items-center justify-center px-6"
    >
      <div
        className="max-w-md w-full text-center rounded-lg px-8 py-10"
        style={{ backgroundColor: "#fff", border: "1px solid #E2E4E1", boxShadow: "0 12px 28px rgba(42,46,44,0.10)" }}
      >
        <p
          className="text-5xl font-bold mb-4"
          style={{ color: "#2F6F7E", fontFamily: "'Poppins', system-ui, sans-serif" }}
        >
          {code}
        </p>
        <h2
          className="text-lg font-semibold mb-3"
          style={{ fontFamily: "'Poppins', system-ui, sans-serif", color: "#2A2E2C" }}
        >
          {is404 ? "Link not found" : "Something went wrong"}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "#4A4F4D" }}>
          {message}
        </p>
        {is404 && (
          <p className="text-xs mt-4" style={{ color: "#7A8280" }}>
            If you believe this is an error, please check your receipt email for the
            correct link or contact Transition Trails support.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      style={{ minHeight: "100dvh", backgroundColor: "#FAFAF7" }}
      className="flex flex-col"
      aria-busy="true"
      aria-label="Loading your kit…"
    >
      <div style={{ backgroundColor: "#2F6F7E", height: "60px" }} className="shrink-0" />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke="#2F6F7E" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <p className="text-sm" style={{ color: "#7A8280" }}>Loading your kit…</p>
        </div>
      </div>
    </div>
  );
}

// ── Kit page (valid token) ────────────────────────────────────────────────────

function KitPage() {
  // wouter base strips /buyer-kit/, so useParams gives us the raw token
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({
        status:  "error",
        code:    400,
        message: "No token was provided.  Please use the link from your receipt email.",
      });
      return;
    }

    let cancelled = false;
    fetchKitPage(token)
      .then((data) => { if (!cancelled) setState({ status: "ok", data }); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number }).status ?? 500;
        const message = err instanceof Error
          ? err.message
          : "An unexpected error occurred.  Please try again.";
        setState({ status: "error", code: status, message });
      });

    return () => { cancelled = true; };
  }, [token]);

  if (state.status === "loading") return <LoadingSkeleton />;
  if (state.status === "error") return <ErrorPage code={state.code} message={state.message} />;

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FAFAF7" }} className="flex flex-col">
      <KitHeader />
      {/* 960px centered content column */}
      <main className="flex-1 w-full mx-auto px-4 py-8" style={{ maxWidth: "960px" }}>
        <div className="flex flex-col gap-6">
          <MagicLinkNotice />
          <KitPanel data={state.data} />
        </div>
      </main>
    </div>
  );
}

// ── Routed boundary ───────────────────────────────────────────────────────────

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

// ── Router ────────────────────────────────────────────────────────────────────

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Main kit page — token is a path param */}
        <Route path="/:token" component={KitPage} />

        {/* No token — show helpful error */}
        <Route path="/">
          <ErrorPage
            code={400}
            message="No kit token was found in this URL.  Please use the link from your receipt email."
          />
        </Route>

        {/* Catch-all */}
        <Route>
          <ErrorPage code={404} message="Page not found." />
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    // Strip trailing slash from BASE_PATH (/buyer-kit/) so wouter
    // matches /:token correctly at /buyer-kit/abc123.
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}
