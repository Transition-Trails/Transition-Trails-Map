// ── Capability Setup Requirements ─────────────────────────────────────────────
// Defines what must be in place before each capability can be configured and
// activated. Consumed by useCapabilityPreflight (live SF checks) and the
// PennyCapabilityRegistry UI (display + Penny guidance).
//
// CAPABILITY_REQUIREMENTS is typed as Record<CapabilityId, ...> so TypeScript
// will fail if a new ID is added to CapabilityId without a matching entry here.
// The same constraint applies to BACKEND_REQUIREMENTS in api-server/src/routes/penny.ts.

import type { CapabilityId } from '@workspace/api-zod';

export type RequirementKind =
  | 'sf-field'        // a specific field on a specific SF object
  | 'sf-object'       // an SF object must be accessible
  | 'program-active'  // at least one matching SF program must be active
  | 'integration'     // an integration (salesforce, slack, etc.) must be connected
  | 'config';         // another capability must be active first (checked client-side)

export interface CapabilityRequirement {
  id: string;
  label: string;
  kind: RequirementKind;
  sfObject?: string;         // sf-field and sf-object
  sfField?: string;          // sf-field only — API name of the field
  integrationKey?: string;   // 'salesforce' | 'slack' etc.
  capabilityDep?: string;    // config: required capability ID
  fixRoute?: string;
  fixLabel?: string;
  /** What Penny says inline when this requirement is missing. */
  pennyMissingNote: string;
}

export const CAPABILITY_REQUIREMENTS: Record<CapabilityId, CapabilityRequirement[]> = {

  'cap-learner-coaching': [
    {
      id: 'salesforce-connected',
      label: 'Salesforce integration connected',
      kind: 'integration',
      integrationKey: 'salesforce',
      fixRoute: '/admin/integrations',
      fixLabel: 'Open Integrations',
      pennyMissingNote:
        'Without a Salesforce connection I have no learner context — I can\'t personalise anything.',
    },
    {
      id: 'sf-contact-accessible',
      label: 'Contact object accessible in Salesforce',
      kind: 'sf-object',
      sfObject: 'Contact',
      pennyMissingNote:
        'I read the Contact record to know who I\'m coaching and what program they\'re in.',
    },
    {
      id: 'sf-penny-trail-config',
      label: 'Penny_Trail_Config__c field on Contact',
      kind: 'sf-field',
      sfObject: 'Contact',
      sfField: 'Penny_Trail_Config__c',
      fixRoute: '/admin/integrations',
      fixLabel: 'Open SF Validation',
      pennyMissingNote:
        'This field links each learner to their Trail configuration. Without it I can\'t tailor coaching to their program.',
    },
    {
      id: 'sf-program-engagement',
      label: 'pmdm__ProgramEngagement__c object accessible',
      kind: 'sf-object',
      sfObject: 'pmdm__ProgramEngagement__c',
      pennyMissingNote:
        'I use engagement records to track progress and flag where learners need support.',
    },
  ],

  'cap-reflection-prompts': [
    {
      id: 'cap-learner-coaching-active',
      label: 'Learner Coaching capability active',
      kind: 'config',
      capabilityDep: 'cap-learner-coaching',
      fixRoute: '/penny/capabilities',
      fixLabel: 'Enable Learner Coaching',
      pennyMissingNote:
        'Reflection Prompts builds on Learner Coaching. Set that up first so I have the learner context needed for good reflections.',
    },
    {
      // Verified 2026-08-04: Training_Plan_Item__c does not exist in the live org.
      // Learner_Course_Module__c (14 fields, confirmed accessible) tracks module completion
      // per learner and is the correct object for reflection trigger events.
      id: 'sf-training-plan-item',
      label: 'Learner_Course_Module__c object accessible',
      kind: 'sf-object',
      sfObject: 'Learner_Course_Module__c',
      pennyMissingNote:
        'Module completion events come from Learner_Course_Module__c. I watch this to know when to send reflections.',
    },
    {
      id: 'slack-connected',
      label: 'Slack integration connected',
      kind: 'integration',
      integrationKey: 'slack',
      fixRoute: '/admin/integrations',
      fixLabel: 'Connect Slack',
      pennyMissingNote:
        'I deliver reflection prompts through Slack DMs. Without it I have no delivery channel.',
    },
  ],

  'cap-resume-review': [
    {
      id: 'salesforce-connected',
      label: 'Salesforce integration connected',
      kind: 'integration',
      integrationKey: 'salesforce',
      fixRoute: '/admin/integrations',
      fixLabel: 'Open Integrations',
      pennyMissingNote:
        'I need Salesforce to look up certification and program data before reviewing a learner\'s resume.',
    },
    {
      id: 'sf-contact-accessible',
      label: 'Contact object accessible in Salesforce',
      kind: 'sf-object',
      sfObject: 'Contact',
      pennyMissingNote:
        'I check certification progress and program stage from the Contact record to give role-specific feedback.',
    },
    {
      id: 'sf-program-engagement',
      label: 'pmdm__ProgramEngagement__c object accessible',
      kind: 'sf-object',
      sfObject: 'pmdm__ProgramEngagement__c',
      pennyMissingNote:
        'Program completion status helps me calibrate feedback — a Sprint 1 resume needs very different advice from a Sprint 6 one.',
    },
  ],

  'cap-interview-prep': [
    {
      id: 'cap-resume-review-active',
      label: 'Resume Review capability active',
      kind: 'config',
      capabilityDep: 'cap-resume-review',
      fixRoute: '/penny/capabilities',
      fixLabel: 'Enable Resume Review',
      pennyMissingNote:
        'Interview Prep works best after a polished resume is in place. Enable Resume Review first for the best learner experience.',
    },
    {
      id: 'sf-contact-accessible',
      label: 'Contact object accessible in Salesforce',
      kind: 'sf-object',
      sfObject: 'Contact',
      pennyMissingNote:
        'I need program completion data to select the right interview questions for each learner\'s stage.',
    },
  ],

  'cap-study-coach': [
    {
      id: 'cap-learner-coaching-active',
      label: 'Learner Coaching capability active',
      kind: 'config',
      capabilityDep: 'cap-learner-coaching',
      fixRoute: '/penny/capabilities',
      fixLabel: 'Enable Learner Coaching',
      pennyMissingNote: 'Study Coach extends Learner Coaching. Enable that first.',
    },
    {
      // Verified 2026-08-04: Training_Plan_Item__c does not exist in the live org.
      // Learner_Course_Module__c is the correct object for checking module progress and deadlines.
      id: 'sf-training-plan-item',
      label: 'Learner_Course_Module__c accessible',
      kind: 'sf-object',
      sfObject: 'Learner_Course_Module__c',
      pennyMissingNote:
        'I check module progress from Learner_Course_Module__c to send pacing alerts before it\'s too late.',
    },
    {
      id: 'sf-program-engagement',
      label: 'pmdm__ProgramEngagement__c accessible',
      kind: 'sf-object',
      sfObject: 'pmdm__ProgramEngagement__c',
      pennyMissingNote:
        'I need the engagement record to see where each learner is in their sprint and what\'s overdue.',
    },
  ],

  'cap-cohort-summaries': [
    {
      id: 'cap-learner-coaching-active',
      label: 'Learner Coaching capability active',
      kind: 'config',
      capabilityDep: 'cap-learner-coaching',
      fixRoute: '/penny/capabilities',
      fixLabel: 'Enable Learner Coaching',
      pennyMissingNote:
        'Cohort Summaries aggregates data that comes through Learner Coaching. Set that up first.',
    },
    {
      id: 'sf-service-schedule',
      label: 'pmdm__ServiceSchedule__c object accessible',
      kind: 'sf-object',
      sfObject: 'pmdm__ServiceSchedule__c',
      pennyMissingNote:
        'Program schedule data lives in pmdm__ServiceSchedule__c — I need it to generate cohort briefs.',
    },
    {
      id: 'slack-connected',
      label: 'Slack integration connected',
      kind: 'integration',
      integrationKey: 'slack',
      fixRoute: '/admin/integrations',
      fixLabel: 'Connect Slack',
      pennyMissingNote:
        'I deliver cohort summaries to the coach channel every Monday. Slack is required.',
    },
  ],

  'cap-progress-insights': [
    {
      id: 'cap-learner-coaching-active',
      label: 'Learner Coaching capability active',
      kind: 'config',
      capabilityDep: 'cap-learner-coaching',
      fixRoute: '/penny/capabilities',
      fixLabel: 'Enable Learner Coaching',
      pennyMissingNote: 'Progress Insights builds on Learner Coaching context. Enable that first.',
    },
    {
      id: 'sf-program-engagement',
      label: 'pmdm__ProgramEngagement__c accessible',
      kind: 'sf-object',
      sfObject: 'pmdm__ProgramEngagement__c',
      pennyMissingNote:
        'I track what each learner has completed by reading their Program_Engagement__c record.',
    },
  ],
};

const DEFAULT_REQUIREMENTS: CapabilityRequirement[] = [
  {
    id: 'salesforce-connected',
    label: 'Salesforce integration connected',
    kind: 'integration',
    integrationKey: 'salesforce',
    fixRoute: '/admin/integrations',
    fixLabel: 'Open Integrations',
    pennyMissingNote:
      'I need a Salesforce connection to access learner and program data for this capability.',
  },
  {
    id: 'sf-contact-accessible',
    label: 'Contact object accessible in Salesforce',
    kind: 'sf-object',
    sfObject: 'Contact',
    pennyMissingNote:
      'I need Contact access to personalise my responses for each learner.',
  },
];

export function getRequirements(capabilityId: string): CapabilityRequirement[] {
  // Cast to Record<string, ...> for the runtime lookup; the Record<CapabilityId, ...>
  // annotation above already guarantees every CapabilityId has an entry at compile time.
  return (CAPABILITY_REQUIREMENTS as Record<string, CapabilityRequirement[]>)[capabilityId] ?? DEFAULT_REQUIREMENTS;
}
