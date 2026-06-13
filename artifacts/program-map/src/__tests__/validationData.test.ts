/**
 * Metadata integrity tests for Slack, Calendar, and Drive validation data.
 * These assert the shape, uniqueness, and count of every check entry — so
 * regressions in data files are caught before they reach the UI.
 */
import { describe, test, expect } from 'vitest';

import {
  SLACK_CHANNELS,
  SLACK_USER_MAPPINGS,
  SLACK_TESTS,
  SLACK_HEALTH_SCORES,
  PENNY_SLACK_CAPABILITIES,
  SLACK_TEMPLATES,
  SLACK_GOVERNANCE,
} from '../data/slackIntegrationData.js';

import {
  CAL_VALIDATION_CHECKS,
  CAL_TEST_SUITES,
  CAL_HEALTH_SCORES,
  CAL_GOVERNANCE_ISSUES,
} from '../data/googleCalendarData.js';

import {
  DRIVE_VALIDATION_CHECKS,
  DRIVE_HEALTH_SCORES,
  DRIVE_GOVERNANCE_ISSUES,
  getDriveValidationSummary,
} from '../data/googleDriveData.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function allUnique(ids: string[], label: string) {
  const set = new Set(ids);
  expect(set.size, `${label}: duplicate IDs detected`).toBe(ids.length);
}

function hasRequiredFields(
  items: Record<string, unknown>[],
  fields: string[],
  label: string,
) {
  for (const item of items) {
    for (const field of fields) {
      expect(item, `${label} item missing "${field}": ${JSON.stringify(item)}`).toHaveProperty(field);
    }
  }
}

// ── Slack ──────────────────────────────────────────────────────────────────────

describe('Slack channels', () => {
  test('non-empty array', () => {
    expect(SLACK_CHANNELS.length).toBeGreaterThan(0);
  });

  test('all channel IDs are unique', () => {
    allUnique(SLACK_CHANNELS.map(c => c.id), 'SLACK_CHANNELS');
  });

  test('each channel has required fields', () => {
    hasRequiredFields(
      SLACK_CHANNELS as unknown as Record<string, unknown>[],
      ['id', 'name', 'purpose', 'lifecycle'],
      'SLACK_CHANNELS',
    );
  });
});

describe('Slack user mappings', () => {
  test('non-empty array', () => {
    expect(SLACK_USER_MAPPINGS.length).toBeGreaterThan(0);
  });

  test('all mapping IDs are unique', () => {
    allUnique(SLACK_USER_MAPPINGS.map(m => m.id), 'SLACK_USER_MAPPINGS');
  });
});

describe('Slack test scenarios', () => {
  test('non-empty array', () => {
    expect(SLACK_TESTS.length).toBeGreaterThan(0);
  });

  test('all scenario IDs are unique', () => {
    allUnique(SLACK_TESTS.map(s => s.id), 'SLACK_TESTS');
  });

  test('each scenario has id, category, name, status', () => {
    hasRequiredFields(
      SLACK_TESTS as unknown as Record<string, unknown>[],
      ['id', 'category', 'name', 'status'],
      'SLACK_TESTS',
    );
  });

  test('status is a known value', () => {
    const valid = new Set(['passing', 'partial', 'pending', 'failing']);
    for (const s of SLACK_TESTS) {
      expect(valid, `Unknown status "${s.status}" on scenario ${s.id}`).toContain(s.status);
    }
  });
});

describe('Slack health scores', () => {
  test('non-empty array', () => {
    expect(SLACK_HEALTH_SCORES.length).toBeGreaterThan(0);
  });

  test('scores are within 0–maxScore range', () => {
    for (const hs of SLACK_HEALTH_SCORES) {
      expect(hs.score).toBeGreaterThanOrEqual(0);
      expect(hs.score).toBeLessThanOrEqual(hs.maxScore);
    }
  });
});

// ── Calendar ───────────────────────────────────────────────────────────────────

describe('Calendar validation checks', () => {
  test('non-empty array', () => {
    expect(CAL_VALIDATION_CHECKS.length).toBeGreaterThan(0);
  });

  test('all check IDs are unique', () => {
    allUnique(CAL_VALIDATION_CHECKS.map(c => c.id), 'CAL_VALIDATION_CHECKS');
  });

  test('each check has id, category, label, status', () => {
    hasRequiredFields(
      CAL_VALIDATION_CHECKS as unknown as Record<string, unknown>[],
      ['id', 'category', 'label', 'status'],
      'CAL_VALIDATION_CHECKS',
    );
  });

  test('status is a known value', () => {
    const valid = new Set(['pass', 'fail', 'warning', 'pending', 'blocked']);
    for (const c of CAL_VALIDATION_CHECKS) {
      expect(valid, `Unknown status "${c.status}" on check ${c.id}`).toContain(c.status);
    }
  });
});

describe('Calendar test suites', () => {
  test('non-empty suite list', () => {
    expect(CAL_TEST_SUITES.length).toBeGreaterThan(0);
  });

  test('all suite IDs are unique', () => {
    allUnique(CAL_TEST_SUITES.map(s => s.id), 'CAL_TEST_SUITES');
  });

  test('each suite has at least one test', () => {
    for (const suite of CAL_TEST_SUITES) {
      expect(suite.tests.length, `Suite "${suite.id}" has no tests`).toBeGreaterThan(0);
    }
  });

  test('all individual test IDs are unique across all suites', () => {
    const ids = CAL_TEST_SUITES.flatMap(s => s.tests.map(t => t.id));
    allUnique(ids, 'CAL_TEST_SUITES individual tests');
  });
});

describe('Calendar health scores', () => {
  test('scores are within 0–maxScore range', () => {
    for (const hs of CAL_HEALTH_SCORES) {
      expect(hs.score).toBeGreaterThanOrEqual(0);
      expect(hs.score).toBeLessThanOrEqual(hs.maxScore);
    }
  });
});

describe('Calendar governance issues', () => {
  test('all governance issue IDs are unique', () => {
    allUnique(CAL_GOVERNANCE_ISSUES.map(g => g.id), 'CAL_GOVERNANCE_ISSUES');
  });
});

// ── Drive ──────────────────────────────────────────────────────────────────────

describe('Drive validation checks', () => {
  test('non-empty array', () => {
    expect(DRIVE_VALIDATION_CHECKS.length).toBeGreaterThan(0);
  });

  test('all check IDs are unique', () => {
    allUnique(DRIVE_VALIDATION_CHECKS.map(c => c.id), 'DRIVE_VALIDATION_CHECKS');
  });

  test('each check has id, category, label, status', () => {
    hasRequiredFields(
      DRIVE_VALIDATION_CHECKS as unknown as Record<string, unknown>[],
      ['id', 'category', 'label', 'status'],
      'DRIVE_VALIDATION_CHECKS',
    );
  });

  test('status is a known value', () => {
    const valid = new Set(['pass', 'fail', 'warning', 'pending', 'blocked']);
    for (const c of DRIVE_VALIDATION_CHECKS) {
      expect(valid, `Unknown status "${c.status}" on check ${c.id}`).toContain(c.status);
    }
  });
});

describe('Drive health scores', () => {
  test('all dimension IDs are unique', () => {
    allUnique(DRIVE_HEALTH_SCORES.map(h => h.dimension), 'DRIVE_HEALTH_SCORES');
  });

  test('scores are within 0–maxScore range', () => {
    for (const hs of DRIVE_HEALTH_SCORES) {
      expect(hs.score).toBeGreaterThanOrEqual(0);
      expect(hs.score).toBeLessThanOrEqual(hs.maxScore);
    }
  });
});

describe('Drive governance issues', () => {
  test('all governance issue IDs are unique', () => {
    allUnique(DRIVE_GOVERNANCE_ISSUES.map(g => g.id), 'DRIVE_GOVERNANCE_ISSUES');
  });
});

describe('getDriveValidationSummary()', () => {
  test('returns pass, fail, warning, pending counts', () => {
    const summary = getDriveValidationSummary();
    expect(typeof summary.pass).toBe('number');
    expect(typeof summary.fail).toBe('number');
    expect(typeof summary.warning).toBe('number');
    expect(typeof summary.pending).toBe('number');
  });

  test('pass+fail+warning+pending equals total checks', () => {
    const summary = getDriveValidationSummary();
    const counted = (summary.pass ?? 0) + (summary.fail ?? 0) + (summary.warning ?? 0) + (summary.pending ?? 0);
    expect(counted).toBe(DRIVE_VALIDATION_CHECKS.length);
  });

  test('no negative counts', () => {
    const summary = getDriveValidationSummary();
    for (const [key, val] of Object.entries(summary)) {
      expect(val as number, `${key} should not be negative`).toBeGreaterThanOrEqual(0);
    }
  });
});
