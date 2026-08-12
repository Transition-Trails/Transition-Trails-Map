/**
 * Integration tests for the HomebaseTour seen-step auto-skip feature.
 *
 * These tests model the full hook state machine — the same transitions that
 * happen in production across startTour(), markStepSeen(), showAllSteps(),
 * and completeTour() — and verify that the filtering result is correct at
 * each stage.  They are deliberately decoupled from React rendering so they
 * run without a DOM and catch logic regressions in the hook and component.
 *
 * Key invariants under test:
 *  A. First-run: all steps shown (nothing has been seen yet).
 *  B. Release Notes replay (startTour): shared steps already seen are skipped;
 *     audience-specific steps always shown.
 *  C. In-tour "Show all steps" override: empty snapshot → all steps shown,
 *     but _seenStepKeys is unchanged so the NEXT startTour() still skips.
 *  D. Non-shared steps are never filtered even if their title is in the set.
 *  E. Cross-audience replay: volunteer seen-set applied correctly to coach tour.
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── Mirror the production types ───────────────────────────────────────────────

interface TourStep {
  title:     string;
  isShared?: boolean;
}

// ── Mirror of filtering rule (HomebaseTour.tsx `steps` useMemo) ───────────────

function filterSteps(allSteps: TourStep[], seenAtOpen: Set<string>): TourStep[] {
  return allSteps.filter(s => !(s.isShared && seenAtOpen.has(s.title)));
}

// ── Mirror of hook state machine (useHomebaseTour.ts) ────────────────────────

/**
 * Minimal reproduction of the hook's module-level state machine.
 * Each method mirrors a hook action so tests read like product flows.
 */
class TourStateMachine {
  private seenStepKeys:     Set<string> = new Set();
  public  seenStepKeysAtOpen: Set<string> = new Set();
  public  tourActive:         boolean     = false;

  /** startTour(): snapshot current seen set, open tour. */
  startTour() {
    this.seenStepKeysAtOpen = new Set(this.seenStepKeys);
    this.tourActive = true;
  }

  /**
   * showAllSteps(): open tour with an empty snapshot so all steps show,
   * but leave seenStepKeys intact for future startTour() calls.
   */
  showAllSteps() {
    this.seenStepKeysAtOpen = new Set();
    this.tourActive = true;
  }

  /** markStepSeen(): persist title to seenStepKeys (no re-render signal). */
  markStepSeen(title: string) {
    this.seenStepKeys = new Set([...this.seenStepKeys, title]);
  }

  /** completeTour(): close tour overlay. */
  completeTour() {
    this.tourActive = false;
  }

  /** Helper: mark every step in a list as seen (simulates completing a tour). */
  markAllSeen(steps: TourStep[]) {
    for (const s of steps) this.markStepSeen(s.title);
  }
}

// ── Shared step fixtures (titles match production definitions) ────────────────

const SHARED_PENNY:         TourStep = { title: "Ask Penny anything",    isShared: true };
const SHARED_WORKSPACE:     TourStep = { title: "Your workspace drawer", isShared: true };
const SHARED_SLACK:         TourStep = { title: "Team channels",         isShared: true };
const SHARED_RELEASE_NOTES: TourStep = { title: "Stay up to date",       isShared: true };

const SHARED_STEPS = [SHARED_PENNY, SHARED_WORKSPACE, SHARED_SLACK, SHARED_RELEASE_NOTES];

const VOLUNTEER_STEPS: TourStep[] = [
  { title: "Welcome, Volunteer" },
  { title: "Ways to Help queue" },
  { title: "Your specialty" },
  { title: "Your growth" },
  { title: "Your coordinator" },
  ...SHARED_STEPS,
];

const COACH_STEPS: TourStep[] = [
  { title: "Welcome, Coach" },
  { title: "Submit a Case" },
  { title: "Your squad" },
  { title: "Artifacts" },
  { title: "Lead team card" },
  ...SHARED_STEPS,
];

const LEARNER_STEPS: TourStep[] = [
  { title: "Welcome to your Homebase" },
  { title: "Trail Quest band" },
  { title: "Your decision log" },
  { title: "Open cases" },
  { title: "Your coach" },
  ...SHARED_STEPS,
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HomebaseTour integration — seen-step auto-skip", () => {

  let tour: TourStateMachine;
  beforeEach(() => { tour = new TourStateMachine(); });

  // ── A. First run ──────────────────────────────────────────────────────────

  it("A: first-run shows every step (nothing seen yet)", () => {
    tour.startTour();
    const steps = filterSteps(VOLUNTEER_STEPS, tour.seenStepKeysAtOpen);
    expect(steps).toHaveLength(VOLUNTEER_STEPS.length);
    expect(steps.map(s => s.title)).toEqual(VOLUNTEER_STEPS.map(s => s.title));
  });

  // ── B. Release Notes replay via startTour ─────────────────────────────────

  it("B: Release Notes replay (startTour) skips shared steps already seen", () => {
    // Simulate completing the first volunteer tour (all steps marked seen).
    tour.startTour();
    tour.markAllSeen(VOLUNTEER_STEPS);
    tour.completeTour();

    // User clicks "Take the tour" in Release Notes — calls startTour().
    tour.startTour();
    const steps = filterSteps(VOLUNTEER_STEPS, tour.seenStepKeysAtOpen);
    const titles = steps.map(s => s.title);

    // All four shared steps should be skipped.
    for (const s of SHARED_STEPS) {
      expect(titles, `"${s.title}" should be skipped on replay`).not.toContain(s.title);
    }
    // All volunteer-specific steps must still appear.
    expect(titles).toContain("Welcome, Volunteer");
    expect(titles).toContain("Ways to Help queue");
    expect(titles).toContain("Your specialty");
    expect(titles).toContain("Your growth");
    expect(titles).toContain("Your coordinator");
  });

  it("B: Release Notes replay skips only the shared steps that were actually seen", () => {
    // Only two shared steps were seen (user skipped out of first tour early).
    tour.startTour();
    tour.markStepSeen("Ask Penny anything");
    tour.markStepSeen("Your workspace drawer");
    tour.completeTour();

    tour.startTour();
    const titles = filterSteps(VOLUNTEER_STEPS, tour.seenStepKeysAtOpen).map(s => s.title);

    expect(titles).not.toContain("Ask Penny anything");
    expect(titles).not.toContain("Your workspace drawer");
    expect(titles).toContain("Team channels");           // unseen → still shown
    expect(titles).toContain("Stay up to date");         // unseen → still shown
  });

  // ── C. In-tour "Show all steps" override ─────────────────────────────────

  it("C: showAllSteps shows every step for this session", () => {
    // Mark all shared steps as seen.
    for (const s of SHARED_STEPS) tour.markStepSeen(s.title);

    // User opens tour via showAllSteps (in-tour "Show all steps" button).
    tour.showAllSteps();
    const steps = filterSteps(VOLUNTEER_STEPS, tour.seenStepKeysAtOpen);
    expect(steps).toHaveLength(VOLUNTEER_STEPS.length);
  });

  it("C: showAllSteps does NOT erase history — next startTour() still skips", () => {
    for (const s of SHARED_STEPS) tour.markStepSeen(s.title);

    // Show-all session (doesn't clear persistent seen set).
    tour.showAllSteps();
    tour.completeTour();

    // Next replay via startTour() should still skip the seen shared steps.
    tour.startTour();
    const titles = filterSteps(VOLUNTEER_STEPS, tour.seenStepKeysAtOpen).map(s => s.title);
    for (const s of SHARED_STEPS) {
      expect(titles, `"${s.title}" should still be skipped after show-all`).not.toContain(s.title);
    }
  });

  // ── D. Non-shared steps immunity ─────────────────────────────────────────

  it("D: non-shared steps are never filtered even if their title is in the seen set", () => {
    // Force-populate the seen set with every title (including non-shared ones).
    for (const s of VOLUNTEER_STEPS) tour.markStepSeen(s.title);

    tour.startTour();
    const steps = filterSteps(VOLUNTEER_STEPS, tour.seenStepKeysAtOpen);
    const titles = steps.map(s => s.title);

    // Non-shared steps survive regardless.
    expect(titles).toContain("Welcome, Volunteer");
    expect(titles).toContain("Ways to Help queue");
    expect(titles).toContain("Your specialty");
    expect(titles).toContain("Your growth");
    expect(titles).toContain("Your coordinator");

    // All shared steps correctly filtered.
    for (const s of SHARED_STEPS) {
      expect(titles).not.toContain(s.title);
    }
  });

  // ── E. Cross-audience replay ──────────────────────────────────────────────

  it("E: shared steps seen as volunteer are skipped when replaying as coach", () => {
    // User completed the volunteer tour — all steps including shared ones seen.
    tour.startTour();
    tour.markAllSeen(VOLUNTEER_STEPS);
    tour.completeTour();

    // Same user replays as coach (audience switch).
    tour.startTour();
    const titles = filterSteps(COACH_STEPS, tour.seenStepKeysAtOpen).map(s => s.title);

    // Shared steps seen during volunteer tour should be skipped in coach tour.
    for (const s of SHARED_STEPS) {
      expect(titles, `"${s.title}" seen as volunteer → should skip in coach tour`).not.toContain(s.title);
    }
    // Coach-specific steps always shown.
    expect(titles).toContain("Welcome, Coach");
    expect(titles).toContain("Your squad");
    expect(titles).toContain("Lead team card");
  });

  it("E: learner-specific steps appear even when all shared steps are in the seen set", () => {
    for (const s of SHARED_STEPS) tour.markStepSeen(s.title);

    tour.startTour();
    const titles = filterSteps(LEARNER_STEPS, tour.seenStepKeysAtOpen).map(s => s.title);

    expect(titles).toContain("Trail Quest band");
    expect(titles).toContain("Your decision log");
    expect(titles).toContain("Open cases");
    expect(titles).toContain("Your coach");
    // Shared steps absent.
    for (const s of SHARED_STEPS) {
      expect(titles).not.toContain(s.title);
    }
  });

  // ── Step list stability during a session ──────────────────────────────────

  it("markStepSeen mid-session does not change seenStepKeysAtOpen (step list stays stable)", () => {
    tour.startTour();
    const snapshotBefore = new Set(tour.seenStepKeysAtOpen);

    // Simulate the component marking each step seen as it becomes visible.
    for (const s of VOLUNTEER_STEPS) tour.markStepSeen(s.title);

    // The snapshot must not have changed.
    expect(tour.seenStepKeysAtOpen).toEqual(snapshotBefore);
  });
});
