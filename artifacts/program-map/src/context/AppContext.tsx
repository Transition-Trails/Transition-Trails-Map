import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Program, type ConfidenceStatus } from '@/data/programs';
import { useSfPrograms, type SfProgramRecord } from '@/hooks/useSfPrograms';
import type { SourceDocument } from '@/data/sourceDocuments';
import type { ResolvePhase } from '@/data/resolvePhases';
import type { PennyCapability } from '@/data/pennyCapabilities';
import type { TrailOsCapability } from '@/data/trailOsCapabilities';
import type { CommProvider } from '@/data/commProviders';
import type { CommRoute } from '@/data/commRouting';
import type { MessageTemplate } from '@/data/messageTemplates';
import type { ActionPanelConfig, SlackPanelConfig } from '@/types/actionPanel';
import { type AccessTier, TIER_CONFIG } from '@/config/accessTiers';
import { type PlatformRole, INITIAL_PLATFORM_ROLES } from '@/data/platformRoles';

export type SelectedItemType =
  | 'program' | 'penny' | 'trailOs' | 'resolve' | 'demand' | 'demandRequest' | 'document'
  | 'commProvider' | 'commRoute' | 'commTemplate'
  | 'commChannel' | 'commBroadcast' | 'commWeeklyBrief' | 'commNotification' | 'commCalendar'
  | 'curriculumItem' | 'pennyAction' | 'sfMapping' | 'programResource' | 'contentStandard' | 'pennyCapability' | 'knowledgeSource'
  | 'promptTemplate' | 'integration'
  | 'persona' | 'role' | 'roleBlueprint' | 'roleParticipation'
  | 'healthIndicator' | 'oicRecommendation' | 'trendInsight' | 'twinNode'
  | 'sfCase' | 'gapReportItem' | 'sfProduct';

export interface ActiveContext {
  id: string;
  objectTypeId: string;
  objectTypeName: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  name: string;
  status?: string;
  statusVariant?: 'active' | 'inactive' | 'draft' | 'planning';
  health?: 'healthy' | 'needs-attention' | 'incomplete' | 'unknown';
  owner?: string;
  workspaceLink: string;
  profileId?: string;
  setAt: string;
}

export type { ActionPanelConfig, SlackPanelConfig };

interface AppState {
  activePage: string;
  activeLens: string;
  userTier: AccessTier;
  selectedItem: { type: SelectedItemType; id: string; data: any } | null;
  searchOpen: boolean;
  activeContext: ActiveContext | null;
  recentContexts: ActiveContext[];
  programs: Program[];
  sourceDocuments: SourceDocument[];
  resolvePhases: ResolvePhase[];
  pennyCapabilities: PennyCapability[];
  trailOsCapabilities: TrailOsCapability[];
  commProviders: CommProvider[];
  commRoutes: CommRoute[];
  messageTemplates: MessageTemplate[];
  actionPanel: ActionPanelConfig | null;
  slackPanel: SlackPanelConfig | null;
  pennyPanelTab: 'penny' | 'signals' | 'ask';
  setPennyPanelTab: (tab: 'penny' | 'signals' | 'ask') => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;
  askPennyOpen: boolean;
  setAskPennyOpen: (v: boolean) => void;
  calendarPanelOpen: boolean;
  setCalendarPanelOpen: (v: boolean) => void;
  gmailPanelOpen: boolean;
  setGmailPanelOpen: (v: boolean) => void;
  pendingPennyQuery: string | null;
  setPendingPennyQuery: (q: string | null) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  setActivePage: (page: string) => void;
  setActiveLens: (lens: string) => void;
  setUserTier: (tier: AccessTier) => void;
  setSelectedItem: (item: { type: SelectedItemType; id: string; data: any } | null) => void;
  setSearchOpen: (open: boolean) => void;
  setActiveContext: (ctx: ActiveContext | null) => void;
  openActionPanel: (config: ActionPanelConfig) => void;
  closeActionPanel: () => void;
  openSlackPanel: (config: SlackPanelConfig) => void;
  closeSlackPanel: () => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  updateDocument: (id: string, updates: Partial<SourceDocument>) => void;
  updateResolvePhase: (id: string, updates: Partial<ResolvePhase>) => void;
  updatePennyCapability: (id: string, updates: Partial<PennyCapability>) => void;
  updateTrailOsCapability: (id: string, updates: Partial<TrailOsCapability>) => void;
  platformRoles: PlatformRole[];
  setPlatformRoles: (roles: PlatformRole[]) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const MAX_RECENT = 5;

function mapSfToProgram(sf: SfProgramRecord): Program {
  const sfStatus = sf.pmdm__Status__c;
  const confidence: ConfidenceStatus =
    sfStatus === 'Active'    ? 'confirmed'    :
    sfStatus === 'Planning'  ? 'draft'        :
    sfStatus === 'Completed' ? 'deprecated'   :
    'needs-review';

  const pricingStatus: Program['pricingStatus'] =
    sf.Requires_Payment__c === true ? 'paid' : 'subsidized';

  return {
    id:            sf.Id,
    entityType:    'program',
    name:          sf.Name,
    color:         '',
    pricingStatus,
    confidence,
    sourceDoc:     sf.pmdm__ProgramIssueArea__c ?? '',
    strategicRole: sf.Program_Structure__c ?? '',
    audience:      sf.Program_Target_Audience__c ?? sf.pmdm__TargetPopulation__c ?? '',
    prerequisite:  '',
    format:        '',
    duration:      '',
    pricing:       sf.Funding_Strategy__c ?? '',
    coreOutcome:   sf.Program_Goals__c ?? '',
    executiveSummary: sf.pmdm__ShortSummary__c ?? sf.pmdm__Description__c ?? '',
    whyItMatters:  sf.Problem_Statement__c ?? '',
    keyFacts:      [],
    outcomes:      sf.Program_Expected_Outcomes__c ? [sf.Program_Expected_Outcomes__c] : [],
    whatBreaksIfMissing: sf.Risks_Assumptions__c ?? '',
    dependencies:  sf.Implementation_Plan__c ?? '',
    pennyFeatures:        [],
    trailOsCapabilities:  [],
    resolvePhases:        [],
    docs:                 [],
    relatedConcepts:      [],
    // Salesforce-sourced fields
    status:                sf.pmdm__Status__c,
    startDate:             sf.pmdm__StartDate__c,
    endDate:               sf.pmdm__EndDate__c,
    description:           sf.pmdm__Description__c,
    shortSummary:          sf.pmdm__ShortSummary__c,
    targetPopulation:      sf.pmdm__TargetPopulation__c,
    programIssueArea:      sf.pmdm__ProgramIssueArea__c,
    programManager:        sf.Program_Manager__c,
    programGoals:          sf.Program_Goals__c,
    programStructure:      sf.Program_Structure__c,
    targetAudience:        sf.Program_Target_Audience__c,
    expectedOutcomes:      sf.Program_Expected_Outcomes__c,
    problemStatement:      sf.Problem_Statement__c,
    successMetrics:        sf.Success_Metrics_Evaluation_Plan__c,
    risksAssumptions:      sf.Risks_Assumptions__c,
    budgetResources:       sf.Budget_Resouces__c,
    fundingStrategy:       sf.Funding_Strategy__c,
    implementationPlan:    sf.Implementation_Plan__c,
    partnershipOpportunities: sf.Partnership_Opportunities__c,
    googleDriveFolder:     sf.Google_Drive_Folder__c,
    canvaFolder:           sf.Canva_Folder__c,
    referenceLink:         sf.Program_Reference_Link__c,
    requiresPayment:       sf.Requires_Payment__c,
    sfId:                  sf.Id,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage]     = useState('program-map');
  // activeLens is auto-managed based on userTier; kept for backward compat (ProgramMap uses it)
  const [activeLens, setActiveLens]     = useState('builder');
  // Default: superadmin — sees everything, can preview any tier. Future: derive from Google Workspace.
  const [userTier, setUserTierRaw]      = useState<AccessTier>('superadmin');
  const [selectedItem, setSelectedItem] = useState<AppState['selectedItem']>(null);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [actionPanel, setActionPanel]   = useState<ActionPanelConfig | null>(null);
  const [slackPanel,  setSlackPanel]    = useState<SlackPanelConfig | null>(null);
  const [pennyPanelTab, setPennyPanelTab] = useState<'penny' | 'signals' | 'ask'>('penny');
  const [rightPanelOpen, setRightPanelOpen]       = useState(false);
  const [askPennyOpen, setAskPennyOpen]             = useState(false);
  const [calendarPanelOpen, setCalendarPanelOpen]   = useState(false);
  const [gmailPanelOpen,    setGmailPanelOpen]      = useState(false);
  const [pendingPennyQuery, setPendingPennyQuery]   = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [activeContext, setActiveContextRaw]  = useState<ActiveContext | null>(null);
  const [recentContexts, setRecentContexts]   = useState<ActiveContext[]>([]);

  // When the tier changes, auto-set the recommended lens for that tier
  function setUserTier(tier: AccessTier) {
    setUserTierRaw(tier);
    setActiveLens(TIER_CONFIG[tier].defaultLens);
  }

  const openActionPanel  = (cfg: ActionPanelConfig) => { setActionPanel(cfg); setSlackPanel(null); };
  const closeActionPanel = ()                        => setActionPanel(null);
  const openSlackPanel   = (cfg: SlackPanelConfig)   => { setSlackPanel(cfg); setActionPanel(null); };
  const closeSlackPanel  = ()                        => setSlackPanel(null);

  const { data: sfProgramsData } = useSfPrograms();
  const [programs, setPrograms]                       = useState<Program[]>([]);

  useEffect(() => {
    if (sfProgramsData?.programs?.length) {
      setPrograms(sfProgramsData.programs.map(mapSfToProgram));
    }
  }, [sfProgramsData]);

  const [sourceDocuments, setSourceDocuments]         = useState<SourceDocument[]>([]);
  const [resolvePhases, setResolvePhases]             = useState<ResolvePhase[]>([]);
  const [pennyCapabilities, setPennyCapabilities]     = useState<PennyCapability[]>([]);
  const [trailOsCapabilities, setTrailOsCapabilities] = useState<TrailOsCapability[]>([]);
  const [commProviders]     = useState<CommProvider[]>([]);
  const [commRoutes]        = useState<CommRoute[]>([]);
  const [messageTemplates]  = useState<MessageTemplate[]>([]);
  const [platformRoles, setPlatformRolesRaw] = useState<PlatformRole[]>(() => {
    try {
      const stored = localStorage.getItem('trailos:platformRoles');
      if (stored) {
        const parsed: PlatformRole[] = JSON.parse(stored);
        return INITIAL_PLATFORM_ROLES.map(initial => {
          const saved = parsed.find(p => p.id === initial.id);
          return saved ? { ...initial, owner: saved.owner, ownerEmail: saved.ownerEmail } : initial;
        });
      }
    } catch { /* ignore */ }
    return INITIAL_PLATFORM_ROLES;
  });

  function setPlatformRoles(roles: PlatformRole[]) {
    setPlatformRolesRaw(roles);
    try {
      localStorage.setItem('trailos:platformRoles', JSON.stringify(
        roles.map(r => ({ id: r.id, owner: r.owner, ownerEmail: r.ownerEmail }))
      ));
    } catch { /* ignore */ }
  }

  function setActiveContext(ctx: ActiveContext | null) {
    setActiveContextRaw(ctx);
    if (ctx) {
      setRecentContexts(prev => {
        const filtered = prev.filter(r => r.id !== ctx.id);
        return [ctx, ...filtered].slice(0, MAX_RECENT);
      });
    }
  }

  function syncSelected(type: SelectedItemType, id: string, updates: Record<string, any>) {
    setSelectedItem(prev =>
      prev?.type === type && prev.id === id
        ? { ...prev, data: { ...prev.data, ...updates } }
        : prev
    );
  }

  const updateProgram = (id: string, u: Partial<Program>) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
    syncSelected('program', id, u);
  };
  const updateDocument = (id: string, u: Partial<SourceDocument>) => {
    setSourceDocuments(prev => prev.map(d => d.id === id ? { ...d, ...u } : d));
    syncSelected('document', id, u);
  };
  const updateResolvePhase = (id: string, u: Partial<ResolvePhase>) => {
    setResolvePhases(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
    syncSelected('resolve', id, u);
  };
  const updatePennyCapability = (id: string, u: Partial<PennyCapability>) => {
    setPennyCapabilities(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
    syncSelected('penny', id, u);
  };
  const updateTrailOsCapability = (id: string, u: Partial<TrailOsCapability>) => {
    setTrailOsCapabilities(prev => prev.map(t => t.id === id ? { ...t, ...u } : t));
    syncSelected('trailOs', id, u);
  };

  return (
    <AppContext.Provider value={{
      activePage, activeLens, userTier, selectedItem, searchOpen,
      activeContext, recentContexts,
      programs, sourceDocuments, resolvePhases, pennyCapabilities, trailOsCapabilities,
      commProviders, commRoutes, messageTemplates,
      actionPanel, openActionPanel, closeActionPanel,
      slackPanel, openSlackPanel, closeSlackPanel,
      pennyPanelTab, setPennyPanelTab,
      rightPanelOpen, setRightPanelOpen,
      askPennyOpen, setAskPennyOpen,
      calendarPanelOpen, setCalendarPanelOpen,
      gmailPanelOpen, setGmailPanelOpen,
      pendingPennyQuery, setPendingPennyQuery,
      mobileSidebarOpen, setMobileSidebarOpen,
      setActivePage, setActiveLens, setUserTier, setSelectedItem, setSearchOpen,
      setActiveContext,
      updateProgram, updateDocument, updateResolvePhase,
      updatePennyCapability, updateTrailOsCapability,
      platformRoles, setPlatformRoles,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
