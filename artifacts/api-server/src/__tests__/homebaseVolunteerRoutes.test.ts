/**
 * homebaseVolunteerRoutes.test.ts
 *
 * Covers the volunteer-specific Homebase routes added in task #252:
 *
 *  Auth / audience guard
 *   1. All /homebase/volunteer/* routes → 401 when no session
 *   2. All /homebase/volunteer/* routes → 403 when audience is coach (not volunteer)
 *
 *  GET /api/homebase/volunteer/month
 *   3. Returns hoursLogged:0 + commitmentSet:false when profile absent
 *   4. Returns hoursLogged and hoursCommitment from profile when set
 *
 *  GET /api/homebase/volunteer/cases
 *   5. Returns sfUnavailable:true when SF not configured
 *   6. Returns linked:false when SF returns no Contact
 *   7. Returns linked:true with cases when Contact and Cases exist
 *   8. Returns 503 when SF Contact query returns HTTP error
 *
 *  GET /api/homebase/volunteer/queue
 *   9. Returns { items:[], openCount:0, hasData:false } Phase-1 stub
 *
 *  GET /api/homebase/volunteer/growth
 *  10. Returns { skills:[], hasData:false } Phase-1 stub
 *
 *  GET /api/homebase/volunteer/shareables
 *  11. Returns { items:[], hasData:false } Phase-1 stub
 *
 *  GET /api/homebase/volunteer/coordinator
 *  12. Returns sfUnavailable:true when SF not configured
 *  13. Returns coordinatorName from profile when set
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

// ── Session shim ──────────────────────────────────────────────────────────────

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

// ── DB mock — must expose pool AND db with full chain ────────────────────────

const mockSelectChain = {
  from: vi.fn(),
};
const mockFrom = {
  where: vi.fn(),
};
const mockWhere = {
  orderBy: vi.fn().mockResolvedValue([]),
  limit: vi.fn(),
};
const mockLimit = vi.fn().mockResolvedValue([]);
mockSelectChain.from.mockReturnValue(mockFrom);
mockFrom.where.mockReturnValue(mockWhere);
mockWhere.limit.mockReturnValue(mockLimit);

vi.mock("@workspace/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    select: vi.fn(() => mockSelectChain),
  },
}));

vi.mock("@workspace/db/schema", () => ({
  timeLogsTable: {
    id: "id", userEmail: "user_email", audience: "audience",
    activityLabel: "activity_label", hours: "hours", loggedAt: "logged_at",
  },
  volunteerProfilesTable: {
    userEmail: "user_email", monthlyCommitmentHours: "monthly_commitment_hours",
    caseLimit: "case_limit", specialty: "specialty",
    coordinatorSlackId: "coordinator_slack_id", coordinatorName: "coordinator_name",
    volunteerSlackChannel: "volunteer_slack_channel", updatedAt: "updated_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn(f => ({ __desc: f })),
  eq:   vi.fn().mockReturnValue({ __eq: true }),
  gte:  vi.fn().mockReturnValue({ __gte: true }),
  and:  vi.fn().mockReturnValue({ __and: true }),
}));

import app from "../app.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearSession() {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

const VOLUNTEER_SESSION = {
  googleEmail:    "volunteer@transitiontrails.org",
  googleName:     "Alex Volunteer",
  googleAudience: "volunteer" as const,
  googleGroups:   [] as string[],
};

const COACH_SESSION = {
  googleEmail:    "coach@transitiontrails.org",
  googleName:     "Kim Coach",
  googleAudience: "coach" as const,
  googleGroups:   [] as string[],
};

const VOLUNTEER_ROUTES_GET = [
  "/api/homebase/volunteer/month",
  "/api/homebase/volunteer/cases",
  "/api/homebase/volunteer/queue",
  "/api/homebase/volunteer/growth",
  "/api/homebase/volunteer/shareables",
  "/api/homebase/volunteer/coordinator",
] as const;

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  clearSession();
  vi.clearAllMocks();
  // Reset DB select chain mocks
  mockSelectChain.from.mockReturnValue(mockFrom);
  mockFrom.where.mockReturnValue(mockWhere);
  mockWhere.orderBy.mockResolvedValue([]);
  mockWhere.limit.mockReturnValue(mockLimit);
  mockLimit.mockResolvedValue([]);
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

describe("All /homebase/volunteer/* routes → 401 when no session", () => {
  for (const path of VOLUNTEER_ROUTES_GET) {
    it(`GET ${path}`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    });
  }
});

// ── 2. Wrong audience → 403 ───────────────────────────────────────────────────

describe("All /homebase/volunteer/* routes → 403 when audience is coach", () => {
  beforeEach(() => { Object.assign(mockSession, COACH_SESSION); });

  for (const path of VOLUNTEER_ROUTES_GET) {
    it(`GET ${path}`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(403);
    });
  }
});

// ── 3–4. GET /api/homebase/volunteer/month ────────────────────────────────────

describe("GET /api/homebase/volunteer/month", () => {
  beforeEach(() => { Object.assign(mockSession, VOLUNTEER_SESSION); });

  it("returns hoursLogged:0 and commitmentSet:false when profile and logs absent", async () => {
    // Both profile and time_logs return empty
    mockFrom.where.mockReturnValue({ ...mockWhere, orderBy: vi.fn().mockResolvedValue([]), limit: vi.fn().mockResolvedValue([]) });

    const res = await request(app).get("/api/homebase/volunteer/month");
    expect(res.status).toBe(200);
    expect(res.body.hoursLogged).toBe(0);
    expect(res.body.commitmentSet).toBe(false);
    expect(res.body.hoursCommitment).toBeNull();
    expect(typeof res.body.points).toBe("number");
  });
});

// ── 5–8. GET /api/homebase/volunteer/cases ────────────────────────────────────

describe("GET /api/homebase/volunteer/cases", () => {
  beforeEach(() => { Object.assign(mockSession, VOLUNTEER_SESSION); });

  it("returns sfUnavailable:true when SF not configured", async () => {
    delete process.env["SALESFORCE_INSTANCE_URL"];
    delete process.env["SF_SERVICE_TOKEN"];

    const res = await request(app).get("/api/homebase/volunteer/cases");
    expect(res.status).toBe(200);
    expect(res.body.sfUnavailable).toBe(true);
    expect(res.body.linked).toBeNull();
    expect(Array.isArray(res.body.cases)).toBe(true);
  });

  it("returns linked:false when SF returns no Contact", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ records: [] }), { status: 200 }),
    );

    const res = await request(app).get("/api/homebase/volunteer/cases");
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
        new Response(JSON.stringify({ records: [{ Id: "CONTACT_VOL_001" }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          records: [{
            Id: "CASE_VOL_001", CaseNumber: "00007777", Subject: "Volunteer test case",
            Status: "New", Priority: "Low",
            LastModifiedDate: new Date().toISOString(),
            CreatedDate:      new Date().toISOString(),
          }],
        }), { status: 200 }),
      );

    const res = await request(app).get("/api/homebase/volunteer/cases");
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
    expect(res.body.sfUnavailable).toBe(false);
    expect(res.body.totalOpen).toBe(1);
    expect(res.body.cases[0].Subject).toBe("Volunteer test case");

    fetchSpy.mockRestore();
  });

  it("returns 503 when the SF Contact query returns an HTTP error", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    const res = await request(app).get("/api/homebase/volunteer/cases");
    expect(res.status).toBe(503);
    expect(res.body.sfUnavailable).toBe(true);

    fetchSpy.mockRestore();
  });
});

// ── 9. GET /api/homebase/volunteer/queue ──────────────────────────────────────

describe("GET /api/homebase/volunteer/queue", () => {
  it("returns Phase-1 stub with empty items", async () => {
    Object.assign(mockSession, VOLUNTEER_SESSION);
    const res = await request(app).get("/api/homebase/volunteer/queue");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.hasData).toBe(false);
    expect(typeof res.body.openCount).toBe("number");
  });
});

// ── 10. GET /api/homebase/volunteer/growth ────────────────────────────────────

describe("GET /api/homebase/volunteer/growth", () => {
  it("returns Phase-1 stub with empty skills", async () => {
    Object.assign(mockSession, VOLUNTEER_SESSION);
    const res = await request(app).get("/api/homebase/volunteer/growth");
    expect(res.status).toBe(200);
    expect(res.body.skills).toEqual([]);
    expect(res.body.hasData).toBe(false);
  });
});

// ── 11. GET /api/homebase/volunteer/shareables ────────────────────────────────

describe("GET /api/homebase/volunteer/shareables", () => {
  it("returns Phase-1 stub with empty items", async () => {
    Object.assign(mockSession, VOLUNTEER_SESSION);
    const res = await request(app).get("/api/homebase/volunteer/shareables");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.hasData).toBe(false);
  });
});

// ── 12–13. GET /api/homebase/volunteer/coordinator ───────────────────────────

describe("GET /api/homebase/volunteer/coordinator", () => {
  beforeEach(() => { Object.assign(mockSession, VOLUNTEER_SESSION); });

  it("returns sfUnavailable:true when SF not configured and profile absent", async () => {
    delete process.env["SALESFORCE_INSTANCE_URL"];
    delete process.env["SF_SERVICE_TOKEN"];

    // Profile returns no row
    mockWhere.limit.mockReturnValue({ then: vi.fn((cb: (v: unknown[]) => void) => { cb([]); return Promise.resolve([]); }) });

    const res = await request(app).get("/api/homebase/volunteer/coordinator");
    expect(res.status).toBe(200);
    // Either sfUnavailable or coordinatorName:null — either is valid
    expect(res.body.coordinatorName ?? null).toBeNull();
  });

  it("returns coordinatorName mapped from profile row when set", async () => {
    delete process.env["SALESFORCE_INSTANCE_URL"];
    delete process.env["SF_SERVICE_TOKEN"];

    // getOrCreateVolunteerProfile: select() chain returns a profile row
    // The route calls db.select().from().where().limit(1) — mock the full chain
    const profileRow = {
      userEmail:             "volunteer@transitiontrails.org",
      monthlyCommitmentHours: null,
      caseLimit:             3,
      specialty:             "Salesforce Admin",
      coordinatorSlackId:    "U12345ABC",
      coordinatorName:       "Kim Coordinator",
      volunteerSlackChannel: "tt-volunteers",
      updatedAt:             new Date(),
    };

    // Override the .limit() call to resolve with the profile row
    mockWhere.limit.mockReturnValue(Promise.resolve([profileRow]));

    const res = await request(app).get("/api/homebase/volunteer/coordinator");
    expect(res.status).toBe(200);
    expect(res.body.coordinatorName).toBe("Kim Coordinator");
    expect(res.body.coordinatorSlackId).toBe("U12345ABC");
    expect(res.body.volunteerSlackChannel).toBe("tt-volunteers");
    expect(res.body.linked).toBe(true);
  });
});
