/**
 * In-process tracking for Salesforce fire-and-forget write health.
 *
 * The fire-and-forget design guarantees that a failed SF write never costs
 * the user their answer.  The tradeoff is that a persistent failure is
 * invisible unless surfaced explicitly.  This module gives each failure
 * somewhere a person will actually look — the Penny Command Center admin screen.
 *
 * State resets on server restart (intentional — stale errors from a previous
 * deployment are misleading).  The admin screen shows "since last restart"
 * so the scope is clear.
 */

export interface SfWriteFailure {
  object:    string;
  reason:    string;     // capped at 500 chars
  timestamp: string;     // ISO-8601
}

export interface SfWriteSkip {
  reason:    string;     // human-readable; capped at 200 chars
  timestamp: string;     // ISO-8601
}

interface WriteHealthState {
  lastFailure:        SfWriteFailure | null;
  lastSuccess:        string | null;  // ISO-8601 timestamp of last confirmed write
  totalAttempts:      number;
  failedWrites:       number;
  /** Subset of totalAttempts that originated from internal-staff sessions. */
  staffAttempts:      number;
  /** Subset of (totalAttempts - failedWrites) from internal-staff sessions. */
  staffSuccesses:     number;
  /**
   * Count of writes deliberately skipped (not attempted) because the SF schema
   * cannot accept them yet — e.g. staff sessions where Learner__c is required.
   * Skips are NOT failures; they are expected and tracked separately so the
   * write-health strip can show them as neutral rather than red.
   */
  staffSkips:         number;
  lastStaffSkip:      SfWriteSkip | null;
}

const state: WriteHealthState = {
  lastFailure:    null,
  lastSuccess:    null,
  totalAttempts:  0,
  failedWrites:   0,
  staffAttempts:  0,
  staffSuccesses: 0,
  staffSkips:     0,
  lastStaffSkip:  null,
};

export function recordSfWriteAttempt(isStaff = false): void {
  state.totalAttempts++;
  if (isStaff) state.staffAttempts++;
}

export function recordSfWriteSuccess(isStaff = false): void {
  state.lastSuccess = new Date().toISOString();
  if (isStaff) state.staffSuccesses++;
}

export function recordSfWriteFailure(object: string, rawReason: string): void {
  state.failedWrites++;
  state.lastFailure = {
    object,
    reason:    rawReason.slice(0, 500),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Record a deliberate skip — no SF write attempted because the schema cannot
 * accept this record type yet.  Skips are not failures and must not turn the
 * write-health strip red.
 */
export function recordSfWriteSkip(reason: string): void {
  state.staffSkips++;
  state.lastStaffSkip = {
    reason:    reason.slice(0, 200),
    timestamp: new Date().toISOString(),
  };
}

export function getSfWriteHealth(): WriteHealthState & { healthyWrites: number; learnerSuccesses: number } {
  const healthyWrites    = state.totalAttempts - state.failedWrites;
  const learnerSuccesses = healthyWrites - state.staffSuccesses;
  return {
    ...state,
    healthyWrites,
    learnerSuccesses,
  };
}
