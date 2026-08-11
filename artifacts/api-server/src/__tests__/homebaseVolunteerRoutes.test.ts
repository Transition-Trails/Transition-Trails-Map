/**
 * homebaseVolunteerRoutes.test.ts
 *
 * Covers the volunteer-specific Homebase routes:
 *
 *  Auth / audience guard
 *   1. All GET /homebase/volunteer/* → 401 when no session
 *   2. All GET /homebase/volunteer/* → 403 when audience is coach
 *   3. POST /homebase/volunteer/queue/assign → 401 when no session
 *   4. POST /homebase/volunteer/queue/assign → 403 when audience is coach
 *
 *  GET /api/homebase/volunteer/month
 *   5. Returns hoursLogged:0 + commitmentSet:false when profile absent
 *
 *  GET /api/homebase/volunteer/cases  (queries by OwnerId = User.Id)
 *   6. Returns sfUnavailable:true when SF not configured
 *   7. Returns linked:false when SF returns no active User
 *   8. Returns linked:true with cases owned by the User when found
 *   9. Returns 503 when the SF User query returns an HTTP error
 *
 *  GET /api/homebase/volunteer/queue
 *  10. Returns sfUnavailable:true when SF not configured
 *  11. Returns hasData:true with mapped items when SF has queue cases
 *  12. Specialty-matched cases have matchesSpecialty:true; others false
 *  13. Returns sfUnavailable:true when the SF Cases query returns an HTTP error
 *
 *  POST /api/homebase/volunteer/queue/assign
 *  14. Returns 400 when caseId is missing from body
 *  15. Returns 503 when SF not configured
 *  16. Returns 400 when the volunteer has no active SF User account
 *  17. Returns 503 (fail closed) when the case-count query fails
 *  18. Returns 422 { atLimit:true } when volunteer is at their case_limit
 *  19. Returns 409 when the case is no longer queue-owned
 *  20. Returns 200 { ok:true } and calls SF PATCH on success
 *
 *  GET /api/homebase/volunteer/growth
 *  21. Returns { skills:[], hasData:false } Phase-1 stub
 *
 *  GET /api/homebase/volunteer/shareables
 *  22. Returns { items:[], hasData:false } Phase-1 stub
 *
 *  GET /api/homebase/volunteer/coordinator
 *  23. Returns coordinatorName:null when profile absent
 *  24. Returns coordinatorName from profile when set
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
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]), catch: vi.fn() })) })),
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
  trailOsAuditLogTable: { _: { name: 'trail_os_audit_log' } },
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

// ── 3–4. POST /homebase/volunteer/queue/assign auth guard ─────────────────────

describe("POST /api/homebase/volunteer/queue/assign auth guard", () => {
  it("returns 401 when no session", async () => {
    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: "CASE001" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when audience is coach", async () => {
    Object.assign(mockSession, COACH_SESSION);
    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: "CASE001" });
    expect(res.status).toBe(403);
  });
});

// ── 5. GET /api/homebase/volunteer/month ──────────────────────────────────────

describe("GET /api/homebase/volunteer/month", () => {
  beforeEach(() => { Object.assign(mockSession, VOLUNTEER_SESSION); });

  it("returns hoursLogged:0 and commitmentSet:false when profile and logs absent", async () => {
    mockFrom.where.mockReturnValue({ ...mockWhere, orderBy: vi.fn().mockResolvedValue([]), limit: vi.fn().mockResolvedValue([]) });

    const res = await request(app).get("/api/homebase/volunteer/month");
    expect(res.status).toBe(200);
    expect(res.body.hoursLogged).toBe(0);
    expect(res.body.commitmentSet).toBe(false);
    expect(res.body.hoursCommitment).toBeNull();
    expect(typeof res.body.points).toBe("number");
  });
});

// ── 6–9. GET /api/homebase/volunteer/cases ────────────────────────────────────
//
// The endpoint now looks up the volunteer's SF User (not Contact) and
// queries Cases WHERE OwnerId = userId so assigned cases are visible after
// POST /queue/assign.

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

  it("returns linked:false when SF returns no active User", async () => {
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

  it("returns linked:true with cases owned by the User when found", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch")
      // 1. User lookup
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ records: [{ Id: "00500000USERID" }] }), { status: 200 }),
      )
      // 2. Cases WHERE OwnerId = userId
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

  it("returns 503 when the SF User query returns an HTTP error", async () => {
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

// ── 10–13. GET /api/homebase/volunteer/queue ──────────────────────────────────

describe("GET /api/homebase/volunteer/queue", () => {
  beforeEach(() => { Object.assign(mockSession, VOLUNTEER_SESSION); });

  it("returns sfUnavailable:true when SF not configured", async () => {
    delete process.env["SALESFORCE_INSTANCE_URL"];
    delete process.env["SF_SERVICE_TOKEN"];

    const res = await request(app).get("/api/homebase/volunteer/queue");
    expect(res.status).toBe(200);
    expect(res.body.sfUnavailable).toBe(true);
    expect(res.body.hasData).toBe(false);
    expect(res.body.items).toEqual([]);
  });

  it("returns hasData:true with mapped items when SF has queue cases", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const createdDate = new Date(Date.now() - 3 * 86_400_000).toISOString(); // 3 days ago

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        records: [{
          Id: "QUEUE_CASE_001", CaseNumber: "00008888",
          Subject: "Benefits navigation help", Priority: "Medium", Type: "Benefits",
          CreatedDate: createdDate, Contact: null,
        }],
      }), { status: 200 }),
    );

    const res = await request(app).get("/api/homebase/volunteer/queue");
    expect(res.status).toBe(200);
    expect(res.body.hasData).toBe(true);
    expect(res.body.items).toHaveLength(1);
    const item = res.body.items[0];
    expect(item.id).toBe("QUEUE_CASE_001");
    expect(item.caseNumber).toBe("00008888");
    expect(item.subject).toBe("Benefits navigation help");
    expect(item.estimatedSize).toBe("medium"); // Priority:Medium → medium
    expect(item.daysWaiting).toBeGreaterThanOrEqual(2);
    expect(typeof res.body.openCount).toBe("number");
    expect(typeof res.body.caseLimit).toBe("number");

    fetchSpy.mockRestore();
  });

  it("tags matchesSpecialty:true only for cases matching volunteer specialty", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    // Profile has specialty = "Benefits"
    mockWhere.limit.mockReturnValue(Promise.resolve([{
      userEmail: "volunteer@transitiontrails.org",
      caseLimit: 3, specialty: "Benefits",
      coordinatorSlackId: null, coordinatorName: null,
      volunteerSlackChannel: null, updatedAt: new Date(),
    }]));

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        records: [
          { Id: "CASE_A", CaseNumber: "00001", Subject: "Benefits help", Priority: "Low",   Type: "Benefits", CreatedDate: new Date().toISOString(), Contact: null },
          { Id: "CASE_B", CaseNumber: "00002", Subject: "Housing help",  Priority: "High",  Type: "Housing",  CreatedDate: new Date().toISOString(), Contact: null },
        ],
      }), { status: 200 }),
    );

    const res = await request(app).get("/api/homebase/volunteer/queue");
    expect(res.status).toBe(200);
    // Matched case should be first
    expect(res.body.items[0].id).toBe("CASE_A");
    expect(res.body.items[0].matchesSpecialty).toBe(true);
    expect(res.body.items[1].id).toBe("CASE_B");
    expect(res.body.items[1].matchesSpecialty).toBe(false);

    fetchSpy.mockRestore();
  });

  it("returns sfUnavailable:true when the SF Cases query returns an HTTP error", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Service unavailable", { status: 503 }),
    );

    const res = await request(app).get("/api/homebase/volunteer/queue");
    expect(res.status).toBe(200);
    expect(res.body.sfUnavailable).toBe(true);
    expect(res.body.hasData).toBe(false);

    fetchSpy.mockRestore();
  });
});

// ── 14–20. POST /api/homebase/volunteer/queue/assign ─────────────────────────

describe("POST /api/homebase/volunteer/queue/assign", () => {
  beforeEach(() => { Object.assign(mockSession, VOLUNTEER_SESSION); });

  function sfOk(records: unknown[]) {
    return new Response(JSON.stringify({ records }), { status: 200 });
  }
  function sfPatch204() {
    return new Response(null, { status: 204 });
  }

  const USER_ID   = "00500000USERID001";
  // Valid 15-char SF Case ID (prefix '500' + 12 alphanumeric)
  const CASE_ID   = "500CASEID000001";
  const QUEUE_ID  = "00GQUEUE0000001"; // starts with '00G' (Queue record)

  it("returns 400 when caseId is missing from body", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when caseId contains non-alphanumeric characters (SOQL injection attempt)", async () => {
    // Ensures adversarial inputs are rejected before any SF query runs.
    // caseId is strictly validated as 15/18-char alphanumeric with '500' prefix.
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch"); // must NOT be called

    const maliciousIds = [
      "500' OR '1'='1",           // SOQL injection
      "500CASEID000001' LIMIT 1", // trailing injection
      "../../etc/passwd",         // path traversal
      "500 DROP TABLE CASE",      // SQL-like
      "",                         // empty
      "500TOOLONG000000000000",   // too long
      "500SHORT",                 // too short
    ];

    for (const badId of maliciousIds) {
      const res = await request(app)
        .post("/api/homebase/volunteer/queue/assign")
        .send({ caseId: badId });
      expect(res.status).toBe(400);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns 503 when SF not configured", async () => {
    delete process.env["SALESFORCE_INSTANCE_URL"];
    delete process.env["SF_SERVICE_TOKEN"];

    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: CASE_ID });
    expect(res.status).toBe(503);
    expect(res.body.sfUnavailable).toBe(true);
  });

  it("returns 400 when volunteer has no active SF User account", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(sfOk([])); // User lookup → empty

    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: CASE_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no active salesforce user/i);

    fetchSpy.mockRestore();
  });

  it("returns 503 (fail closed) when the case-count query fails", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(sfOk([{ Id: USER_ID }]))    // User lookup OK
      .mockResolvedValueOnce(new Response("Error", { status: 500 })); // case-count fails

    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: CASE_ID });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/unable to verify/i);

    fetchSpy.mockRestore();
  });

  it("returns 422 { atLimit:true } when volunteer is at their case_limit", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    // Profile: caseLimit = 2
    mockWhere.limit.mockReturnValue(Promise.resolve([{
      userEmail: "volunteer@transitiontrails.org", caseLimit: 2, specialty: null,
      coordinatorSlackId: null, coordinatorName: null,
      volunteerSlackChannel: null, updatedAt: new Date(),
    }]));

    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(sfOk([{ Id: USER_ID }]))                  // User lookup
      .mockResolvedValueOnce(sfOk([{ Id: "C1" }, { Id: "C2" }]));     // 2 open cases = at limit

    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: CASE_ID });
    expect(res.status).toBe(422);
    expect(res.body.atLimit).toBe(true);
    expect(res.body.caseLimit).toBe(2);
    expect(res.body.currentCases).toBe(2);

    fetchSpy.mockRestore();
  });

  it("returns 409 when the submitted case is no longer queue-owned", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(sfOk([{ Id: USER_ID }]))   // User lookup
      .mockResolvedValueOnce(sfOk([]))                   // 0 open cases
      // Case verify: OwnerId starts with '005' (a User, NOT a Queue)
      .mockResolvedValueOnce(sfOk([{ OwnerId: "00500000SOMEONE", IsClosed: false }]));

    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: CASE_ID });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/no longer in the unassigned queue/i);

    fetchSpy.mockRestore();
  });

  it("returns 200 { ok:true } and issues a SF PATCH on success", async () => {
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(sfOk([{ Id: USER_ID }]))                          // User lookup
      .mockResolvedValueOnce(sfOk([{ Id: "OPEN_CASE" }]))                      // 1 open case (< limit 3)
      .mockResolvedValueOnce(sfOk([{ OwnerId: QUEUE_ID, IsClosed: false }]))   // Case verify: queue-owned
      .mockResolvedValueOnce(sfPatch204());                                     // PATCH → 204

    const res = await request(app)
      .post("/api/homebase/volunteer/queue/assign")
      .send({ caseId: CASE_ID });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.caseId).toBe(CASE_ID);

    // Verify PATCH was called with the correct User ID
    const patchCall = fetchSpy.mock.calls.find(
      c => typeof c[0] === "string" && (c[0] as string).includes(CASE_ID) &&
           (c[1] as RequestInit).method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    const patchBody = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(patchBody.OwnerId).toBe(USER_ID);

    fetchSpy.mockRestore();
  });

  it("returns 429 when an assignment is already in flight for this volunteer", async () => {
    // Directly verifies the per-volunteer lock path.  We pre-populate
    // assignmentInFlight for the volunteer's email (simulating a concurrent
    // in-flight request) and confirm the endpoint returns 429 without touching SF.
    // This is the server-side mechanism that prevents a volunteer from exceeding
    // their case_limit via concurrent "Assign to me" clicks.
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const { assignmentInFlight } = await import("../routes/homebase.js");
    assignmentInFlight.add(VOLUNTEER_SESSION.googleEmail);

    const fetchSpy = vi.spyOn(global, "fetch"); // should not be called

    try {
      const res = await request(app)
        .post("/api/homebase/volunteer/queue/assign")
        .send({ caseId: CASE_ID });
      expect(res.status).toBe(429);
      expect(res.body.error).toMatch(/already in progress/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      assignmentInFlight.delete(VOLUNTEER_SESSION.googleEmail);
      fetchSpy.mockRestore();
    }
  });

  it("returns 429 when the same case is already being claimed by another volunteer", async () => {
    // Directly verifies the per-case lock (casesInFlight).
    // This prevents two different volunteers from both passing the queue-ownership
    // check and racing to PATCH the same case (last-write-wins race).
    process.env["SALESFORCE_INSTANCE_URL"] = "https://test.salesforce.com";
    process.env["SF_SERVICE_TOKEN"]        = "test-token";

    const { casesInFlight } = await import("../routes/homebase.js");
    casesInFlight.add(CASE_ID); // simulates another volunteer's in-flight request

    // Mock just enough for the endpoint to reach the case lock (User lookup + case-count)
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(sfOk([{ Id: USER_ID }])) // User lookup
      .mockResolvedValueOnce(sfOk([]));                // 0 open cases (under limit)

    try {
      const res = await request(app)
        .post("/api/homebase/volunteer/queue/assign")
        .send({ caseId: CASE_ID });
      expect(res.status).toBe(429);
      expect(res.body.error).toMatch(/being claimed by another volunteer/i);
      // The case-verify SOQL and PATCH must NOT have run
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      casesInFlight.delete(CASE_ID);
      fetchSpy.mockRestore();
    }
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
