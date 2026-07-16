/**
 * Data integrity tests for static Penny Prompt Studio data.
 * Catches regressions in shape, uniqueness, and enum constraints
 * before they reach the UI or get persisted to the DB.
 */
import { describe, test, expect } from 'vitest';
import {
  promptVariables,
  promptTemplates,
  outputFormats,
  versionHistory,
  PROMPT_STATUS_CONFIG,
  RISK_CONFIG,
  DOMAIN_CLS,
} from '../data/pennyPromptStudioData.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

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
      expect(item, `${label} item missing "${field}": ${JSON.stringify(item)}`).toHaveProperty(
        field,
      );
    }
  }
}

// ── Prompt Variables ─────────────────────────────────────────────────────────

describe('promptVariables static data', () => {
  test('non-empty array', () => {
    expect(promptVariables.length).toBeGreaterThan(0);
  });

  test('all variable IDs are unique', () => {
    allUnique(promptVariables.map(v => v.id), 'promptVariables');
  });

  test('all variable names are unique', () => {
    allUnique(promptVariables.map(v => v.name), 'promptVariables names');
  });

  test('each variable has required fields', () => {
    hasRequiredFields(
      promptVariables as unknown as Record<string, unknown>[],
      ['id', 'name', 'label', 'type', 'source', 'description'],
      'promptVariables',
    );
  });

  test('type is a valid VariableType', () => {
    const validTypes = new Set(['text', 'number', 'list', 'object', 'boolean']);
    for (const v of promptVariables) {
      expect(
        validTypes,
        `Unknown type "${v.type}" on variable ${v.id}`,
      ).toContain(v.type);
    }
  });

  test('source is a non-empty string', () => {
    for (const v of promptVariables) {
      expect(typeof v.source, `source on variable ${v.id}`).toBe('string');
      expect((v.source as string).length, `empty source on variable ${v.id}`).toBeGreaterThan(0);
    }
  });
});

// ── Prompt Templates ─────────────────────────────────────────────────────────

describe('promptTemplates static data', () => {
  test('non-empty array', () => {
    expect(promptTemplates.length).toBeGreaterThan(0);
  });

  test('all template IDs are unique', () => {
    allUnique(promptTemplates.map(t => t.id), 'promptTemplates');
  });

  test('all template names are unique', () => {
    allUnique(promptTemplates.map(t => t.name), 'promptTemplates names');
  });

  test('each template has required fields', () => {
    hasRequiredFields(
      promptTemplates as unknown as Record<string, unknown>[],
      ['id', 'name', 'domain', 'status', 'hallucinationRisk'],
      'promptTemplates',
    );
  });

  test('status is a valid PromptStatus', () => {
    const validStatuses = new Set(Object.keys(PROMPT_STATUS_CONFIG));
    for (const t of promptTemplates) {
      expect(
        validStatuses,
        `Unknown status "${t.status}" on template ${t.id}`,
      ).toContain(t.status);
    }
  });

  test('hallucinationRisk is a valid value', () => {
    const validRisks = new Set(Object.keys(RISK_CONFIG));
    for (const t of promptTemplates) {
      expect(
        validRisks,
        `Unknown hallucinationRisk "${t.hallucinationRisk}" on template ${t.id}`,
      ).toContain(t.hallucinationRisk);
    }
  });

  test('domain is a valid PromptDomain', () => {
    const validDomains = new Set(Object.keys(DOMAIN_CLS));
    for (const t of promptTemplates) {
      expect(
        validDomains,
        `Unknown domain "${t.domain}" on template ${t.id}`,
      ).toContain(t.domain);
    }
  });

  test('PROMPT_STATUS_CONFIG covers all statuses present in templates', () => {
    const usedStatuses = new Set(promptTemplates.map(t => t.status));
    for (const status of usedStatuses) {
      expect(PROMPT_STATUS_CONFIG).toHaveProperty(status);
    }
  });
});

// ── Output Formats ────────────────────────────────────────────────────────────

describe('outputFormats static data', () => {
  test('non-empty array', () => {
    expect(outputFormats.length).toBeGreaterThan(0);
  });

  test('all format IDs are unique', () => {
    allUnique(outputFormats.map(f => f.id), 'outputFormats');
  });

  test('each format has id, name, and description', () => {
    hasRequiredFields(
      outputFormats as unknown as Record<string, unknown>[],
      ['id', 'name', 'description'],
      'outputFormats',
    );
  });
});

// ── Version History ──────────────────────────────────────────────────────────

describe('versionHistory static data', () => {
  test('non-empty array', () => {
    expect(versionHistory.length).toBeGreaterThan(0);
  });

  test('each entry has required fields', () => {
    hasRequiredFields(
      versionHistory as unknown as Record<string, unknown>[],
      ['version', 'date', 'author'],
      'versionHistory',
    );
  });

  test('versions are non-empty strings', () => {
    for (const entry of versionHistory) {
      expect(typeof entry.version).toBe('string');
      expect(entry.version.length).toBeGreaterThan(0);
    }
  });
});

// ── Config maps ───────────────────────────────────────────────────────────────

describe('PROMPT_STATUS_CONFIG', () => {
  test('has at least Draft, Review, Approved, Deprecated', () => {
    expect(PROMPT_STATUS_CONFIG).toHaveProperty('Draft');
    expect(PROMPT_STATUS_CONFIG).toHaveProperty('Review');
    expect(PROMPT_STATUS_CONFIG).toHaveProperty('Approved');
    expect(PROMPT_STATUS_CONFIG).toHaveProperty('Deprecated');
  });

  test('each entry has cls and order', () => {
    for (const [key, val] of Object.entries(PROMPT_STATUS_CONFIG)) {
      expect(val, `PROMPT_STATUS_CONFIG[${key}]`).toHaveProperty('cls');
      expect(val, `PROMPT_STATUS_CONFIG[${key}]`).toHaveProperty('order');
    }
  });
});

describe('RISK_CONFIG', () => {
  test('has Low, Medium, High', () => {
    expect(RISK_CONFIG).toHaveProperty('Low');
    expect(RISK_CONFIG).toHaveProperty('Medium');
    expect(RISK_CONFIG).toHaveProperty('High');
  });

  test('each entry has cls and description', () => {
    for (const [key, val] of Object.entries(RISK_CONFIG)) {
      expect(val, `RISK_CONFIG[${key}]`).toHaveProperty('cls');
      expect(val, `RISK_CONFIG[${key}]`).toHaveProperty('description');
    }
  });
});
