import { TERMS } from '@/config/terminology';

export interface PlatformRole {
  id:               string;
  title:            string;
  domain:           string;
  description:      string;
  responsibilities: string[];
  requiredTier:     'everyday' | 'power' | 'admin' | 'superadmin';
  owner:            string;
  ownerEmail:       string;
}

export const INITIAL_PLATFORM_ROLES: PlatformRole[] = [
  {
    id: 'penny-admin',
    title: `${TERMS.aiAssistant} Admin`,
    domain: 'Penny AI',
    description: 'Owns prompt governance, source trust management, capability quality monitoring, and RAG pipeline health.',
    responsibilities: ['Approve and version all prompt templates', 'Review source trust assignments', 'Monitor capability quality metrics', 'Define prompt governance SLA', 'Manage Penny capability registry'],
    requiredTier: 'power',
    owner: 'Angela Landrith',
    ownerEmail: 'angela@transitiontrails.org',
  },
  {
    id: 'knowledge-manager',
    title: 'Knowledge Manager',
    domain: 'Knowledge Library',
    description: 'Manages knowledge source trust reviews, category mapping, and the review cadence across all sources.',
    responsibilities: ['Conduct quarterly source trust reviews', 'Approve new sources for Penny ingestion', 'Maintain category mapping completeness', 'Escalate stale or unverified sources'],
    requiredTier: 'power',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'curriculum-lead',
    title: 'Curriculum Lead',
    domain: 'Curriculum Studio',
    description: 'Owns module and lesson standards, curriculum design decisions, and LMS content governance.',
    responsibilities: ['Author and update Standards Studio rules', 'Approve module outlines and lesson frameworks', 'Manage Curriculum Studio content', 'Coordinate with Penny Lead on curriculum assets'],
    requiredTier: 'power',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'standards-lead',
    title: 'Standards Lead',
    domain: 'Standards Studio',
    description: 'Owns Standards Studio quality rules, enforces content standards compliance, and gates Penny output quality.',
    responsibilities: ['Define and update quality standards', 'Review Penny outputs for standard compliance', 'Escalate standards violations', 'Maintain the Penny Blueprint standard'],
    requiredTier: 'power',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'salesforce-admin',
    title: 'Salesforce Admin',
    domain: 'Operations & Integrations',
    description: 'Owns Salesforce data model integrity, integration health, and SF-to-Trail-OS object mapping.',
    responsibilities: ['Maintain SF object and field mapping', 'Monitor Salesforce integration health', 'Manage permission sets and profiles', 'Validate data sync between SF and Trail OS'],
    requiredTier: 'admin',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'coach-team-lead',
    title: 'Coach Team Lead',
    domain: 'Coaching & Delivery',
    description: 'Owns Coach Notes standard adherence, cohort coaching quality, and escalation protocols.',
    responsibilities: ['Enforce Coach Notes standard (100% adherence target)', 'Manage coach escalation protocols', 'Review Penny coaching output quality', 'Coordinate with Penny Admin on coaching capabilities'],
    requiredTier: 'everyday',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'platform-admin',
    title: 'Platform Admin',
    domain: 'Administration',
    description: 'Owns Trail OS configuration, secrets management, integration credentials, and deployment governance.',
    responsibilities: ['Manage Replit Secrets and environment config', 'Own integration token lifecycle', 'Govern Trail OS phase transitions', 'Manage Google Workspace and Clerk setup'],
    requiredTier: 'superadmin',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'alumni-learner-lead',
    title: 'Alumni Learner Lead',
    domain: 'Learner Experience',
    description: 'Owns the Alumni Learner persona experience — engagement continuity, outcomes tracking, and alumni-specific Penny capabilities.',
    responsibilities: ['Define alumni re-engagement pathways', 'Review Penny alumni brief quality', 'Maintain alumni Program Engagement records in Salesforce', 'Coordinate alumni events and milestone tracking'],
    requiredTier: 'everyday',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'volunteer-mentor-lead',
    title: 'Volunteer Mentor Lead',
    domain: 'Mentoring & Volunteering',
    description: 'Owns the Volunteer Mentor persona blueprint, Salesforce Volunteer record type integrity, and mentor matching quality.',
    responsibilities: ['Author Volunteer Mentor blueprint in People & Roles Studio', 'Maintain Volunteer Job record type in Salesforce', 'Review Penny mentor matching capability', 'Manage volunteer onboarding and shift tracking'],
    requiredTier: 'everyday',
    owner: '',
    ownerEmail: '',
  },
  {
    id: 'employer-partner-lead',
    title: 'Employer Partner Lead',
    domain: 'Employer Engagement',
    description: 'Owns the Employer Partner persona model, Salesforce Account object integrity, and the Phase 3 employer matching roadmap.',
    responsibilities: ['Define Employer Partner Account record type in Salesforce', 'Map skill requirements to curriculum standards', 'Own employer relationship management in Trail OS', 'Coordinate Phase 3 Penny employer matching planning'],
    requiredTier: 'everyday',
    owner: '',
    ownerEmail: '',
  },
];
