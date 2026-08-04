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

interface WriteHealthState {
  lastFailure:   SfWriteFailure | null;
  lastSuccess:   string | null;  // ISO-8601 timestamp of last confirmed write
  totalAttempts: number;
  failedWrites:  number;
}

const state: WriteHealthState = {
  lastFailure:   null,
  lastSuccess:   null,
  totalAttempts: 0,
  failedWrites:  0,
};

export function recordSfWriteAttempt(): void {
  state.totalAttempts++;
}

export function recordSfWriteSuccess(): void {
  state.lastSuccess = new Date().toISOString();
}

export function recordSfWriteFailure(object: string, rawReason: string): void {
  state.failedWrites++;
  state.lastFailure = {
    object,
    reason:    rawReason.slice(0, 500),
    timestamp: new Date().toISOString(),
  };
}

export function getSfWriteHealth(): WriteHealthState & { healthyWrites: number } {
  return {
    ...state,
    healthyWrites: state.totalAttempts - state.failedWrites,
  };
}
