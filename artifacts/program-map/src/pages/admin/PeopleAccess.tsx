import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Users, Shield, Star, Brain, Globe, Chrome, Network, Mail,
  CheckCircle2, XCircle, MinusCircle,
  ArrowUpDown, ArrowUp, ArrowDown, Search, X, ChevronRight,
  Pencil, UserCheck, AlertTriangle, Save, ChevronDown,
  ScrollText, CalendarDays, Clock, Loader2, ChevronUp,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TIER_CONFIG, TIER_FEATURES, TIER_NAV_SUMMARY, TIER_ORDER,
  type AccessTier,
} from '@/config/accessTiers';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import type { PlatformRole } from '@/data/platformRoles';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'matrix' | 'access' | 'owners' | 'audit';

type TierKey = 'everyday' | 'power' | 'admin' | 'superadmin';
type FilterTier   = TierKey | 'all';
type FilterType   = 'all' | 'Learner' | 'Staff' | 'Admin' | 'Volunteer' | 'Sponsor' | 'Partner';
type FilterHealth = 'all' | 'healthy' | 'needs-attention' | 'incomplete';
type SortKey      = 'persona' | 'type' | 'tier' | 'health';
type SortDir      = 'asc' | 'desc';

// ── Role definition matrix ───────────────────────────────────────────────────
// These rows are authoritative role archetypes, not per-user records.
// Health reflects real configuration gaps: missing auth method, unverified SF
// access, or no Google Group assignment. Update here when onboarding a new role.

interface MatrixRow {
  persona:       string;
  type:          string;
  typeCls:       string;
  tier:          TierKey;
  tierLabel:     string;
  tierOrder:     number;
  tierDot:       string;
  tierBadge:     string;
  health:        'healthy' | 'needs-attention' | 'incomplete';
  healthOrder:   number;
  navigator:     string;
  operations:    string;
  demand:        string;
  penny:         string;
  knowledge:     string;
  collaboration: string;
  administration:string;
  pennyDepth:    string;
  sfAccess:      string;
  authMethod:    string;
  healthIssues?: string[];
  nextSteps?:    string[];
}

const MATRIX_ROWS: MatrixRow[] = [
  { persona: 'Learner',             type: 'Learner',   typeCls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',   tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'healthy',         healthOrder: 0, navigator: '✓ Program Map',  operations: '✓ Own programs', demand: 'View only',    penny: '✓ Guided',       knowledge: '✓ Library',   collaboration: '✓ Core',  administration: '— Hidden',  pennyDepth: 'Guided — coaching prompts, Trail Quests',              sfAccess: 'Contact, Enrollment, Training Plan',             authMethod: 'Google Sign-In' },
  { persona: 'Coach',               type: 'Staff',     typeCls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',             tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'needs-attention', healthOrder: 1, navigator: '✓ Program Map',  operations: '✓ Own cohorts', demand: 'View only',    penny: '✓ Guided',       knowledge: '✓ Library',   collaboration: '✓ Full',  administration: '— Hidden',  pennyDepth: 'Guided — coach briefs, escalation detection',          sfAccess: 'Contact, Volunteer, Program Engagement',         authMethod: 'Google Sign-In' },
  { persona: 'Program Lead',        type: 'Staff',     typeCls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',             tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'healthy',         healthOrder: 0, navigator: '✓ Full',         operations: '✓ Full',         demand: '✓ Full',       penny: '✓ Guided',       knowledge: '✓ Library',   collaboration: '✓ Full',  administration: '— Hidden',  pennyDepth: 'Guided — program health, cohort summaries',            sfAccess: 'Training Plan, Campaign, Account, Report',        authMethod: 'Google Sign-In' },
  { persona: 'Curriculum Designer', type: 'Staff',     typeCls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',             tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'healthy',         healthOrder: 0, navigator: '✓ Program Map',  operations: 'View only',      demand: '✓ Full',       penny: '✓ Power access', knowledge: '✓ All tabs', collaboration: '✓ Core',  administration: '— Hidden',  pennyDepth: 'Power — curriculum generation, prompt governance',     sfAccess: 'Training Plan, Training Plan Item, Knowledge',    authMethod: 'Google Sign-In' },
  { persona: `${TERMS.aiAssistant} Admin`,         type: 'Admin',     typeCls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',       tier: 'power',      tierLabel: 'Power',    tierOrder: 1, tierDot: 'bg-[#EDF5F8]0',  tierBadge: 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]',   health: 'needs-attention', healthOrder: 1, navigator: '✓ Full',         operations: '✓ Full',         demand: '✓ Full',       penny: '✓ Full suite',   knowledge: '✓ All tabs', collaboration: '✓ Full',  administration: '— Hidden',  pennyDepth: 'Full — prompt-level, capability registry, quality metrics', sfAccess: 'Knowledge, Case, Integration Log',              authMethod: 'Power group · trailospennyadmin@…' },
  { persona: 'Volunteer',           type: 'Volunteer', typeCls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',       tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'needs-attention', healthOrder: 1, navigator: '✓ Limited',      operations: '— Hidden',       demand: '— Hidden',     penny: '✓ Coach briefs', knowledge: '✓ Library',   collaboration: '✓ Core',  administration: '— Hidden',  pennyDepth: 'Guided — coach briefs only',                           sfAccess: 'Volunteer, Volunteer Job, Volunteer Shift, Contact', authMethod: 'Google Sign-In' },
  { persona: 'Volunteer Mentor',    type: 'Volunteer', typeCls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',       tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'incomplete',      healthOrder: 2, navigator: '— Hidden',       operations: '— Hidden',       demand: '— Hidden',     penny: '✓ Coach briefs', knowledge: '✓ Library',   collaboration: '✓ Core',  administration: '— Hidden',  pennyDepth: 'Guided — mentor matching, learner progress briefs',     sfAccess: 'Contact, Volunteer Job, Volunteer Shift',            authMethod: 'Google Sign-In' },
  { persona: 'Alumni Learner',      type: 'Learner',   typeCls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',   tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'needs-attention', healthOrder: 1, navigator: '✓ Program Map',  operations: '— Hidden',       demand: '— Hidden',     penny: '✓ Alumni briefs',knowledge: '✓ Library',   collaboration: '✓ Core',  administration: '— Hidden',  pennyDepth: 'Guided — alumni engagement, outcomes tracking',         sfAccess: 'Contact, Program Engagement (alumni)',               authMethod: 'Google Sign-In' },
  { persona: 'Client Sponsor',      type: 'Sponsor',   typeCls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',             tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'incomplete',      healthOrder: 2, navigator: '— Limited',      operations: 'View only',      demand: '— Hidden',     penny: '✓ Exec briefs',  knowledge: '— Hidden',    collaboration: '— Hidden',administration: '— Hidden',  pennyDepth: 'Guided — executive briefs only',                       sfAccess: 'Account, Opportunity, Contact, Report',          authMethod: 'Google Sign-In' },
  { persona: 'Employer Partner',    type: 'Partner',   typeCls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',          tier: 'everyday',   tierLabel: 'Everyday', tierOrder: 0, tierDot: 'bg-[#E6F0EA]0', tierBadge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', health: 'incomplete',      healthOrder: 2, navigator: '— Limited',      operations: '— Hidden',       demand: '— Hidden',     penny: '— Phase 3',      knowledge: '— Hidden',    collaboration: '— Hidden',administration: '— Hidden',  pennyDepth: 'None — employer matching planned Phase 3',              sfAccess: 'Account, Opportunity, Job Application, Contact', authMethod: 'Google Sign-In' },
  { persona: 'Executive Director',  type: 'Staff',     typeCls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',             tier: 'admin',      tierLabel: 'Admin',    tierOrder: 2, tierDot: 'bg-[#FFF3E0]0',   tierBadge: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',       health: 'healthy',         healthOrder: 0, navigator: '✓ Full',         operations: '✓ Full',         demand: '✓ Full',       penny: '✓ Full',         knowledge: '✓ All tabs', collaboration: '✓ Full',  administration: '✓ View',    pennyDepth: 'Admin — executive briefs, impact summaries, full context', sfAccess: 'Account, Opportunity, Report, Dashboard',        authMethod: 'Admin group · trailosadmin@…' },
  { persona: 'Salesforce Admin',    type: 'Admin',     typeCls: 'text-slate-700 bg-slate-100 border-slate-300',         tier: 'admin',      tierLabel: 'Admin',    tierOrder: 2, tierDot: 'bg-[#FFF3E0]0',   tierBadge: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',       health: 'healthy',         healthOrder: 0, navigator: '✓ Full',         operations: '✓ Full',         demand: '✓ Full',       penny: '✓ Full',         knowledge: '✓ All tabs', collaboration: '✓ Full',  administration: '✓ Full',    pennyDepth: 'Admin — SF mapping, data layer, integration governance', sfAccess: 'All objects, Permission Set, Profile, User',     authMethod: 'Admin group · trailosadmin@…' },
  { persona: 'Platform Admin',      type: 'Admin',     typeCls: 'text-slate-700 bg-slate-100 border-slate-300',         tier: 'superadmin', tierLabel: 'Super',    tierOrder: 3, tierDot: 'bg-primary',     tierBadge: 'bg-primary/10 border-primary/20 text-primary',      health: 'healthy',         healthOrder: 0, navigator: '✓ Full',         operations: '✓ Full',         demand: '✓ Full',       penny: '✓ Unrestricted', knowledge: '✓ All tabs', collaboration: '✓ Full',  administration: '✓ Full',    pennyDepth: 'Unrestricted — all RAG chunks, system prompts, governance override', sfAccess: 'All objects', authMethod: 'Dev environment — not assigned via Google Groups' },
];

// ── Per-role health context ───────────────────────────────────────────────────
// Keyed by persona name. Add entries whenever health is not 'healthy'.

const MATRIX_HEALTH_DETAIL: Record<string, { healthIssues: string[]; nextSteps: string[] }> = {
  'Coach': {
    healthIssues: ['Role blueprint not yet complete', 'Volunteer record type mapping not verified in Salesforce'],
    nextSteps: ['Complete Coach role blueprint in People & Roles Studio', 'Verify Salesforce Contact / Volunteer record mapping for coaches'],
  },
  [`${TERMS.aiAssistant} Admin`]: {
    healthIssues: ['Owner not yet formally assigned', 'Salesforce permission model not defined'],
    nextSteps: ['Assign Penny Admin owner in the Role Owners tab', 'Define Salesforce permission set for the Penny Admin role'],
  },
  'Volunteer': {
    healthIssues: ['No role blueprint defined', 'NPSP Volunteer record mapping incomplete'],
    nextSteps: ['Author Volunteer Coach blueprint in People & Roles Studio', 'Complete NPSP Volunteer record type mapping in Salesforce'],
  },
  'Volunteer Mentor': {
    healthIssues: ['No blueprint defined', 'No owner assigned', 'No Salesforce record type defined', 'No Penny support configured'],
    nextSteps: ['Define Volunteer Mentor blueprint in People & Roles Studio', 'Assign a named owner in the Role Owners tab', 'Create Volunteer Mentor record type in Salesforce (Volunteer Job)', 'Map capability to Penny Coach briefs'],
  },
  'Alumni Learner': {
    healthIssues: ['No Salesforce alumni record type defined', 'No alumni communication flow configured'],
    nextSteps: ['Define alumni Contact record type in Salesforce', 'Configure alumni communication flow in Collaboration hub'],
  },
  'Client Sponsor': {
    healthIssues: ['No Salesforce Account record type defined for sponsors', 'Communication mapping not configured', 'Outcome reporting flow not set up'],
    nextSteps: ['Define Account record type for Client Sponsors in Salesforce', 'Configure sponsor communication flow in Collaboration hub', 'Design outcome reporting process and delivery cadence'],
  },
  'Employer Partner': {
    healthIssues: ['Employer Partner object model not yet defined in Salesforce', 'No Penny employer matching capability configured'],
    nextSteps: ['Define Account record type for Employer Partners in Salesforce', 'Map skill requirements to curriculum standards', 'Configure Penny employer matching — planned Phase 3'],
  },
};

const NAV_COLS: { key: keyof MatrixRow; label: string }[] = [
  { key: 'navigator',       label: 'Navigator' },
  { key: 'operations',      label: 'Operations' },
  { key: 'demand',          label: 'Demand' },
  { key: 'penny',           label: TERMS.aiAssistant },
  { key: 'knowledge',       label: 'Knowledge' },
  { key: 'collaboration',   label: 'Collab' },
  { key: 'administration',  label: 'Admin' },
];

const TIER_FILTER_OPTIONS: { key: FilterTier; label: string; dot: string }[] = [
  { key: 'all',        label: 'All tiers',   dot: 'bg-muted-foreground/40' },
  { key: 'everyday',   label: 'Everyday',    dot: 'bg-[#E6F0EA]0' },
  { key: 'power',      label: 'Power',       dot: 'bg-[#EDF5F8]0' },
  { key: 'admin',      label: 'Admin',       dot: 'bg-[#FFF3E0]0' },
  { key: 'superadmin', label: 'Super',       dot: 'bg-primary' },
];

const TYPE_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all',       label: 'All types' },
  { key: 'Staff',     label: 'Staff' },
  { key: 'Admin',     label: 'Admin' },
  { key: 'Learner',   label: 'Learner' },
  { key: 'Volunteer', label: 'Volunteer' },
  { key: 'Sponsor',   label: 'Sponsor' },
  { key: 'Partner',   label: 'Partner' },
];

const HEALTH_FILTER_OPTIONS: { key: FilterHealth; label: string; dot: string }[] = [
  { key: 'all',             label: 'All',             dot: 'bg-muted-foreground/40' },
  { key: 'healthy',         label: 'Healthy',         dot: 'bg-[#E6F0EA]0' },
  { key: 'needs-attention', label: 'Needs attention', dot: 'bg-[#CC8400]' },
  { key: 'incomplete',      label: 'Incomplete',      dot: 'bg-[#FBEAE6]0' },
];

const HEALTH_DOT: Record<string, string> = {
  healthy:           'bg-[#E6F0EA]0',
  'needs-attention': 'bg-[#CC8400]',
  incomplete:        'bg-[#FBEAE6]0',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 inline ml-1 text-muted-foreground/40" />;
  return dir === 'asc'
    ? <ArrowUp   className="w-3 h-3 inline ml-1 text-foreground" />
    : <ArrowDown className="w-3 h-3 inline ml-1 text-foreground" />;
}

function CellValue({ value, inverted }: { value: string; inverted?: boolean }) {
  if (value.startsWith('✓')) {
    return <span className={`text-[14px] font-medium ${inverted ? 'text-[#9FC3AE]' : 'text-[#2F6B3F]'}`}>{value}</span>;
  }
  if (value.startsWith('—')) {
    return <span className={`text-[14px] ${inverted ? 'text-muted-foreground/40' : 'text-muted-foreground/40'}`}>{value}</span>;
  }
  return <span className={`text-[14px] ${inverted ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{value}</span>;
}

function NavCell({ value }: { value: string }) {
  if (value.startsWith('✓')) {
    return (
      <span className="flex items-start gap-1 text-[14px] text-foreground">
        <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] mt-0.5 flex-shrink-0" />
        <span>{value.replace('✓ ', '')}</span>
      </span>
    );
  }
  if (value.startsWith('—')) {
    return (
      <span className="flex items-center gap-1 text-[14px] text-muted-foreground/60">
        <XCircle className="w-3 h-3 flex-shrink-0" />
        <span>{value.replace('— ', '')}</span>
      </span>
    );
  }
  return (
    <span className="flex items-start gap-1 text-[14px] text-muted-foreground">
      <MinusCircle className="w-3 h-3 text-[#CC8400] mt-0.5 flex-shrink-0" />
      <span>{value}</span>
    </span>
  );
}

// ── Persona → role ID mapping for owner auto-clear ────────────────────────────
const PERSONA_TO_ROLE_ID: Record<string, string> = {
  [`${TERMS.aiAssistant} Admin`]: 'penny-admin',
  'Alumni Learner':               'alumni-learner-lead',
  'Volunteer Mentor':             'volunteer-mentor-lead',
  'Employer Partner':             'employer-partner-lead',
};

// ── Permission Matrix tab ─────────────────────────────────────────────────────

function PermissionMatrixTab() {
  const { platformRoles } = useAppContext();
  const [filterTier,      setFilterTier]      = useState<FilterTier>('all');
  const [filterType,      setFilterType]      = useState<FilterType>('all');
  const [filterHealth,    setFilterHealth]    = useState<FilterHealth>('all');
  const [search,          setSearch]          = useState('');
  const [selectedRow,     setSelectedRow]     = useState<string | null>(null);
  const [sortKey,         setSortKey]         = useState<SortKey>('tier');
  const [sortDir,         setSortDir]         = useState<SortDir>('asc');
  const [dismissedIssues, setDismissedIssues] = useState<Record<string, string[]>>({});

  // Load persisted dismissals on mount
  useEffect(() => {
    fetch('/api/admin/persona-health')
      .then(r => r.ok ? r.json() : { dismissed: {} })
      .then((data: { dismissed: Record<string, string[]> }) =>
        setDismissedIssues(data.dismissed ?? {}))
      .catch(() => {});
  }, []);

  // Compute remaining issues for a persona, filtering out:
  //   1. Owner issues that are auto-cleared by an actual role owner assignment
  //   2. Manually dismissed issues
  const getEffectiveIssues = useCallback((persona: string): string[] => {
    const detail = MATRIX_HEALTH_DETAIL[persona];
    if (!detail) return [];
    const roleId  = PERSONA_TO_ROLE_ID[persona];
    const role    = roleId ? platformRoles.find(r => r.id === roleId) : null;
    const hasOwner = !!(role?.owner?.trim());
    const dismissed = dismissedIssues[persona] ?? [];
    return detail.healthIssues.filter(issue => {
      if (hasOwner && /owner/i.test(issue)) return false;
      if (dismissed.includes(issue)) return false;
      return true;
    });
  }, [platformRoles, dismissedIssues]);

  const getEffectiveHealth = useCallback((persona: string, original: MatrixRow['health']): MatrixRow['health'] => {
    if (original === 'healthy') return 'healthy';
    return getEffectiveIssues(persona).length === 0 ? 'healthy' : original;
  }, [getEffectiveIssues]);

  async function dismissIssue(persona: string, issue: string) {
    const current = dismissedIssues[persona] ?? [];
    if (current.includes(issue)) return;
    const updated = [...current, issue];
    setDismissedIssues(d => ({ ...d, [persona]: updated }));
    await fetch(`/api/admin/persona-health/${encodeURIComponent(persona)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissedIssues: updated }),
    }).catch(() => {});
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const processedRows = useMemo(() => {
    let rows = [...MATRIX_ROWS];
    if (filterTier   !== 'all') rows = rows.filter(r => r.tier   === filterTier);
    if (filterType   !== 'all') rows = rows.filter(r => r.type   === filterType);
    if (filterHealth !== 'all') rows = rows.filter(r => getEffectiveHealth(r.persona, r.health) === filterHealth);
    if (search.trim())          rows = rows.filter(r =>
      r.persona.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase())
    );
    rows.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if      (sortKey === 'persona') { va = a.persona;     vb = b.persona; }
      else if (sortKey === 'type')    { va = a.type;        vb = b.type; }
      else if (sortKey === 'tier')    { va = a.tierOrder;   vb = b.tierOrder; }
      else                            { va = a.healthOrder; vb = b.healthOrder; }
      if (typeof va === 'number') return sortDir === 'asc' ? va - (vb as number) : (vb as number) - va;
      return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    });
    return rows;
  }, [filterTier, filterType, filterHealth, search, sortKey, sortDir, getEffectiveHealth]);

  const activeRow  = MATRIX_ROWS.find(r => r.persona === selectedRow) ?? null;
  const total      = MATRIX_ROWS.length;
  const shown      = processedRows.length;
  const hasFilters = filterTier !== 'all' || filterType !== 'all' || filterHealth !== 'all' || search.trim() !== '';

  const hc = {
    healthy:    MATRIX_ROWS.filter(r => getEffectiveHealth(r.persona, r.health) === 'healthy').length,
    needsAttn:  MATRIX_ROWS.filter(r => getEffectiveHealth(r.persona, r.health) === 'needs-attention').length,
    incomplete: MATRIX_ROWS.filter(r => getEffectiveHealth(r.persona, r.health) === 'incomplete').length,
  };

  function clearFilters() {
    setFilterTier('all');
    setFilterType('all');
    setFilterHealth('all');
    setSearch('');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Filter toolbar — single row ─────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Health summary badges */}
          <div className="flex items-center gap-1.5">
            {[
              { label: `${hc.healthy} healthy`,           cls: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]' },
              { label: `${hc.needsAttn} needs attention`,  cls: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]' },
              { label: `${hc.incomplete} incomplete`,      cls: 'bg-[#FBEAE6] border-[#E8B9B4] text-[#A93F2F]' },
            ].map(b => (
              <span key={b.label} className={`text-[13px] font-semibold px-2 py-0.5 rounded border ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>

          <div className="w-px h-4 bg-border/60 mx-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-6 pr-2 py-1 text-[13px] rounded-md border border-border bg-background text-foreground placeholder-muted-foreground/50 outline-none focus:border-ring w-32"
            />
          </div>

          {/* Tier pills */}
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-muted-foreground/50 mr-0.5">Tier</span>
            {TIER_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterTier(opt.key)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[13px] font-semibold transition-all ${
                  filterTier === opt.key
                    ? 'bg-foreground border-foreground text-background'
                    : 'bg-card border-border text-muted-foreground hover:border-ring/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type */}
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-muted-foreground/50">Type</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as FilterType)}
              className="text-[13px] rounded-md border border-border bg-background text-foreground px-1.5 py-0.5 outline-none focus:border-ring"
            >
              {TYPE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          {/* Health pills */}
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-muted-foreground/50 mr-0.5">Health</span>
            {HEALTH_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterHealth(opt.key)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[13px] font-semibold transition-all ${
                  filterHealth === opt.key
                    ? 'bg-foreground border-foreground text-background'
                    : 'bg-card border-border text-muted-foreground hover:border-ring/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Row count + clear */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">
              {shown === total ? `${total} roles` : `${shown} / ${total}`}
            </span>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── Matrix + detail panel ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead className="bg-card border-b border-border sticky top-0 z-10">
              <tr>
                {(
                  [
                    { key: 'persona' as SortKey, label: 'Persona', w: 'w-36' },
                    { key: 'type'    as SortKey, label: 'Type',    w: 'w-24' },
                    { key: 'tier'    as SortKey, label: 'Tier',    w: 'w-20' },
                    { key: 'health'  as SortKey, label: 'Health',  w: 'w-14' },
                  ]
                ).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`text-left px-4 py-3 text-[14px] font-bold text-muted-foreground/70 cursor-pointer select-none hover:bg-muted/40 ${col.w}`}
                  >
                    {col.label}<SortIcon active={sortKey === col.key} dir={sortDir} />
                  </th>
                ))}
                {NAV_COLS.map(col => (
                  <th key={col.key as string} className="text-left px-3 py-3 text-[14px] font-bold text-muted-foreground/70">
                    {col.label}
                  </th>
                ))}
                <th className="text-left px-3 py-3 text-[14px] font-bold text-muted-foreground/70">Penny depth</th>
              </tr>
            </thead>
            <tbody>
              {processedRows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-8 py-12 text-center text-[14px] text-muted-foreground">
                    No roles match the current filters.{' '}
                    <button onClick={clearFilters} className="underline hover:text-foreground">Clear filters</button>
                  </td>
                </tr>
              )}
              {processedRows.map((row, i) => {
                const isActive = selectedRow === row.persona;
                return (
                  <tr
                    key={row.persona}
                    onClick={() => setSelectedRow(isActive ? null : row.persona)}
                    className={`border-b border-border/60 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-foreground text-background'
                        : i % 2 === 0
                        ? 'bg-card hover:bg-muted/30'
                        : 'bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    {/* Persona */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.tierDot}`} />
                        <span className={`font-semibold ${isActive ? 'text-background' : 'text-foreground'}`}>{row.persona}</span>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-2.5">
                      <span className={`text-[14px] font-semibold px-1.5 py-0.5 rounded border ${isActive ? 'bg-background/20 border-background/30 text-background' : row.typeCls}`}>
                        {row.type}
                      </span>
                    </td>
                    {/* Tier */}
                    <td className="px-4 py-2.5">
                      <span className={`text-[14px] font-semibold px-2 py-0.5 rounded-full border ${isActive ? 'bg-background/20 border-background/30 text-background' : row.tierBadge}`}>
                        {row.tierLabel}
                      </span>
                    </td>
                    {/* Health */}
                    <td className="px-4 py-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${HEALTH_DOT[getEffectiveHealth(row.persona, row.health)]}`} title={getEffectiveHealth(row.persona, row.health)} />
                    </td>
                    {/* Nav cols */}
                    {NAV_COLS.map(col => (
                      <td key={col.key as string} className="px-3 py-2.5">
                        <CellValue value={row[col.key] as string} inverted={isActive} />
                      </td>
                    ))}
                    {/* Penny */}
                    <td className="px-3 py-2.5">
                      <span className={`text-[14px] ${isActive ? 'text-[#7FAFC6]' : 'text-[#2F6F7E]'}`}>
                        {row.pennyDepth.split(' — ')[0]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {activeRow && (
          <div className="w-72 border-l border-border bg-card overflow-auto shrink-0">
            <div className="px-5 py-4 border-b border-border flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-[14px] font-bold text-foreground">{activeRow.persona}</h2>
                  <span className={`text-[14px] font-semibold px-1.5 py-0.5 rounded border ${activeRow.typeCls}`}>{activeRow.type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[14px] font-bold px-2 py-0.5 rounded-full border ${activeRow.tierBadge}`}>{activeRow.tierLabel}</span>
                  <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[activeRow.health]}`} />
                  <span className="text-[14px] text-muted-foreground">{activeRow.health.replace('-', ' ')}</span>
                </div>
              </div>
              <button onClick={() => setSelectedRow(null)} className="text-muted-foreground hover:text-foreground shrink-0 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Health issues + next steps — shown for any non-healthy row */}
              {(() => {
                const effectiveHealth  = getEffectiveHealth(activeRow.persona, activeRow.health);
                const detail           = MATRIX_HEALTH_DETAIL[activeRow.persona];
                const effectiveIssues  = getEffectiveIssues(activeRow.persona);
                const allDismissed     = detail && effectiveIssues.length === 0 && detail.healthIssues.length > 0;
                if (!detail) return null;

                if (effectiveHealth === 'healthy') {
                  return (
                    <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]/60 p-3 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] mt-0.5 shrink-0" />
                      <p className="text-[14px] text-[#245531]">
                        {allDismissed ? 'All issues marked resolved.' : 'No open issues.'}
                      </p>
                    </div>
                  );
                }

                const isIncomplete = activeRow.health === 'incomplete';
                const borderCls = isIncomplete ? 'border-[#E8B9B4] bg-[#FBEAE6]/60' : 'border-[#FFD08A] bg-[#FFF3E0]/60';
                const labelCls  = isIncomplete ? 'text-[#A93F2F]' : 'text-[#CC8400]';
                const dotCls    = isIncomplete ? 'bg-[#A93F2F]' : 'bg-[#CC8400]';
                // Pair issues with their steps by original index so filtering both stays in sync
                const pairedItems = detail.healthIssues
                  .map((issue, i) => ({ issue, step: detail.nextSteps[i] ?? null }))
                  .filter(({ issue }) => effectiveIssues.includes(issue));

                return (
                  <div className={`rounded-lg border p-3 space-y-3 ${borderCls}`}>
                    {/* Issues with dismiss buttons */}
                    <div>
                      <p className={`text-[14px] font-bold mb-1.5 ${labelCls}`}>
                        {isIncomplete ? 'Incomplete — issues' : 'Needs attention — issues'}
                      </p>
                      <ul className="space-y-2">
                        {pairedItems.map(({ issue }) => (
                          <li key={issue} className="flex items-start gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotCls}`} />
                            <span className="text-[14px] text-foreground leading-snug flex-1">{issue}</span>
                            <button
                              onClick={() => { void dismissIssue(activeRow.persona, issue); }}
                              title="Mark as resolved"
                              className="shrink-0 text-[11px] font-semibold text-[#2F6B3F] hover:underline ml-1 mt-0.5 whitespace-nowrap"
                            >
                              ✓ Resolve
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Next steps — only show steps for remaining issues */}
                    {pairedItems.some(p => p.step) && (
                      <div>
                        <p className="text-[14px] font-bold text-muted-foreground/60 mb-1.5">How to resolve</p>
                        <ol className="space-y-1 list-none">
                          {pairedItems.map(({ issue, step }, i) => step && (
                            <li key={issue} className="flex items-start gap-2">
                              <span className="text-[14px] font-bold text-muted-foreground/50 mt-0.5 w-3 shrink-0">{i + 1}.</span>
                              <span className="text-[14px] text-foreground leading-snug">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Auth */}
              <div>
                <p className="text-[14px] font-bold text-muted-foreground/50 mb-1.5">Auth method</p>
                <p className="text-[14px] font-mono text-muted-foreground bg-muted/50 rounded px-2.5 py-2 leading-snug">{activeRow.authMethod}</p>
              </div>
              {/* Penny */}
              <div className="rounded-lg border border-[#7FAFC6] bg-[#EDF5F8]/60 p-3">
                <p className="text-[14px] font-bold text-[#2F6F7E] mb-1">Penny depth</p>
                <p className="text-[14px] text-[#2F6F7E] leading-snug">{activeRow.pennyDepth}</p>
              </div>
              {/* SF */}
              <div>
                <p className="text-[14px] font-bold text-muted-foreground/50 mb-1.5">Salesforce access</p>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{activeRow.sfAccess}</p>
              </div>
              {/* Nav breakdown */}
              <div>
                <p className="text-[14px] font-bold text-muted-foreground/50 mb-2">Navigation access</p>
                <div className="space-y-1.5">
                  {NAV_COLS.map(col => {
                    const val = activeRow[col.key] as string;
                    return (
                      <div key={col.key as string} className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-muted-foreground/60 w-28 shrink-0">{col.label}</span>
                        <NavCell value={val} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Access Tiers tab (unchanged from original) ────────────────────────────────

const TIER_ICONS: Record<AccessTier, React.ReactNode> = {
  everyday:   <Users  className="w-4 h-4" />,
  power:      <Brain  className="w-4 h-4" />,
  admin:      <Shield className="w-4 h-4" />,
  superadmin: <Star   className="w-4 h-4" />,
};

function AccessTiersTab({
  userTier, setUserTier,
}: {
  userTier: AccessTier;
  setUserTier: (t: AccessTier) => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-6">

        {/* Auth live notice */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]">
          <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] flex-shrink-0" />
          <p className="text-[14px] text-[#245531] leading-snug">
            <strong>Authentication is live</strong> — Google Sign-In via Clerk is active. Tier is
            auto-assigned from Google Group membership on sign-in. Use "Preview this tier" below
            to simulate a different access level in the current session.
          </p>
        </div>

        {/* Tier cards */}
        <div>
          <p className="text-[14px] font-bold text-muted-foreground/50 mb-3">Access Tiers</p>
          <div className="grid grid-cols-4 gap-3">
            {TIER_ORDER.map(tier => {
              const cfg    = TIER_CONFIG[tier];
              const active = userTier === tier;
              return (
                <div
                  key={tier}
                  className={`rounded-xl border p-4 transition-all ${
                    active
                      ? `${cfg.colorClass} ring-2 ring-offset-1 ring-current/30`
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`p-1.5 rounded-md ${active ? 'bg-current/10' : 'bg-muted'} text-current`}>
                      {TIER_ICONS[tier]}
                    </span>
                    {active && (
                      <span className="text-[14px] font-bold text-current bg-current/10 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] font-bold text-foreground mt-2">{cfg.label}</p>
                  {tier !== 'superadmin' && (
                    <p className="text-[14px] text-muted-foreground font-medium mt-0.5">{cfg.groupLabel}</p>
                  )}
                  <p className="text-[14px] text-muted-foreground mt-1.5 leading-snug">{cfg.description}</p>
                  <p className="text-[14px] text-muted-foreground/70 mt-1.5 leading-snug">{cfg.detail}</p>
                  {tier !== userTier && (
                    <button
                      onClick={() => setUserTier(tier)}
                      className="mt-3 w-full text-[14px] font-semibold px-2 py-1 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      Preview this tier →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Google Groups mapping */}
        <div>
          <p className="text-[14px] font-bold text-muted-foreground/50 mb-3">
            Google Groups → Trail OS Tier Mapping
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div
              className="grid bg-muted/40 border-b border-border/60 text-[14px] font-bold text-muted-foreground/70 px-4 py-2"
              style={{ gridTemplateColumns: '200px 1fr 200px 1fr' }}
            >
              <span>Google Group</span>
              <span>Trail OS Role</span>
              <span>Tier</span>
              <span>Default Lens</span>
            </div>
            {TIER_ORDER.filter(t => t !== 'superadmin').map((tier, i) => {
              const cfg = TIER_CONFIG[tier];
              return (
                <div
                  key={tier}
                  className={`grid px-4 py-3 text-[14px] items-center ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                  style={{ gridTemplateColumns: '200px 1fr 200px 1fr' }}
                >
                  <span className="font-mono text-[14px] text-muted-foreground">{cfg.googleGroup.split('@')[0]}@…</span>
                  <span className="font-medium text-foreground">{cfg.groupLabel}</span>
                  <span>
                    <span className={`text-[14px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                      {cfg.label}
                    </span>
                  </span>
                  <span className="text-muted-foreground capitalize">{cfg.defaultLens}</span>
                </div>
              );
            })}
            <div
              className="grid px-4 py-3 text-[14px] items-center bg-primary/5 border-t border-primary/10"
              style={{ gridTemplateColumns: '200px 1fr 200px 1fr' }}
            >
              <span className="font-mono text-[14px] text-muted-foreground/60">Dev environment only</span>
              <span className="font-medium text-foreground">Builder / Super Admin</span>
              <span>
                <span className="text-[14px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                  Super Admin
                </span>
              </span>
              <span className="text-muted-foreground">builder</span>
            </div>
          </div>
          <p className="text-[14px] text-muted-foreground mt-2">
            Live group addresses:{' '}
            {(['everyday', 'power', 'admin'] as const).map((tier, i, arr) => (
              <span key={tier}>
                <span className="font-mono">{TIER_CONFIG[tier].googleGroup}</span>{' '}
                ({TIER_CONFIG[tier].shortLabel}){i < arr.length - 1 ? ', ' : ''}{' '}
              </span>
            ))}
            — managed in Google Workspace Admin.
          </p>
        </div>

        {/* Google Workspace Authentication */}
        <div>
          <p className="text-[14px] font-bold text-muted-foreground/50 mb-3">
            Google Workspace Authentication
          </p>
          <div className="rounded-xl border border-[#9FC3AE] bg-[#E6F0EA]/40 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#9FC3AE] flex items-center justify-center flex-shrink-0 shadow-sm">
                <Chrome className="w-5 h-5 text-[#4285F4]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[14px] font-semibold text-foreground">Google Sign-In (OAuth 2.0 + OpenID Connect)</p>
                  <span className="text-[14px] font-bold bg-[#E6F0EA] text-[#2F6B3F] px-1.5 py-0.5 rounded">Live</span>
                </div>
                <p className="text-[14px] text-muted-foreground">
                  Users sign in with their Transition Trails Google account. Tier is auto-assigned from Google Group membership.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: <Globe className="w-4 h-4 text-[#2F6B3F]" />,
                  title: 'Step 1 — Google Sign-In',
                  body: 'Clerk handles Google OAuth. Users sign in with @transitiontrails.org accounts — no separate Trail OS password.',
                  status: 'live',
                },
                {
                  icon: <Users className="w-4 h-4 text-[#2F6B3F]" />,
                  title: 'Step 2 — Google Groups',
                  body: 'Three Trail OS groups defined in Google Workspace Admin: trailosadmin, trailospennyadmin, and trailosusers.',
                  status: 'live',
                },
                {
                  icon: <Network className="w-4 h-4 text-[#CC8400]" />,
                  title: 'Step 3 — Auto Tier Assignment',
                  body: 'Requires GOOGLE_ADMIN_CREDENTIALS (service account JSON) + GOOGLE_ADMIN_IMPERSONATE_EMAIL in Replit Secrets. Once set, /api/auth/tier reads group membership and assigns the matching tier on each sign-in.',
                  status: 'needs-token',
                },
              ].map(step => (
                <div key={step.title} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {step.icon}
                    <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded ${
                      step.status === 'live'
                        ? 'bg-[#E6F0EA] text-[#2F6B3F]'
                        : 'bg-[#FFF3E0] text-[#CC8400]'
                    }`}>
                      {step.status === 'live' ? 'Live' : 'Needs Token'}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-foreground mb-1">{step.title}</p>
                  <p className="text-[14px] text-muted-foreground leading-snug">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 text-[14px] text-muted-foreground bg-[#FFF3E0] border border-[#FFF3E0] rounded-lg px-3 py-2">
              <Mail className="w-3.5 h-3.5 text-[#CC8400] mt-0.5 flex-shrink-0" />
              <span>
                <strong className="text-[#CC8400]">To enable group-based tier assignment:</strong>{' '}
                Add a GCP service account JSON key as{' '}
                <code className="bg-[#FFF3E0] px-1 rounded">GOOGLE_ADMIN_CREDENTIALS</code>{' '}
                and a Workspace admin email as{' '}
                <code className="bg-[#FFF3E0] px-1 rounded">GOOGLE_ADMIN_IMPERSONATE_EMAIL</code>{' '}
                in Replit Secrets. See the Secrets Audit for step-by-step setup instructions.
                Without these, all @transitiontrails.org users default to the Everyday tier.
              </span>
            </div>
            <button
              onClick={() => setLocation('/admin/integrations/google-auth')}
              className="flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
            >
              View Google Auth Setup <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Feature capabilities (kept from original Permissions tab) */}
        <div>
          <p className="text-[14px] font-bold text-muted-foreground/50 mb-3">
            Feature Capabilities by Tier
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div
              className="grid bg-muted/40 border-b border-border/60 text-[14px] font-bold text-muted-foreground/70"
              style={{ gridTemplateColumns: '160px 1fr 1fr 1fr 1fr' }}
            >
              <div className="px-4 py-2">Feature</div>
              {TIER_ORDER.map(tier => {
                const cfg = TIER_CONFIG[tier];
                return (
                  <div key={tier} className="px-3 py-2 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                    {cfg.shortLabel}
                  </div>
                );
              })}
            </div>
            {Object.keys(TIER_FEATURES).map((feature, i) => (
              <div
                key={feature}
                className={`grid items-start ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                style={{ gridTemplateColumns: '160px 1fr 1fr 1fr 1fr' }}
              >
                <div className="px-4 py-3 text-[14px] font-semibold text-foreground">{feature}</div>
                {TIER_ORDER.map(tier => (
                  <div key={tier} className="px-3 py-3 text-[14px] text-muted-foreground leading-snug">
                    {TIER_FEATURES[feature][tier]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Role Owners tab ───────────────────────────────────────────────────────────

const TIER_BADGE: Record<string, string> = {
  everyday:   'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',
  power:      'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  admin:      'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  superadmin: 'bg-primary/10 text-primary border-primary/20',
};

// ── UserPicker ─────────────────────────────────────────────────────────────────

interface StaffUser { name: string; email: string; }

function UserPicker({
  value,
  onChange,
}: {
  value: { owner: string; ownerEmail: string };
  onChange: (v: { owner: string; ownerEmail: string }) => void;
}) {
  const [users,    setUsers]    = useState<StaffUser[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetch users once on mount
  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/staff-users')
      .then(r => r.ok ? r.json() : null)
      .then((data: { users: StaffUser[] } | null) => {
        if (data?.users) setUsers(data.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const selected = value.ownerEmail
    ? users.find(u => u.email === value.ownerEmail) ?? { name: value.owner, email: value.ownerEmail }
    : null;

  function select(u: StaffUser) {
    onChange({ owner: u.name || u.email.split('@')[0], ownerEmail: u.email });
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange({ owner: '', ownerEmail: '' });
    setQuery('');
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-[14px] bg-background transition-colors ${
          open ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-ring/50'
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-foreground truncate">{selected.name || selected.email}</span>
            <span className="text-muted-foreground truncate text-[13px]">{selected.email}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/50">{loading ? 'Loading people…' : 'Select a person…'}</span>
        )}
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); clear(); }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-6 pr-2 py-1 text-[13px] rounded border border-border bg-background outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {loading && (
              <p className="px-3 py-2 text-[13px] text-muted-foreground">Loading…</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="px-3 py-2 text-[13px] text-muted-foreground">No people found</p>
            )}
            {filtered.map(u => (
              <button
                key={u.email}
                type="button"
                onClick={() => select(u)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors ${
                  selected?.email === u.email ? 'bg-primary/8' : ''
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-semibold text-primary">
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-foreground truncate">{u.name || u.email}</p>
                  <p className="text-[12px] text-muted-foreground truncate">{u.email}</p>
                </div>
                {selected?.email === u.email && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── RoleOwnersTab ──────────────────────────────────────────────────────────────

function RoleOwnersTab() {
  const { platformRoles: roles, setPlatformRoles: setRoles } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft]         = useState<{ owner: string; ownerEmail: string }>({ owner: '', ownerEmail: '' });
  const [saving, setSaving]       = useState(false);

  // Load owner assignments from the DB on mount and merge into AppContext state.
  // This ensures data survives app restarts (no longer localStorage-only).
  useEffect(() => {
    fetch('/api/admin/role-owners')
      .then(r => r.ok ? r.json() : null)
      .then((data: { owners: Record<string, { owner: string; ownerEmail: string }> } | null) => {
        if (!data?.owners) return;
        setRoles(roles.map((r: PlatformRole) => {
          const saved = data.owners[r.id];
          return saved ? { ...r, owner: saved.owner, ownerEmail: saved.ownerEmail } : r;
        }));
      })
      .catch(() => { /* silently keep AppContext defaults on network error */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unassigned = roles.filter(r => !r.owner.trim()).length;

  function startEdit(role: PlatformRole) {
    setEditingId(role.id);
    setDraft({ owner: role.owner, ownerEmail: role.ownerEmail });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/admin/role-owners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
    } catch { /* fall through — state still updates locally */ }
    setRoles(roles.map((r: PlatformRole) => r.id === id ? { ...r, ...draft } : r));
    setEditingId(null);
    setSaving(false);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5">

        {/* Status banner */}
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
          unassigned === 0
            ? 'bg-[#E6F0EA]/60 border-[#9FC3AE]'
            : 'bg-[#FFF3E0]/60 border-[#FFD08A]'
        }`}>
          {unassigned === 0
            ? <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] mt-0.5 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-[#CC8400] mt-0.5 flex-shrink-0" />
          }
          <div>
            <p className={`text-[14px] font-semibold ${unassigned === 0 ? 'text-[#245531]' : 'text-[#CC8400]'}`}>
              {unassigned === 0
                ? 'All platform roles are assigned'
                : `${unassigned} platform role${unassigned !== 1 ? 's' : ''} unassigned`
              }
            </p>
            <p className={`text-[14px] mt-0.5 ${unassigned === 0 ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}`}>
              {unassigned === 0
                ? 'Prompt governance, knowledge management, and platform administration all have named owners.'
                : 'Unassigned roles create governance gaps — Penny quality monitoring, source trust reviews, and prompt governance are ungoverned until owners are set.'
              }
            </p>
          </div>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          {roles.map(role => {
            const isEditing  = editingId === role.id;
            const isAssigned = role.owner.trim().length > 0;
            const tierLabel  = TIER_CONFIG[role.requiredTier]?.shortLabel ?? role.requiredTier;

            return (
              <div
                key={role.id}
                className={`rounded-lg border bg-background p-4 space-y-3 transition-colors ${
                  isEditing ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
                }`}
              >
                {/* Role header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[14px] font-semibold text-foreground">{role.title}</span>
                      <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded border ${TIER_BADGE[role.requiredTier]}`}>
                        {tierLabel}+
                      </span>
                      <span className="text-[14px] text-muted-foreground/60 border border-border rounded px-1.5 py-0.5">
                        {role.domain}
                      </span>
                    </div>
                    <p className="text-[14px] text-muted-foreground leading-snug">{role.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {isAssigned ? (
                      <span className="flex items-center gap-1 text-[14px] font-semibold text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2 py-0.5">
                        <UserCheck className="w-3 h-3" /> Assigned
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[14px] font-semibold text-[#CC8400] bg-[#FFF3E0] border border-[#FFD08A] rounded-full px-2 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> Unassigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="flex flex-wrap gap-1.5">
                  {role.responsibilities.map(r => (
                    <span key={r} className="text-[14px] bg-muted/50 text-muted-foreground rounded px-1.5 py-0.5 border border-border/60">
                      {r}
                    </span>
                  ))}
                </div>

                {/* Owner block */}
                {isEditing ? (
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    <p className="text-[14px] font-bold text-muted-foreground/60">Assign Owner</p>
                    <UserPicker
                      value={draft}
                      onChange={v => setDraft(v)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { void saveEdit(role.id); }}
                        disabled={saving || !draft.ownerEmail}
                        className="flex items-center gap-1.5 text-[14px] font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-[14px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    {isAssigned ? (
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">{role.owner}</p>
                        {role.ownerEmail && (
                          <p className="text-[14px] text-muted-foreground">{role.ownerEmail}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[14px] text-muted-foreground/60 italic">No owner assigned</p>
                    )}
                    <button
                      onClick={() => startEdit(role)}
                      className="flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 hover:border-ring/50 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      {isAssigned ? 'Edit' : 'Assign'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Audit Log tab ─────────────────────────────────────────────────────────────

interface AuditRow {
  id:          number;
  eventType:   string;
  actorEmail:  string;
  targetEmail: string | null;
  audience:    string | null;
  ipAddress:   string | null;
  metadata:    Record<string, unknown> | null;
  createdAt:   string;
}

interface AuditUserEntry { email: string; name: string; }

const EVENT_BADGE: Record<string, { cls: string; label: string }> = {
  login:               { cls: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', label: 'Login' },
  impersonation_start: { cls: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]', label: 'Impersonate ▶' },
  impersonation_end:   { cls: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]', label: 'Impersonate ■' },
  error:               { cls: 'bg-[#FBEAE6] border-[#E8B9B4] text-[#A93F2F]', label: 'Error' },
};

function eventBadge(eventType: string) {
  return EVENT_BADGE[eventType] ?? {
    cls:   'bg-muted border-border text-muted-foreground',
    label: eventType.replace(/_/g, ' '),
  };
}

function formatDetailSummary(row: AuditRow): string {
  if (row.targetEmail) return `Target: ${row.targetEmail}`;
  if (row.metadata) {
    const m = row.metadata;
    if (typeof m['reason'] === 'string')  return m['reason'];
    if (typeof m['error']  === 'string')  return m['error'];
    if (typeof m['tier']   === 'string')  return `Tier assigned: ${m['tier']}`;
    if (typeof m['audience'] === 'string') return `Audience: ${m['audience']}`;
    const keys = Object.keys(m);
    if (keys.length > 0) return `${keys[0]}: ${String(m[keys[0]])}`;
  }
  return '—';
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function AuditLogTab() {
  const [userEmail,   setUserEmail]   = useState('');
  const [date,        setDate]        = useState('');
  const [userSearch,  setUserSearch]  = useState('');
  const [rows,        setRows]        = useState<AuditRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);
  const [users,       setUsers]       = useState<AuditUserEntry[]>([]);

  // Fetch user list for dropdown
  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : { users: [] })
      .then((d: { users: AuditUserEntry[] }) => {
        const sorted = [...(d.users ?? [])].sort((a, b) =>
          (a.name || a.email).localeCompare(b.name || b.email));
        setUsers(sorted);
      })
      .catch(() => {});
  }, []);

  const fetchPage = useCallback((page: number, append = false) => {
    const params = new URLSearchParams({ limit: '50', page: String(page) });
    if (userEmail) params.set('actorEmail', userEmail);
    if (date)      params.set('date', date);

    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);

    fetch(`/api/admin/audit-log?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { rows: AuditRow[]; total: number }) => {
        setRows(prev => append ? [...prev, ...data.rows] : data.rows);
        setTotal(data.total);
        setCurrentPage(page);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load audit log'))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, [userEmail, date]);

  // Re-fetch when filters change
  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const hasFilters = userEmail !== '' || date !== '';

  function clearFilters() {
    setUserEmail('');
    setDate('');
    setUserSearch('');
  }

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.name ?? '').toLowerCase().includes(userSearch.toLowerCase())
    ), [users, userSearch]);

  const hasMore = rows.length < total;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Filter toolbar ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2.5">
        <div className="flex items-center gap-3 flex-wrap">

          {/* User filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-muted-foreground/50">User</span>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40 pointer-events-none" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users…"
                className="pl-6 pr-2 py-1 text-[13px] rounded-md border border-border bg-background text-foreground placeholder-muted-foreground/40 outline-none focus:border-ring w-44"
              />
            </div>
            {filteredUsers.length > 0 || userEmail ? (
              <select
                value={userEmail}
                onChange={e => { setUserEmail(e.target.value); setUserSearch(''); }}
                className="text-[13px] rounded-md border border-border bg-background text-foreground px-2 py-1 outline-none focus:border-ring max-w-[200px]"
              >
                <option value="">All users</option>
                {filteredUsers.map(u => (
                  <option key={u.email} value={u.email}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            ) : null}
            {userEmail && (
              <button
                onClick={() => setUserEmail('')}
                className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="w-px h-4 bg-border/60" />

          {/* Day filter */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[13px] font-bold text-muted-foreground/50">Day</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-[13px] rounded-md border border-border bg-background text-foreground px-2 py-1 outline-none focus:border-ring"
            />
            <button
              onClick={() => setDate(todayIso())}
              className={`text-[13px] px-2 py-1 rounded-md border font-semibold transition-colors ${
                date === todayIso()
                  ? 'bg-foreground border-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-ring/50 hover:text-foreground'
              }`}
            >
              Today
            </button>
            {date && (
              <button
                onClick={() => setDate('')}
                className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Count + clear */}
          <div className="ml-auto flex items-center gap-2">
            {!loading && (
              <span className="text-[13px] text-muted-foreground">
                {total === 0 ? 'No events' : `${rows.length} of ${total} event${total !== 1 ? 's' : ''}`}
              </span>
            )}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── Table area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[14px]">Loading events…</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-[#A93F2F]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[14px]">{error}</span>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <ScrollText className="w-8 h-8 opacity-30" />
            <p className="text-[14px]">No events match your filters.</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[13px] text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-card border-b border-border sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground/70 w-44">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Timestamp</span>
                </th>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground/70 w-52">User</th>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground/70 w-36">Event</th>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground/70">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const badge     = eventBadge(row.eventType);
                const isExpanded = expandedId === row.id;
                const summary   = formatDetailSummary(row);
                const hasDetail = row.metadata !== null || row.targetEmail !== null || row.ipAddress !== null;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border/50 ${
                      i % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                    } ${hasDetail ? 'cursor-pointer hover:bg-muted/20' : ''}`}
                    onClick={() => hasDetail && setExpandedId(isExpanded ? null : row.id)}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap align-top">
                      {formatTimestamp(row.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-foreground align-top max-w-[200px] truncate">
                      {row.actorEmail}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <span className={`inline-flex items-center text-[12px] font-semibold px-1.5 py-0.5 rounded border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground truncate">{summary}</p>
                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 text-[12px]">
                              {row.targetEmail && (
                                <p><span className="font-semibold text-muted-foreground/70">Target:</span> <span className="font-mono">{row.targetEmail}</span></p>
                              )}
                              {row.audience && (
                                <p><span className="font-semibold text-muted-foreground/70">Audience:</span> {row.audience}</p>
                              )}
                              {row.ipAddress && (
                                <p><span className="font-semibold text-muted-foreground/70">IP:</span> <span className="font-mono">{row.ipAddress}</span></p>
                              )}
                              {row.metadata && Object.keys(row.metadata).length > 0 && (
                                <div>
                                  <p className="font-semibold text-muted-foreground/70 mb-1">Metadata:</p>
                                  <pre className="bg-muted/40 rounded px-2 py-1.5 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(row.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {hasDetail && (
                          <button className="shrink-0 text-muted-foreground/50 hover:text-foreground mt-0.5">
                            {isExpanded
                              ? <ChevronUp   className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex items-center justify-center py-4 border-t border-border/40">
            <button
              onClick={() => fetchPage(currentPage + 1, true)}
              disabled={loadingMore}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground border border-border rounded-md px-4 py-1.5 hover:border-ring/50 transition-colors disabled:opacity-50"
            >
              {loadingMore
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                : `Load more (${total - rows.length} remaining)`
              }
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'matrix', label: 'Permission Matrix' },
  { id: 'access', label: 'Access Tiers & Auth' },
  { id: 'owners', label: 'Role Owners' },
  { id: 'audit',  label: 'Audit Log' },
];

export default function PeopleAccess() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash === '#owners') return 'owners';
    if (hash === '#access') return 'access';
    if (hash === '#audit')  return 'audit';
    return 'matrix';
  });
  const { userTier, setUserTier } = useAppContext();

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash;
      if (hash === '#owners') setActiveTab('owners');
      else if (hash === '#access') setActiveTab('access');
      else if (hash === '#audit')  setActiveTab('audit');
      else if (hash === '#matrix') setActiveTab('matrix');
    }
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Single-row header + tabs */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-0">

          {/* Left: title + tabs on same baseline */}
          <div className="flex items-center gap-0 min-w-0">
            <span className="text-[14px] font-semibold text-foreground mr-4 whitespace-nowrap">People, Roles &amp; Access</span>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: auth badge */}
          <div className="flex items-center gap-1.5 bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2.5 py-1 flex-shrink-0 mb-1">
            <CheckCircle2 className="w-3 h-3 text-[#2F6B3F]" />
            <span className="text-[14px] font-semibold text-[#2F6B3F]">Auth live · Clerk + Google Groups</span>
          </div>

        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'matrix' && <PermissionMatrixTab />}
        {activeTab === 'access' && <AccessTiersTab userTier={userTier} setUserTier={setUserTier} />}
        {activeTab === 'owners' && <RoleOwnersTab />}
        {activeTab === 'audit'  && <AuditLogTab />}
      </div>

    </div>
  );
}
