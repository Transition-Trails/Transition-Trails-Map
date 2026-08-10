/**
 * homebaseCoachRoutes.test.ts
 *
 * Covers the coach-specific Homebase routes added in task #251:
 *
 *  Auth / audience guard
 *   1. All /homebase/coach/* routes → 401 when no session
 *   2. All /homebase/coach/* routes → 403 when audience is learner (not coach)
 *
 *  GET /api/homebase/coach/penny-prepared
 *   3. Returns { items: [], hasData: false } (Phase-1 stub)
 *
 *  GET /api/homebase/coach/artefacts
 *   4. Returns { items: [], hasData: false } (Phase-1 stub)
 *
 *  GET /api/homebase/coach/squad
 *   5. Returns { squads: [], hasData: false } (Phase-1 stub)
 *
 *  GET /api/homebase/coach/lead
 *   6. Returns sfUnavailable:true when SF not configured
 *   7. Returns linked:false when SF returns no Contact
 *   8. Returns linked:true with lead:null (Phase-1 stub) when Contact found
 *
 *  GET /api/homebase/coach/cases
 *   9. Returns sfUnavailable:true when SF not configured
 *  10. Returns linked:false when SF query returns no Contact
 *  11. Returns linked:true with cases when Contact and cases exist
 *  12. Returns 503 when SF Contact query returns an HTTP error
 *
 *  GET /api/auth/homebase/status
 *  13. Returns coachLevel:null when not set in session
 *  14. Returns coachLevel:'advanced' when set in session
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

// ── Session shim (same pattern as homebaseLearnerRoutes.test.ts) ──────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {};
  return { mockSession };
});

vi.mock("express-session", () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req["session"] = new Proxy(mockSession, {
      get(target, prop) {
        if (prop === "save")    return (cb?: () => void) => cb?.();
        if (prop === "destroy") return (cb?: () => void) => cb?.();
        return target[prop as string];
      },
      set(target, prop, value) { target[prop as string] = value; return true; },
    });
    next();
  },
}));

vi.mock("connect-pg-simple", () => ({
  default: () => class FakePgStore {
    get(_sid: string, cb: (err: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

vi.mock("@workspace/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })) })) })),
  },
}));

vi.mock("@workspace/db/schema", () => ({
  timeLogsTable: { id: "id", userEmail: "user_email", audience: "audience", activityLabel: "activity_label", hours: "hours", loggedAt: "logged_at" },
  coachProfilesTable: { userEmail: "user_email", coachLevel: "coach_level", updatedAt: "updated_at" },
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn(f => ({ __desc: f })),
  eq:   vi.fn().mockReturnValue({ __eq: true }),
  gte:  vi.fn().mockReturnValue({ __gte: true }),
}));

import app from "../app.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearSession() {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

const COACH_SESSION = {
  googleEmail:    "coach@transitiontrails.org",
  googleName:     "Kim Coach",
  googleAudience: "coach" as const,
  googleGroups:   [] as string[],
};

const LEARNER_SESSION = {
  googleEmail:    "learner@transitiontrails.org",
  googleName:     "Kim Learner",
  googleAudience: "learner" as const,
  googleGroups:   [] as string[],
};

const COACH_ROUTES_GET = [
  "/api/homebase/coach/penny-prepared",
  "/api/homebase/coach/artefacts",
  "/api/homebase/coach/squad",
  "/api/homebase/coach/lead",
  "/api/homebase/coach/cases",
] as const;

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  clearSession();
  vi.clearAllMocks();
  for (const k of ["SALESFORCE_INSTANCE_URL", "SF_SERVICE_TOKEN"]) {
    if (ORIG_ENV[k] !== undefined) process.env[k] = ORIG_ENV[k];
    else delete process.env[k];
  }
});

afterEach(() => {
  clearSession();
  for (const k of ["SALESFORCE_INSTANCE_URL", "SF_SERVICE_TOKEN"]) {
    if (ORIG_ENV[k] !== undefined) process.env[k] = ORIG_ENV[k];
    else delete process.env[k];
  }
});

// ── 1. No session → 401 ───────────────────────────────────────────────────────

describe("All /homebase/coach/* routes → 401 when no session", () => {
  for (const path of COACH_ROUTES_GET) {
    it(`GET ${path}`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    });
  }
});

// ── 2. Wrong audience → 403 ───────────────────────────────────────────────────

describe("All /homebase/coach/* routes → 403 when audience is learner", () => {
  beforeEach(() => { Object.assign(mockSession, LEARNER_SESSION); });

  for (const path of COACH_ROUTES_GET) {
    it(`GET ${path}`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(403);
    });
  }
});

// ── 3. GET /api/homebase/coach/penny-prepared ─────────────────────────────────

describe("GET /api/homebase/coach/penny-prepared", () => {
  it("returns { items: [], hasData: false } Phase-1 stub", async () => {
    Object.assign(mockSession, COACH_SESSION);
    const res = await request(app).get("/api/homebase/coach/penny-prepared");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.hasData).toBe(false);
  });
});

// ── 4. GET /api/homebase/coach/artefacts ─────────────────────────────────────

describe("GET /api/homebase/coach/artefacts", () => {
  it("returns { items: [], hasData: false } Phase-1 stub", async () => {
    Object.assign(mockSession, COACH_SESSION);
    const res = await request(app).get("/api/homebase/coach/artefacts");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.hasData).toBe(false);
  });
});

// ── 5. GET /api/homebase/coach/squad ─────────────────────────────────────────

describe("GET /api/homebase/coach/squad", () => {
  it("returns { squads: [], hasData: false } Phase-1 stub", async () => {
    Object.assign(mockSession, COACH_SESSION);
    const res = await request(app).get("/api/homebase/coach/squad");
    expect(res.status).toBe(200);
    expect(res.body.squads).toEqual([]);
    expect(res.body.hasData).toBe(false);
  });
});

// ── 6–8. GET /api/homebase/coach/lead ────────────────────────────────────────

describe("GET /api/homebase/coach/lead", () => {
  beforeEach(() => { Object.assign(mockSession, COACH_SESSION); });

  it("returns sfUnavailable:true when SF not configured", async () => {
    delete process.env["SALESFORCE_INSTANCE_URL"];
    delete process.env["SF_SERVICE_TOKEN"];

    const res = await request(app).get("/api/homebase/coach/lead");
    expect(res.status).toBe(200);
    expect(res.body.sfUnavailable).toBe(true);
    expect(res.body.linked).toBeNull();
    expect(res.body.lead).toBeNull();
  });

  it("returns linked:false when SF returns no Contact", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ records: [] }), { status: 200 }),
    );

    const res = await request(app).get("/api/homebase/coach/lead");
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(false);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.lead).toBeNull();

    fetchSpy.mockRestore();
  });

  it("returns linked:true with lead:null (Phase-1 stub) when Contact found", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ records: [{ Id: "CONTACT_001" }] }), { status: 200 }),
    );

    const res = await request(app).get("/api/homebase/coach/lead");
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.lead).toBeNull(); // Phase 1 stub

    fetchSpy.mockRestore();
  });
});

// ── 9–12. GET /api/homebase/coach/cases ──────────────────────────────────────

describe("GET /api/homebase/coach/cases", () => {
  beforeEach(() => { Object.assign(mockSession, COACH_SESSION); });

  it("returns sfUnavailable:true when SF not configured", async () => {
    delete process.env["SALESFORCE_INSTANCE_URL"];
    delete process.env["SF_SERVICE_TOKEN"];

    const res = await request(app).get("/api/homebase/coach/cases");
    expect(res.status).toBe(200);
    expect(res.body.sfUnavailable).toBe(true);
    expect(res.body.linked).toBeNull();
    expect(Array.isArray(res.body.cases)).toBe(true);
  });

  it("returns linked:false when SF query returns no Contact record", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ records: [] }), { status: 200 }),
    );

    const res = await request(app).get("/api/homebase/coach/cases");
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(false);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.cases).toEqual([]);

    fetchSpy.mockRestore();
  });

  it("returns linked:true with cases when Contact and open Cases exist", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ records: [{ Id: "CONTACT_001" }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          records: [{
            Id: "CASE_001", CaseNumber: "00009999", Subject: "Coach test case",
            Status: "New", Priority: "High",
            LastModifiedDate: new Date().toISOString(),
            CreatedDate:      new Date().toISOString(),
          }],
        }), { status: 200 }),
      );

    const res = await request(app).get("/api/homebase/coach/cases");
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.totalOpen).toBe(1);
    expect(res.body.cases[0].Subject).toBe("Coach test case");

    fetchSpy.mockRestore();
  });

  it("returns 503 when the SF Contact query returns an HTTP error", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Forbidden", { status: 403 }),
    );

    const res = await request(app).get("/api/homebase/coach/cases");
    expect(res.status).toBe(503);
    expect(res.body.sfUnavailable).toBe(true);

    fetchSpy.mockRestore();
  });
});

// ── 13–14. GET /api/auth/homebase/status — coachLevel field ──────────────────

describe("GET /api/auth/homebase/status — coachLevel field", () => {
  it("returns coachLevel:null when not set in session", async () => {
    Object.assign(mockSession, COACH_SESSION);
    const res = await request(app).get("/api/auth/homebase/status");
    expect(res.status).toBe(200);
    expect(res.body.coachLevel).toBeNull();
  });

  it("returns coachLevel:'advanced' when set in session", async () => {
    Object.assign(mockSession, { ...COACH_SESSION, coachLevel: "advanced" });
    const res = await request(app).get("/api/auth/homebase/status");
    expect(res.status).toBe(200);
    expect(res.body.coachLevel).toBe("advanced");
  });
});
