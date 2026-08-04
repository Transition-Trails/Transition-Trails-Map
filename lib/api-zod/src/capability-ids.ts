/**
 * Canonical set of Penny capability IDs.
 *
 * This is the single source of truth for which capabilities exist.
 * Both the frontend CAPABILITY_REQUIREMENTS map and the backend BACKEND_REQUIREMENTS
 * map are typed as `Record<CapabilityId, ...>` so TypeScript will error at compile
 * time if either map is missing an entry when a new capability is added here.
 *
 * To add a capability:
 *   1. Add its ID to this union.
 *   2. Add an entry to CAPABILITY_REQUIREMENTS in
 *      artifacts/program-map/src/data/capabilityRequirements.ts
 *   3. Add an entry to BACKEND_REQUIREMENTS in
 *      artifacts/api-server/src/routes/penny.ts
 * TypeScript will report errors in steps 2 and 3 until both maps are updated.
 */
export type CapabilityId =
  | 'cap-learner-coaching'
  | 'cap-reflection-prompts'
  | 'cap-resume-review'
  | 'cap-interview-prep'
  | 'cap-study-coach'
  | 'cap-cohort-summaries'
  | 'cap-progress-insights';
