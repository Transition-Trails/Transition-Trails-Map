import { describe, test, it, expect } from 'vitest';
import {
  assemblePrompt,
  layer1Identity,
  layer2TrailContext,
  layer3LearnerContext,
  layer4Knowledge,
  layer5ActiveQuest,
  layer6CareerReview,
  layer7MemoryWindow,
  type MemoryExchange,
} from '../lib/pennyPromptAssembler.js';
import type { TrailConfig, LearnerContext } from '../types/salesforce.js';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeTrailConfig(overrides?: Partial<TrailConfig>): TrailConfig {
  return {
    id: 'cfg-1', name: 'Explorer Config', trailId: 'explorer-journey',
    pennyRole: null, tone: null, focalPoints: null, specialInstructions: null,
    isActive: true,
    ...overrides,
  };
}

function makeLearnerContext(overrides?: Partial<LearnerContext>): LearnerContext {
  return {
    id: 'c-1', firstName: 'Alex', lastName: 'Rivera', email: 'alex@test.com',
    pennyTrail: 'explorer-journey', pennyTrailConfigId: 'cfg-1',
    currentPhase: 'Explore', currentGoal: 'Build SF org skills', currentBlockers: null,
    coachingTone: 'encouraging', confidenceScore: 7, skillScore: 6, sprintWeek: 3,
    onboardingComplete: true,
    ...overrides,
  };
}

// ── Required acceptance tests ─────────────────────────────────────────────────

describe('assemblePrompt — acceptance tests', () => {
  test('a request with no learner context still produces a valid prompt', () => {
    // This is the internal-user / no-SF-data path.
    const { systemPrompt, layersPresent } = assemblePrompt({});

    expect(systemPrompt.length).toBeGreaterThan(100);
    expect(layersPresent).toContain('identity');
    // No data layers should appear
    expect(layersPresent).not.toContain('trail-context');
    expect(layersPresent).not.toContain('learner-context');
    expect(layersPresent).not.toContain('knowledge');
    // Empty layers must never appear
    expect(layersPresent).not.toContain('active-quest');
    expect(layersPresent).not.toContain('career-review');
    expect(layersPresent).not.toContain('memory-window');
  });

  test('a layer with data appears in the output; empty layers do not', () => {
    const { systemPrompt, layersPresent } = assemblePrompt({
      trailConfig: makeTrailConfig({ trailId: 'explorer-journey' }),
    });

    // Trail context was provided — it must be present
    expect(layersPresent).toContain('trail-context');
    expect(systemPrompt).toContain('explorer-journey');

    // Layers 5–7 have no data and must be absent
    expect(layersPresent).not.toContain('active-quest');
    expect(layersPresent).not.toContain('career-review');
    expect(layersPresent).not.toContain('memory-window');
  });
});

// ── Layer 1: Identity ─────────────────────────────────────────────────────────

describe('layer1Identity', () => {
  test('internal audience returns the PENNY_BASE content verbatim', () => {
    const text = layer1Identity('internal');
    expect(text).toContain('AI Chief of Staff');
    expect(text).toContain('Transition Trails Academy');
    expect(text).toContain('RESOLVE framework');
  });

  test('learner audience returns its own standalone coaching identity, not the internal identity', () => {
    const learner = layer1Identity('learner');
    const internal = layer1Identity('internal');
    // Learner identity is implemented and distinct from internal
    expect(learner).toContain('coaching companion');
    expect(learner).not.toContain('AI Chief of Staff');
    expect(internal).not.toContain('coaching companion');
    expect(learner).not.toBe(internal);
  });

  test('unimplemented audiences (coach/client/public) fall back to internal', () => {
    // coach, client, public are null placeholders — they fall through to internal.
    const internal = layer1Identity('internal');
    expect(layer1Identity('coach')).toBe(internal);
    expect(layer1Identity('client')).toBe(internal);
    expect(layer1Identity('public')).toBe(internal);
  });

  test('superadmin role appends the superadmin context paragraph', () => {
    const text = layer1Identity('internal', 'superadmin');
    expect(text).toContain('Super Admin');
  });

  test('admin role appends the admin context paragraph', () => {
    const text = layer1Identity('internal', 'admin');
    expect(text).toContain('Tailor responses to team operations');
  });

  test('unknown role appends nothing', () => {
    const base     = layer1Identity('internal');
    const withJunk = layer1Identity('internal', 'unknown-role');
    expect(withJunk).toBe(base);
  });

  test('no role and explicit undefined produce identical output', () => {
    expect(layer1Identity('internal')).toBe(layer1Identity('internal', undefined));
  });
});

// ── Layer 2: Trail Context ────────────────────────────────────────────────────

describe('layer2TrailContext', () => {
  test('returns null when config is null', () => {
    expect(layer2TrailContext(null)).toBeNull();
  });

  test('returns null when config is undefined', () => {
    expect(layer2TrailContext(undefined)).toBeNull();
  });

  test('includes trail ID and its persona text', () => {
    const text = layer2TrailContext(makeTrailConfig({ trailId: 'guided-trail' }));
    expect(text).not.toBeNull();
    expect(text).toContain('guided-trail');
    expect(text).toContain('TrailPenny');
  });

  test('includes optional fields only when they are present', () => {
    const full = layer2TrailContext(makeTrailConfig({ tone: 'direct', focalPoints: 'résumé work' }));
    expect(full).toContain('Tone: direct');
    expect(full).toContain('Focal points: résumé work');

    const bare = layer2TrailContext(makeTrailConfig({ tone: null, focalPoints: null }));
    expect(bare).not.toContain('Tone:');
    expect(bare).not.toContain('Focal points:');
  });

  test('adds inactive warning when isActive is false', () => {
    const text = layer2TrailContext(makeTrailConfig({ isActive: false }));
    expect(text).toContain('inactive');
  });

  test('unknown trail ID produces output without crashing', () => {
    const text = layer2TrailContext(makeTrailConfig({ trailId: 'future-trail' }));
    expect(text).not.toBeNull();
    expect(text).toContain('future-trail');
  });
});

// ── Layer 3: Learner Context ──────────────────────────────────────────────────

describe('layer3LearnerContext', () => {
  test('returns null when context is null', () => {
    expect(layer3LearnerContext(null)).toBeNull();
  });

  test('returns null when context is undefined', () => {
    expect(layer3LearnerContext(undefined)).toBeNull();
  });

  test('includes learner name and populated state fields', () => {
    const text = layer3LearnerContext(makeLearnerContext());
    expect(text).not.toBeNull();
    expect(text).toContain('Alex Rivera');
    expect(text).toContain('Explore');
    expect(text).toContain('Build SF org skills');
    expect(text).toContain('7/10');
    expect(text).toContain('Sprint week: 3');
  });

  test('adds the onboarding warning when onboardingComplete is false', () => {
    const text = layer3LearnerContext(makeLearnerContext({ onboardingComplete: false }));
    expect(text).toContain('Onboarding not yet complete');
  });

  test('omits null fields rather than printing the string "null"', () => {
    const text = layer3LearnerContext(
      makeLearnerContext({ currentBlockers: null, coachingTone: null, confidenceScore: null })
    );
    expect(text).not.toContain('null');
    expect(text).not.toContain('Current blockers:');
    expect(text).not.toContain('Coaching tone:');
    expect(text).not.toContain('Confidence score:');
  });
});

// ── Layer 4: Knowledge ────────────────────────────────────────────────────────

describe('layer4Knowledge', () => {
  test('returns null for an empty array', () => {
    expect(layer4Knowledge([])).toBeNull();
  });

  test('returns null when chunks is undefined', () => {
    expect(layer4Knowledge(undefined)).toBeNull();
  });

  test('formats chunks with numbered source headings', () => {
    const chunks = [
      { name: 'RESOLVE Guide', category: 'framework', sourceType: 'doc', snippet: 'Recognize is first.', relevance: 0.9 },
      { name: 'Cohort SOP',    category: 'process',   sourceType: 'doc', snippet: 'Three cohorts per year.', relevance: 0.7 },
    ];
    const text = layer4Knowledge(chunks);
    expect(text).not.toBeNull();
    expect(text).toContain('Source 1');
    expect(text).toContain('RESOLVE Guide');
    expect(text).toContain('Recognize is first.');
    expect(text).toContain('Source 2');
    expect(text).toContain('Three cohorts per year.');
  });
});

// ── Layers 5–7: Empty extension points ───────────────────────────────────────

describe('empty layers 5–7', () => {
  test('layer5ActiveQuest returns null', () => {
    expect(layer5ActiveQuest()).toBeNull();
  });

  test('layer6CareerReview returns null', () => {
    expect(layer6CareerReview()).toBeNull();
  });

  test('layer7MemoryWindow returns null', () => {
    expect(layer7MemoryWindow()).toBeNull();
  });
});

// ── assemblePrompt — integration ──────────────────────────────────────────────

describe('assemblePrompt — integration', () => {
  test('all three data-bearing layers appear when data is provided', () => {
    const { systemPrompt, layersPresent } = assemblePrompt({
      audience: 'learner',
      trailConfig: makeTrailConfig(),
      learnerContext: makeLearnerContext(),
      retrievedChunks: [
        { name: 'Doc', category: 'cat', sourceType: 'type', snippet: 'Content here.', relevance: 1 },
      ],
    });

    expect(layersPresent).toEqual(['identity', 'trail-context', 'learner-context', 'knowledge']);
    // audience:'learner' → learner coaching identity (not the internal ops identity)
    expect(systemPrompt).toContain('coaching companion');
    expect(systemPrompt).toContain('TRAIL CONTEXT');
    expect(systemPrompt).toContain('LEARNER CONTEXT');
    expect(systemPrompt).toContain('Retrieved Knowledge');
  });

  test('layers are joined with double newlines', () => {
    const { systemPrompt } = assemblePrompt({ trailConfig: makeTrailConfig() });
    // The separator between identity and trail context must be \n\n
    expect(systemPrompt).toMatch(/\n\n/);
  });

  test('layersPresent is exactly [identity] when no optional data is supplied', () => {
    const { layersPresent } = assemblePrompt({});
    expect(layersPresent).toHaveLength(1);
    expect(layersPresent[0]).toBe('identity');
  });

  test('knowledge layer is present when chunks are supplied, absent when empty', () => {
    const withChunks = assemblePrompt({
      retrievedChunks: [{ name: 'X', category: 'c', sourceType: 's', snippet: 'y', relevance: 1 }],
    });
    expect(withChunks.layersPresent).toContain('knowledge');

    const withoutChunks = assemblePrompt({ retrievedChunks: [] });
    expect(withoutChunks.layersPresent).not.toContain('knowledge');
  });

  test('systemPrompt is non-empty even when every optional input is null/absent', () => {
    const { systemPrompt } = assemblePrompt({
      audience: 'internal',
      role: undefined,
      trailConfig: null,
      learnerContext: null,
      retrievedChunks: [],
    });
    expect(systemPrompt.trim().length).toBeGreaterThan(0);
  });

  test('memory-window appears in layersPresent when recentExchanges is non-empty', () => {
    const ex: MemoryExchange = {
      userMessage: 'What phase am I in?', pennyResponse: 'Explore phase.', createdDate: '2026-08-03T14:00:00.000Z',
    };
    const { layersPresent } = assemblePrompt({ recentExchanges: [ex] });
    expect(layersPresent).toContain('memory-window');
  });

  test('memory-window is absent from layersPresent when recentExchanges is empty', () => {
    const { layersPresent } = assemblePrompt({ recentExchanges: [] });
    expect(layersPresent).not.toContain('memory-window');
  });

  test('memory-window is absent when recentExchanges is not provided', () => {
    const { layersPresent } = assemblePrompt({});
    expect(layersPresent).not.toContain('memory-window');
  });
});

// ── Layer 7: Memory Window ────────────────────────────────────────────────────

function makeExchange(
  userMessage: string,
  pennyResponse: string,
  createdDate = '2026-08-03T14:00:00.000Z'
): MemoryExchange {
  return { userMessage, pennyResponse, createdDate };
}

describe('layer7MemoryWindow', () => {
  it('returns null when called with no argument', () => {
    expect(layer7MemoryWindow()).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(layer7MemoryWindow([])).toBeNull();
  });

  it('returns a non-null string for a single exchange', () => {
    const result = layer7MemoryWindow([makeExchange('Hello Penny', 'Hi there!')]);
    expect(result).not.toBeNull();
    expect(result).toContain('Hello Penny');
    expect(result).toContain('Hi there!');
  });

  it('includes the date formatted as UTC in the output', () => {
    const result = layer7MemoryWindow([makeExchange('Q', 'A', '2026-08-03T14:30:00.000Z')]);
    expect(result).toContain('2026-08-03 14:30 UTC');
  });

  it('includes "CONVERSATION HISTORY" header', () => {
    const result = layer7MemoryWindow([makeExchange('Q', 'A')]);
    expect(result).toContain('CONVERSATION HISTORY');
  });

  it('truncates user message longer than 500 chars', () => {
    const longQ = 'Q'.repeat(600);
    const result = layer7MemoryWindow([makeExchange(longQ, 'A')])!;
    // The stored question must be shorter than the original
    expect(result.length).toBeLessThan(longQ.length + 300);
    expect(result).toContain('…');
  });

  it('does not truncate user message within 500 chars', () => {
    const shortQ = 'Short question';
    const result = layer7MemoryWindow([makeExchange(shortQ, 'A')])!;
    expect(result).toContain(shortQ);
    expect(result).not.toContain('…');
  });

  it('truncates Penny response longer than 800 chars', () => {
    const longA = 'A'.repeat(900);
    const result = layer7MemoryWindow([makeExchange('Q', longA)])!;
    expect(result).toContain('…');
  });

  it('does not truncate Penny response within 800 chars', () => {
    const shortA = 'Short answer';
    const result = layer7MemoryWindow([makeExchange('Q', shortA)])!;
    expect(result).toContain(shortA);
  });

  it('caps at 5 exchanges even when more are passed', () => {
    const exchanges = Array.from({ length: 8 }, (_, i) =>
      makeExchange(`Question ${i}`, `Answer ${i}`, `2026-08-03T${String(i).padStart(2,'0')}:00:00.000Z`)
    );
    const result = layer7MemoryWindow(exchanges)!;
    expect(result).toContain('Question 0');
    expect(result).toContain('Question 4');
    expect(result).not.toContain('Question 5');
    expect(result).not.toContain('Question 6');
    expect(result).not.toContain('Question 7');
  });

  it('outputs exchanges in chronological order (oldest first)', () => {
    // Input is newest-first (as SF returns them); output should be oldest-first
    const exchanges = [
      makeExchange('Second question', 'Second answer', '2026-08-03T15:00:00.000Z'),
      makeExchange('First question',  'First answer',  '2026-08-03T14:00:00.000Z'),
    ];
    const result = layer7MemoryWindow(exchanges)!;
    const firstIdx  = result.indexOf('First question');
    const secondIdx = result.indexOf('Second question');
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it('handles a single exchange without an ellipsis when content is short', () => {
    const result = layer7MemoryWindow([makeExchange('Short Q', 'Short A')])!;
    expect(result).not.toContain('…');
  });
});
