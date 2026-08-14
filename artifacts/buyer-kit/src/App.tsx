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

import { useEffect, useRef, useState } from "react";
import { type ReactNode } from "react";
import { Route, Switch, useParams, useLocation, Router as WouterRouter } from "wouter";
import qrcode from "qrcode-generator";
import { ErrorBoundary } from "@/components/error-boundary";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChangeEntry {
  date:        string;
  reason:      string;
  description: string;
}

interface BundleKit {
  assetId:        string;
  title:          string;
  downloadUrl:    string;
  status:         "available" | "pending";
  expectedMonth?: string;
}

interface Beat {
  name:      string;
  pageCount: number;
}

interface SharedInsert {
  title: string;
}

interface QREntry {
  title:      string;
  code:       string;
  scanStatus: "pending" | "passed";
}

interface TestDataFile {
  filename: string;
  edgeCase: string;
}

interface KitPageData {
  assetId:       string;
  seriesLabel:   string;
  kitTitle:      string;
  editionName:   string;
  contentTypes:  string[];
  purchaseDate:  string;
  audienceType:  "nonprofit" | "learner";
  changeLog:     ChangeEntry[];
  bundle:        BundleKit[] | null;
  beats:         Beat[];
  sharedInserts: SharedInsert[];
  qrCodes:       QREntry[];
  testDataFiles: TestDataFile[];
  licenseTerms:  string[];
}

type LoadState =
  | { status: "loading" }
  | { status: "ok";    data: KitPageData }
  | { status: "error"; code: number; message: string };

// ── API ───────────────────────────────────────────────────────────────────────

const API_ORIGIN = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

// ── Dev preview mock data (shown when ?preview=1) ────────────────────────────
// Lets designers verify the full page layout without a database token or a
// running API server.  Never shipped as production data.

const DEV_MOCK_DATA: KitPageData = {
  assetId:      "dev-preview",
  seriesLabel:  "Transition Trails Series",
  kitTitle:     "Nonprofit Leadership Transition Trail Kit",
  editionName:  "Spring 2025 Edition",
  contentTypes: ["Workbook", "Video Scripts", "Facilitator Guide", "Build With Me Sessions"],
  purchaseDate: "2025-02-14",
  audienceType: "nonprofit",
  changeLog: [
    {
      date:        "2025-04-10",
      reason:      "Corrected worksheet exercise numbering that caused confusion in group sessions",
      description: "Exercises 4 and 5 in the Decide section were out of order.  The content itself was not changed — only the numbering and the cross-references on pages 38 and 42.",
    },
    {
      date:        "2025-03-22",
      reason:      "Added a missing note about board approval timelines to the Launch section",
      description: "Several facilitated sessions surfaced a common question about how long board sign-off typically takes.  A one-page reference note has been added as a shared insert.",
    },
    {
      date:        "2025-03-05",
      reason:      "Replaced two broken Build With Me video links",
      description: "The QR codes for sessions 2 and 4 now point to the correct short links.  The videos themselves have not changed.",
    },
  ],
  bundle: [
    { assetId: "dev-preview",         title: "Nonprofit Leadership Transition Trail Kit", downloadUrl: "#", status: "available" },
    { assetId: "dev-companion",        title: "Board Readiness Companion Kit",              downloadUrl: "#", status: "available" },
    { assetId: "dev-future",           title: "Digital Compass Workbook",                   downloadUrl: "#", status: "pending", expectedMonth: "September 2025" },
  ],
  beats: [
    { name: "Why",       pageCount: 12 },
    { name: "Decide",    pageCount: 24 },
    { name: "Build",     pageCount: 38 },
    { name: "Verify",    pageCount: 16 },
    { name: "Next Step", pageCount: 10 },
  ],
  sharedInserts: [
    { title: "Board Approval Timeline Reference" },
    { title: "Stakeholder Communication Templates" },
    { title: "Legal Checklist for Nonprofit Transitions" },
    { title: "Glossary of Transition Terms" },
  ],
  qrCodes: [
    { title: "Build With Me — Session 1: Framing Your Why",     code: "bwm-nlt-s1", scanStatus: "passed"  },
    { title: "Build With Me — Session 2: Mapping Stakeholders", code: "bwm-nlt-s2", scanStatus: "passed"  },
    { title: "Build With Me — Session 3: Building the Plan",    code: "bwm-nlt-s3", scanStatus: "pending" },
    { title: "Build With Me — Session 4: Verifying Readiness",  code: "bwm-nlt-s4", scanStatus: "pending" },
  ],
  testDataFiles: [
    { filename: "test-small-org.csv",   edgeCase: "Organization with fewer than 5 staff — exercises that assume a full leadership team are flagged for adaptation" },
    { filename: "test-board-led.csv",   edgeCase: "Board-led transition where no executive director is involved — decision authority rows are remapped to committee chairs" },
    { filename: "test-multi-site.csv",  edgeCase: "Multi-site nonprofit where each location follows a different timeline — the shared Verify section is duplicated per site" },
  ],
  licenseTerms: [
    "Use this kit for one organization's transition process",
    "Print and distribute copies to your board, staff, and facilitation team",
    "Use the workbook exercises in facilitated sessions you lead",
    "Adapt the templates with your organization's name and context",
    "Store digital copies on your organization's internal systems",
  ],
};

async function fetchKitPage(token: string): Promise<KitPageData> {
  // Dev preview shortcut — no API call needed.
  if (token === "preview" && import.meta.env.DEV) {
    return DEV_MOCK_DATA;
  }

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

// ── Colour constants ───────────────────────────────────────────────────────────

const C = {
  teal:       "#2F6F7E",
  tealLight:  "#EDF5F8",
  tealBorder: "#C7DFE8",
  warmPaper:  "#FBF7F0",
  warmBorder: "#EDE4D3",
  amber:      "#F5A623",
  amberDark:  "#C47D0F",
  clay:       "#B4552D",
  charcoal:   "#2A2E2C",
  slate:      "#4A4F4D",
  muted:      "#7A8280",
  warmGray:   "#E2E4E1",
  bg:         "#FAFAF7",
  white:      "#FFFFFF",
  green:      "#2F6B3F",
  greenLight: "#E6F0EA",
  greenBorder:"#C2D9C8",
};

const POPPINS  = "'Poppins', system-ui, sans-serif";
const OPENSANS = "'Open Sans', system-ui, sans-serif";

// ── Shared typography helpers ─────────────────────────────────────────────────

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="font-semibold mb-1"
      style={{ fontSize: "24px", lineHeight: "1.3", color: C.charcoal, fontFamily: POPPINS }}
    >
      {children}
    </h2>
  );
}

function SectionSubtitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm mb-5 leading-relaxed" style={{ color: C.slate, fontFamily: OPENSANS }}>
      {children}
    </p>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function KitHeader() {
  return (
    <header
      style={{ backgroundColor: C.teal, height: "60px" }}
      className="flex items-center px-6 shrink-0"
    >
      <span
        className="text-white text-lg font-semibold tracking-tight"
        style={{ fontFamily: POPPINS }}
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
          fontFamily:      OPENSANS,
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
      style={{ backgroundColor: C.tealLight, border: `1px solid ${C.tealBorder}` }}
    >
      <div className="flex items-start gap-4">
        <div
          className="mt-0.5 shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
          style={{ backgroundColor: C.teal }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div>
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: C.teal, fontFamily: POPPINS }}
          >
            This is your personal kit link — no password required
          </p>
          <p className="text-sm leading-relaxed" style={{ color: C.slate }}>
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
      style={{ backgroundColor: C.warmPaper, border: `1px solid ${C.warmBorder}` }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: C.clay, fontFamily: OPENSANS }}
      >
        {data.seriesLabel}
      </p>

      <h1
        className="font-semibold mb-2"
        style={{ fontSize: "32px", lineHeight: "1.25", color: C.charcoal, fontFamily: POPPINS }}
      >
        {data.kitTitle}
      </h1>

      <p className="text-sm mb-6" style={{ color: C.slate }}>
        {data.editionName}
      </p>

      <div className="flex flex-wrap gap-2">
        {data.contentTypes.map((type) => (
          <span
            key={type}
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ backgroundColor: C.warmBorder, color: "#6B4226" }}
          >
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Section 3 — Updated since you bought it ───────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function UpdatesSection({ data }: { data: KitPageData }) {
  const sinceDate = new Date(data.purchaseDate + "T00:00:00Z");
  const changes = data.changeLog.filter((c) => new Date(c.date + "T00:00:00Z") > sinceDate);

  return (
    <section>
      <SectionHeading>Updated since you bought it</SectionHeading>
      <SectionSubtitle>
        Purchased {formatDate(data.purchaseDate)} — changes made after that date are listed below.
      </SectionSubtitle>

      {changes.length === 0 ? (
        <div
          className="rounded-lg px-6 py-5 text-sm"
          style={{ backgroundColor: C.tealLight, border: `1px solid ${C.tealBorder}`, color: C.slate }}
        >
          No updates have been made since your purchase.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {changes.map((entry, i) => (
            <div
              key={i}
              className="rounded-lg px-6 py-4"
              style={{ backgroundColor: C.white, border: `1px solid ${C.warmGray}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold"
                  style={{ color: C.teal, fontFamily: OPENSANS }}
                >
                  {formatDate(entry.date)}
                </span>
              </div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: C.charcoal, fontFamily: POPPINS }}
              >
                {entry.reason}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: C.slate }}>
                {entry.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Teal closing band */}
      <div
        className="rounded-lg px-6 py-4 mt-4 flex items-start gap-3"
        style={{ backgroundColor: C.tealLight, border: `1px solid ${C.tealBorder}` }}
      >
        <div
          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
          style={{ backgroundColor: C.teal }}
          aria-hidden="true"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: C.teal }}>
          <strong>Printed copies still work.</strong>{" "}
          Every QR code in your kit points to a short link that Transition Trails controls.
          When content changes, we update what the link points to — not the link itself.
          Your printed pages stay current automatically.
        </p>
      </div>
    </section>
  );
}

// ── Section 4 — The rest of your bundle ───────────────────────────────────────

function BundleSection({ data }: { data: KitPageData }) {
  if (!data.bundle || data.bundle.length <= 1) return null;

  // Show all bundle items except the current kit (which is already shown in section 2)
  const otherKits = data.bundle.filter((k) => k.assetId !== data.assetId);

  return (
    <section>
      <SectionHeading>The rest of your bundle</SectionHeading>
      <SectionSubtitle>
        Your purchase included the kits below. Download any time — there is no expiry on your access.
      </SectionSubtitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {otherKits.map((kit) =>
          kit.status === "available" ? (
            <div
              key={kit.assetId}
              className="rounded-lg px-6 py-5 flex flex-col gap-4"
              style={{ backgroundColor: C.warmPaper, border: `1px solid ${C.warmBorder}` }}
            >
              <div className="flex-1">
                <p
                  className="font-semibold text-sm"
                  style={{ color: C.charcoal, fontFamily: POPPINS }}
                >
                  {kit.title}
                </p>
                <p className="text-xs mt-1" style={{ color: C.muted }}>
                  Available now
                </p>
              </div>
              <a
                href={kit.downloadUrl}
                download
                className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold self-start transition-colors"
                style={{
                  backgroundColor: C.amber,
                  color:           C.charcoal,
                  fontFamily:      OPENSANS,
                  textDecoration:  "none",
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = C.amberDark; (e.currentTarget as HTMLAnchorElement).style.color = C.white; }}
                onMouseOut={(e)  => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = C.amber; (e.currentTarget as HTMLAnchorElement).style.color = C.charcoal; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download kit
              </a>
            </div>
          ) : (
            <div
              key={kit.assetId}
              className="rounded-lg px-6 py-5 flex flex-col gap-2"
              style={{
                backgroundColor: C.bg,
                border:          `1.5px dashed ${C.warmGray}`,
              }}
            >
              <p
                className="font-semibold text-sm"
                style={{ color: C.slate, fontFamily: POPPINS }}
              >
                {kit.title}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                Coming {kit.expectedMonth ?? "soon"} — included in your bundle at no extra charge
              </p>
            </div>
          )
        )}
      </div>
    </section>
  );
}

// ── Section 5 — What is inside ────────────────────────────────────────────────

function ContentsSection({ data }: { data: KitPageData }) {
  return (
    <section>
      <SectionHeading>What is inside</SectionHeading>
      <SectionSubtitle>
        Your kit follows a five-beat structure. Each beat builds on the last.
      </SectionSubtitle>

      {/* Five-beat spine */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 mb-6">
        {data.beats.map((beat, i) => (
          <div
            key={beat.name}
            className="rounded-lg px-4 py-4 flex flex-col items-center text-center gap-1"
            style={{ backgroundColor: C.warmPaper, border: `1px solid ${C.warmBorder}` }}
          >
            <span
              className="text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mb-1"
              style={{ backgroundColor: C.teal, color: C.white, fontFamily: OPENSANS }}
            >
              {i + 1}
            </span>
            <p
              className="text-sm font-semibold"
              style={{ color: C.charcoal, fontFamily: POPPINS }}
            >
              {beat.name}
            </p>
            <p className="text-xs" style={{ color: C.muted }}>
              {beat.pageCount} pages
            </p>
          </div>
        ))}
      </div>

      {/* Shared inserts */}
      {data.sharedInserts.length > 0 && (
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: C.clay, fontFamily: OPENSANS }}
          >
            Shared inserts
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {data.sharedInserts.map((insert) => (
              <span
                key={insert.title}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ backgroundColor: C.tealLight, color: C.teal, border: `1px solid ${C.tealBorder}` }}
              >
                {insert.title}
              </span>
            ))}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
            Shared inserts appear in more than one kit. Correcting one insert updates every kit
            that contains it — you always get the most accurate version when you open this page.
          </p>
        </div>
      )}
    </section>
  );
}

// ── QRCode component ──────────────────────────────────────────────────────────

function QRCodeDisplay({ url, size = 140 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();

    const count = qr.getModuleCount();
    const cellSize = size / count;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillStyle = "#2A2E2C";
          ctx.fillRect(
            Math.floor(col * cellSize),
            Math.floor(row * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize),
          );
        }
      }
    }
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated", borderRadius: "6px" }}
      aria-label={`QR code for ${url}`}
    />
  );
}

// ── Section 6 — Build With Me QRs and test data ───────────────────────────────

function QRSection({ data }: { data: KitPageData }) {
  return (
    <section>
      <SectionHeading>Build With Me videos</SectionHeading>
      <SectionSubtitle>
        Scan a code to open the session video on your phone or tablet. Each code goes to a short
        link Transition Trails controls — the code itself never changes.
      </SectionSubtitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.qrCodes.map((entry) => {
          const url = `https://transitiontrails.org/go/${entry.code}`;
          const passed = entry.scanStatus === "passed";
          return (
            <div
              key={entry.code}
              className="rounded-lg p-5 flex flex-col gap-4"
              style={{ backgroundColor: C.white, border: `1px solid ${C.warmGray}` }}
            >
              <div className="flex gap-4 items-start">
                <div
                  className="rounded-lg p-2 shrink-0"
                  style={{ backgroundColor: C.warmPaper, border: `1px solid ${C.warmBorder}` }}
                >
                  <QRCodeDisplay url={url} size={120} />
                </div>
                <div className="flex flex-col gap-2 justify-between flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{ color: C.charcoal, fontFamily: POPPINS }}
                  >
                    {entry.title}
                  </p>
                  <div>
                    <p className="text-xs mb-2" style={{ color: C.muted }}>
                      {url}
                    </p>
                    {/* Scan-test status chip — always carries a word, never color alone */}
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={
                        passed
                          ? { backgroundColor: C.greenLight, color: C.green, border: `1px solid ${C.greenBorder}` }
                          : { backgroundColor: "#FFF8EC", color: "#8B6014", border: "1px solid #F5D88A" }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: passed ? C.green : C.amber }}
                        aria-hidden="true"
                      />
                      {passed ? "Scan test: Passed" : "Scan test: Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test data */}
      <div className="mt-6">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: C.clay, fontFamily: OPENSANS }}
        >
          Test data files
        </p>
        <p className="text-xs leading-relaxed mb-4" style={{ color: C.muted }}>
          These CSV files let facilitators stress-test the worksheet exercises before a session.
          Each file covers a specific edge case.
        </p>
        <div className="flex flex-col gap-2">
          {data.testDataFiles.map((file) => (
            <div
              key={file.filename}
              className="rounded-lg px-4 py-3 flex items-start gap-3"
              style={{ backgroundColor: C.warmPaper, border: `1px solid ${C.warmBorder}` }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={C.clay} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="mt-0.5 shrink-0" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div>
                <p
                  className="text-xs font-semibold mb-0.5"
                  style={{ color: C.charcoal, fontFamily: OPENSANS }}
                >
                  {file.filename}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: C.slate }}>
                  {file.edgeCase}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section 7 — License and what this kit does not do ─────────────────────────

function LicenseSection({ data }: { data: KitPageData }) {
  return (
    <section>
      <SectionHeading>Your license and what this kit does not do</SectionHeading>
      <SectionSubtitle>
        Understanding both halves helps you get the most from your kit.
      </SectionSubtitle>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* License card — what you may do */}
        <div
          className="rounded-lg px-6 py-5"
          style={{ backgroundColor: C.warmPaper, border: `1px solid ${C.warmBorder}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: C.green }}
              aria-hidden="true"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: C.charcoal, fontFamily: POPPINS }}>
              What your license covers
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {data.licenseTerms.map((term, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: C.slate }}>
                <span
                  className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: C.green }}
                  aria-hidden="true"
                />
                {term}
              </li>
            ))}
          </ul>
        </div>

        {/* Does not do card */}
        <div
          className="rounded-lg px-6 py-5"
          style={{ backgroundColor: C.white, border: `1px solid ${C.warmGray}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: C.warmBorder }}
              aria-hidden="true"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={C.clay} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: C.charcoal, fontFamily: POPPINS }}>
              What this kit does not do
            </p>
          </div>

          <p className="text-sm leading-relaxed mb-4" style={{ color: C.slate }}>
            This kit will not match your organization exactly — no kit can. It gives you a
            proven structure and the right questions to ask. The answers come from your team.
          </p>

          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.clay, fontFamily: OPENSANS }}>
            When you hit a gap
          </p>

          <div className="flex flex-col gap-3">
            <div
              className="rounded-md px-4 py-3"
              style={{ backgroundColor: C.tealLight, border: `1px solid ${C.tealBorder}` }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: C.teal, fontFamily: POPPINS }}>
                Gap is a subject
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.slate }}>
                A deeper Trail Kit exists for many specific transition subjects — board governance,
                finance handover, staff succession, and more. Each kit goes into the depth a
                general kit cannot.
              </p>
            </div>
            <div
              className="rounded-md px-4 py-3"
              style={{ backgroundColor: C.warmPaper, border: `1px solid ${C.warmBorder}` }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: C.charcoal, fontFamily: POPPINS }}>
                Gap is judgment about your organization
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.slate }}>
                The Digital Compass is a structured conversation — not a purchase. It helps
                your team surface and resolve the judgment calls the kit raises but cannot answer.
              </p>
            </div>
          </div>

          <p className="text-xs mt-4 leading-relaxed" style={{ color: C.muted }}>
            Either path starts with a conversation, not a purchase.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Section 8 — Digital Compass panel and support ─────────────────────────────

function SupportSection() {
  return (
    <section>
      <SectionHeading>Digital Compass and support</SectionHeading>
      <SectionSubtitle>
        The Digital Compass helps your team work through the judgment calls your kit raises.
        Support options are below.
      </SectionSubtitle>

      {/* Digital Compass panel */}
      <div
        className="rounded-lg px-6 py-6 mb-6"
        style={{ backgroundColor: C.tealLight, border: `1px solid ${C.tealBorder}` }}
      >
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: C.teal }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </div>
          <div className="flex-1">
            <p
              className="text-base font-semibold mb-2"
              style={{ color: C.charcoal, fontFamily: POPPINS }}
            >
              Digital Compass
            </p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: C.slate }}>
              A structured conversation process designed to surface and resolve the judgment calls
              that no kit can make for you. Transition Trails facilitators guide your team through
              the decisions specific to your organization — your context, your tradeoffs, your call.
            </p>
            <a
              href="mailto:compass@transitiontrails.org?subject=Digital Compass inquiry"
              className="inline-flex items-center gap-2 text-sm font-semibold rounded-md px-4 py-2 transition-colors"
              style={{
                backgroundColor: C.teal,
                color:           C.white,
                fontFamily:      OPENSANS,
                textDecoration:  "none",
              }}
            >
              Start a conversation
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Three support actions */}
      <div className="flex flex-col gap-3">
        {[
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            ),
            label:       "Request a new link",
            description: "If your link stops working or you lose access to your email, we can send a replacement.",
            href:        "mailto:support@transitiontrails.org?subject=Request new kit link",
            actionLabel: "Email support",
          },
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            ),
            label:       "Report a correction",
            description: "Found something wrong in the kit? Let us know and we will review it within two business days.",
            href:        "mailto:corrections@transitiontrails.org?subject=Kit correction report",
            actionLabel: "Send correction",
          },
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            ),
            label:       "Download invoice",
            description: "Need a copy of your receipt for expense reporting or records.",
            href:        "#",
            actionLabel: "Download PDF",
          },
        ].map((action) => (
          <div
            key={action.label}
            className="rounded-lg px-5 py-4 flex items-center gap-4"
            style={{ backgroundColor: C.white, border: `1px solid ${C.warmGray}` }}
          >
            <div
              className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: C.tealLight }}
            >
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: C.charcoal, fontFamily: POPPINS }}
              >
                {action.label}
              </p>
              <p className="text-xs leading-relaxed mt-0.5" style={{ color: C.slate }}>
                {action.description}
              </p>
            </div>
            <a
              href={action.href}
              className="shrink-0 text-xs font-semibold rounded-md px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: C.warmPaper,
                color:           C.teal,
                border:          `1px solid ${C.tealBorder}`,
                fontFamily:      OPENSANS,
                textDecoration:  "none",
                whiteSpace:      "nowrap",
              }}
            >
              {action.actionLabel}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Debug bundle toggle (dev / ?debug=1 only) ─────────────────────────────────

function DebugFooter({
  showBundle,
  onToggle,
}: {
  showBundle: boolean;
  onToggle: () => void;
}) {
  return (
    <footer
      className="mt-8 py-4 flex items-center justify-center gap-3 border-t"
      style={{ borderColor: C.warmGray }}
    >
      <label
        className="flex items-center gap-2 text-xs cursor-pointer select-none"
        style={{ color: C.muted, fontFamily: OPENSANS }}
      >
        <input
          type="checkbox"
          checked={showBundle}
          onChange={onToggle}
          className="w-3.5 h-3.5 cursor-pointer"
        />
        <span>
          Debug: show bundle sections{" "}
          <span
            className="px-1.5 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: C.warmPaper, color: C.clay }}
          >
            dev only
          </span>
        </span>
      </label>
    </footer>
  );
}

// ── Error page ────────────────────────────────────────────────────────────────

function ErrorPage({ code, message }: { code: number; message: string }) {
  const is404 = code === 404;
  return (
    <div
      style={{ minHeight: "100dvh", backgroundColor: C.bg }}
      className="flex flex-col items-center justify-center px-6"
    >
      <div
        className="max-w-md w-full text-center rounded-lg px-8 py-10"
        style={{ backgroundColor: C.white, border: `1px solid ${C.warmGray}`, boxShadow: "0 12px 28px rgba(42,46,44,0.10)" }}
      >
        <p
          className="text-5xl font-bold mb-4"
          style={{ color: C.teal, fontFamily: POPPINS }}
        >
          {code}
        </p>
        <h2
          className="text-lg font-semibold mb-3"
          style={{ fontFamily: POPPINS, color: C.charcoal }}
        >
          {is404 ? "Link not found" : "Something went wrong"}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: C.slate }}>
          {message}
        </p>
        {is404 && (
          <p className="text-xs mt-4" style={{ color: C.muted }}>
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
      style={{ minHeight: "100dvh", backgroundColor: C.bg }}
      className="flex flex-col"
      aria-busy="true"
      aria-label="Loading your kit…"
    >
      <div style={{ backgroundColor: C.teal, height: "60px" }} className="shrink-0" />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <p className="text-sm" style={{ color: C.muted }}>Loading your kit…</p>
        </div>
      </div>
    </div>
  );
}

// ── Kit page (valid token) ────────────────────────────────────────────────────

function useDebugMode(): boolean {
  const [isDebug, setIsDebug] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDebug(
      import.meta.env.DEV || params.get("debug") === "1",
    );
  }, []);
  return isDebug;
}

function KitPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [showBundle, setShowBundle] = useState(true);
  const isDebug = useDebugMode();

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

  const { data } = state;

  // When the debug toggle overrides showBundle to false, pass null bundle so
  // BundleSection omits itself — simulating a single-kit buyer.
  const effectiveData: KitPageData = {
    ...data,
    bundle: showBundle ? data.bundle : null,
  };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: C.bg }} className="flex flex-col">
      <KitHeader />
      <main className="flex-1 w-full mx-auto px-4 py-8" style={{ maxWidth: "960px" }}>
        <div className="flex flex-col gap-10">
          {/* Section 1 */}
          <MagicLinkNotice />

          {/* Section 2 */}
          <KitPanel data={data} />

          {/* Section 3 */}
          <UpdatesSection data={data} />

          {/* Section 4 — conditional on showBundle */}
          <BundleSection data={effectiveData} />

          {/* Section 5 */}
          <ContentsSection data={data} />

          {/* Section 6 */}
          <QRSection data={data} />

          {/* Section 7 */}
          <LicenseSection data={data} />

          {/* Section 8 */}
          <SupportSection />
        </div>

        {/* Debug toggle — only in dev or when ?debug=1 */}
        {isDebug && (
          <DebugFooter
            showBundle={showBundle}
            onToggle={() => setShowBundle((v) => !v)}
          />
        )}
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
        <Route path="/:token" component={KitPage} />
        <Route path="/">
          <ErrorPage
            code={400}
            message="No kit token was found in this URL.  Please use the link from your receipt email."
          />
        </Route>
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
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}
