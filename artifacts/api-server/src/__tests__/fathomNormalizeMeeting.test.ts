/**
 * fathomNormalizeMeeting.test.ts
 *
 * Unit tests for the normalizeMeeting() helper exported from fathom.ts.
 * These tests validate that the field-mapping logic handles the various
 * response shapes Fathom's external API may return, including missing
 * fields, null nesting, alternate field names, and edge cases.
 */

import { describe, test, expect } from "vitest";
import { normalizeMeeting } from "../routes/fathom.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Canonical Fathom v1 meeting shape (all fields present). */
const CANONICAL = {
  id:         "mtg-123",
  title:      "Sprint Planning",
  started_at: "2026-08-10T14:00:00Z",
  share_url:  "https://fathom.video/calls/mtg-123",
  default_summary: {
    markdown_formatted: "## Key points\n\n- Discussed roadmap\n- Assigned tasks",
  },
  action_items: [
    { description: "Update the roadmap doc", completed: false, assignee: { name: "Alice" } },
    { description: "Close stale tickets",    completed: true,  assignee: { name: "Bob" }   },
  ],
};

// ── Core happy-path ───────────────────────────────────────────────────────────

describe("normalizeMeeting — happy path", () => {
  test("maps all canonical fields correctly", () => {
    const m = normalizeMeeting(CANONICAL, 0);
    expect(m.id).toBe("mtg-123");
    expect(m.title).toBe("Sprint Planning");
    expect(m.started_at).toBe("2026-08-10T14:00:00Z");
    expect(m.share_url).toBe("https://fathom.video/calls/mtg-123");
    expect(m.summary).toContain("Discussed roadmap");
    expect(m.action_items).toHaveLength(2);
  });

  test("extracts summary from default_summary.markdown_formatted", () => {
    const m = normalizeMeeting(CANONICAL, 0);
    expect(m.summary).toBe("## Key points\n\n- Discussed roadmap\n- Assigned tasks");
  });

  test("maps action item description, completed, and assigneeName", () => {
    const m = normalizeMeeting(CANONICAL, 0);
    expect(m.action_items[0]).toEqual({
      description: "Update the roadmap doc",
      completed: false,
      assigneeName: "Alice",
    });
    expect(m.action_items[1]).toEqual({
      description: "Close stale tickets",
      completed: true,
      assigneeName: "Bob",
    });
  });
});

// ── Summary field fallbacks ────────────────────────────────────────────────────

describe("normalizeMeeting — summary fallbacks", () => {
  test("falls back to default_summary.text when markdown_formatted is absent", () => {
    const raw = { ...CANONICAL, default_summary: { text: "Plain text summary" } };
    expect(normalizeMeeting(raw, 0).summary).toBe("Plain text summary");
  });

  test("falls back to top-level summary string", () => {
    const raw = { ...CANONICAL, default_summary: undefined, summary: "Top-level summary" };
    expect(normalizeMeeting(raw, 0).summary).toBe("Top-level summary");
  });

  test("falls back to top-level ai_summary string", () => {
    const raw = { ...CANONICAL, default_summary: null, ai_summary: "AI-generated summary" };
    expect(normalizeMeeting(raw, 0).summary).toBe("AI-generated summary");
  });

  test("returns null when no summary field is present", () => {
    const { default_summary: _ds, ...rest } = CANONICAL as Record<string, unknown>;
    const raw = { ...rest };
    expect(normalizeMeeting(raw, 0).summary).toBeNull();
  });

  test("returns null when default_summary is present but all text fields are empty strings", () => {
    const raw = { ...CANONICAL, default_summary: { markdown_formatted: "   " } };
    expect(normalizeMeeting(raw, 0).summary).toBeNull();
  });

  test("returns null when default_summary is an empty object", () => {
    const raw = { ...CANONICAL, default_summary: {} };
    expect(normalizeMeeting(raw, 0).summary).toBeNull();
  });

  test("prefers default_summary.markdown_formatted over top-level summary", () => {
    const raw = { ...CANONICAL, summary: "Should be ignored" };
    expect(normalizeMeeting(raw, 0).summary).toBe(
      "## Key points\n\n- Discussed roadmap\n- Assigned tasks",
    );
  });
});

// ── Action item field fallbacks ───────────────────────────────────────────────

describe("normalizeMeeting — action item fallbacks", () => {
  test("returns empty array when action_items is absent", () => {
    const { action_items: _ai, ...rest } = CANONICAL as Record<string, unknown>;
    expect(normalizeMeeting(rest, 0).action_items).toEqual([]);
  });

  test("returns empty array when action_items is null", () => {
    const raw = { ...CANONICAL, action_items: null };
    expect(normalizeMeeting(raw as unknown as Record<string, unknown>, 0).action_items).toEqual([]);
  });

  test("falls back to tasks array when action_items is absent", () => {
    const { action_items: _ai, ...rest } = CANONICAL as Record<string, unknown>;
    const raw = { ...rest, tasks: [{ description: "Via tasks field", completed: false }] };
    const m = normalizeMeeting(raw, 0);
    expect(m.action_items).toHaveLength(1);
    expect(m.action_items[0]!.description).toBe("Via tasks field");
  });

  test("falls back to text field for action item description", () => {
    const raw = {
      ...CANONICAL,
      action_items: [{ text: "Text field fallback", completed: false }],
    };
    expect(normalizeMeeting(raw, 0).action_items[0]!.description).toBe("Text field fallback");
  });

  test("handles is_completed flag", () => {
    const raw = {
      ...CANONICAL,
      action_items: [{ description: "Done item", is_completed: true }],
    };
    expect(normalizeMeeting(raw, 0).action_items[0]!.completed).toBe(true);
  });

  test("handles assignee as plain string", () => {
    const raw = {
      ...CANONICAL,
      action_items: [{ description: "Task", completed: false, assignee: "Charlie" }],
    };
    expect(normalizeMeeting(raw, 0).action_items[0]!.assigneeName).toBe("Charlie");
  });

  test("handles assignee_name flat field", () => {
    const raw = {
      ...CANONICAL,
      action_items: [{ description: "Task", completed: false, assignee_name: "Dana" }],
    };
    expect(normalizeMeeting(raw, 0).action_items[0]!.assigneeName).toBe("Dana");
  });

  test("returns null assigneeName when no assignee is present", () => {
    const raw = {
      ...CANONICAL,
      action_items: [{ description: "Unassigned", completed: false }],
    };
    expect(normalizeMeeting(raw, 0).action_items[0]!.assigneeName).toBeNull();
  });
});

// ── Identity field fallbacks ───────────────────────────────────────────────────

describe("normalizeMeeting — identity field fallbacks", () => {
  test("falls back to uuid when id is absent", () => {
    const { id: _id, ...rest } = CANONICAL as Record<string, unknown>;
    const raw = { ...rest, uuid: "uuid-abc" };
    expect(normalizeMeeting(raw, 0).id).toBe("uuid-abc");
  });

  test("generates stable composite id when no id field present", () => {
    const { id: _id, uuid: _uuid, ...rest } = CANONICAL as Record<string, unknown>;
    const m = normalizeMeeting(rest, 3);
    expect(m.id).toMatch(/^fathom-3-/);
  });

  test("falls back to name when title is absent", () => {
    const { title: _title, ...rest } = CANONICAL as Record<string, unknown>;
    const raw = { ...rest, name: "Untitled via name" };
    expect(normalizeMeeting(raw, 0).title).toBe("Untitled via name");
  });

  test("falls back to created_at when started_at is absent", () => {
    const { started_at: _sa, ...rest } = CANONICAL as Record<string, unknown>;
    const raw = { ...rest, created_at: "2026-08-01T09:00:00Z" };
    expect(normalizeMeeting(raw, 0).started_at).toBe("2026-08-01T09:00:00Z");
  });

  test("falls back to recording_url when share_url is absent", () => {
    const { share_url: _su, ...rest } = CANONICAL as Record<string, unknown>;
    const raw = { ...rest, recording_url: "https://fathom.video/rec/abc" };
    expect(normalizeMeeting(raw, 0).share_url).toBe("https://fathom.video/rec/abc");
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("normalizeMeeting — edge cases", () => {
  test("handles a completely empty object without throwing", () => {
    expect(() => normalizeMeeting({}, 0)).not.toThrow();
    const m = normalizeMeeting({}, 0);
    expect(m.summary).toBeNull();
    expect(m.action_items).toEqual([]);
    expect(m.title).toBe("Untitled meeting");
  });

  test("handles null input without throwing", () => {
    expect(() => normalizeMeeting(null, 0)).not.toThrow();
  });

  test("handles action_items with empty description gracefully", () => {
    const raw = { ...CANONICAL, action_items: [{ completed: false }] };
    expect(normalizeMeeting(raw, 0).action_items[0]!.description).toBe("");
  });
});
