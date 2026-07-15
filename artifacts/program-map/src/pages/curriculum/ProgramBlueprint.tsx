import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  curriculumPrograms, curriculumCohorts, curriculumSprints, curriculumModules,
  curriculumLessons, curriculumAssessments, curriculumKnowledgeArticles, curriculumResources,
  curriculumCoachingPrompts, curriculumReflectionPrompts, curriculumTrailQuests, curriculumWeeklyReviews,
  curriculumSlackActivities, curriculumGoogleChatUpdates, curriculumCalendarEvents, curriculumOfficeHours,
  curriculumHealthIssues, CONTENT_STATUS_CONFIG, type CurriculumItem,
} from '@/data/curriculumData';
import { sfMappings, SF_STATUS_CONFIG } from '@/data/salesforceArchitectureData';
import { programDriveResources, DRIVE_STATUS_CONFIG } from '@/data/programResourcesData';
import {
  BookOpen, Layers, CheckCircle2, MessageCircle, Star, Hash, Calendar,
  Database, ExternalLink, FolderOpen, AlertTriangle, ArrowRight, ChevronDown,
  Sparkles, Clock, BarChart2, Users,
} from 'lucide-react';

type BlueprintTab = 'structure' | 'learning' | 'penny' | 'delivery' | 'salesforce' | 'drive' | 'health';

const TABS: { id: BlueprintTab; label: string; icon: React.ElementType }[] = [
  { id: 'structure',  label: 'Program Structure', icon: Layers },
  { id: 'learning',   label: 'Learning Assets',   icon: BookOpen },
  { id: 'penny',      label: `${TERMS.aiAssistant} Assets`, icon: Sparkles },
  { id: 'delivery',   label: 'Delivery Assets',    icon: Hash },
  { id: 'salesforce', label: 'Salesforce',         icon: Database },
  { id: 'drive',      label: 'Google Drive',       icon: FolderOpen },
  { id: 'health',     label: 'Content Health',     icon: AlertTriangle },
];

const PROGRAM_IDS = curriculumPrograms.map(p => p.id);

function filterByProgram(items: CurriculumItem[], programName: string) {
  return items.filter(i => i.program === programName);
}

function StatPill({ label, value, cls = '' }: { label: string; value: number | string; cls?: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${cls}`}>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionCard({ title, items, icon: Icon, color, onSelect }: {
  title: string;
  items: CurriculumItem[];
  icon: React.ElementType;
  color: string;
  onSelect: (item: CurriculumItem) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        <Icon className={`w-4 h-4 shrink-0 ${color}`} />
        <p className="text-[13px] font-bold text-foreground flex-1">{title}</p>
        <span className="text-[10px] font-bold text-muted-foreground border border-border rounded-full px-1.5 py-0.5">{items.length}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {items.map(item => {
            const statusCfg = CONTENT_STATUS_CONFIG[item.status];
            return (
              <button key={item.id} onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/20 transition-colors">
                <p className="text-[12px] font-medium text-foreground flex-1 truncate">{item.name}</p>
                <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 shrink-0 ${statusCfg.cls}`}>{statusCfg.label}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="px-4 py-3">
              <p className="text-[11px] text-muted-foreground/60 italic">No items yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProgramBlueprint() {
  const { setSelectedItem } = useAppContext();
  const [selectedProgramId, setSelectedProgramId] = useState('prog-foundations');
  const [tab, setTab] = useState<BlueprintTab>('structure');

  const program = curriculumPrograms.find(p => p.id === selectedProgramId) || curriculumPrograms[0];
  const programName = program.name;
  const driveResource = programDriveResources.find(r => r.programId === selectedProgramId);
  const driveStatusCfg = driveResource ? DRIVE_STATUS_CONFIG[driveResource.status] : null;

  const cohorts    = filterByProgram(curriculumCohorts, programName);
  const sprints    = filterByProgram(curriculumSprints, programName);
  const modules    = filterByProgram(curriculumModules, programName);
  const lessons    = filterByProgram(curriculumLessons, programName);
  const assessments= filterByProgram(curriculumAssessments, programName);
  const articles   = filterByProgram(curriculumKnowledgeArticles, programName);
  const resources  = filterByProgram(curriculumResources, programName);
  const coaching   = filterByProgram(curriculumCoachingPrompts, programName);
  const reflection = filterByProgram(curriculumReflectionPrompts, programName);
  const quests     = filterByProgram(curriculumTrailQuests, programName);
  const weeklyRevs = filterByProgram(curriculumWeeklyReviews, programName);
  const slack      = filterByProgram(curriculumSlackActivities, programName);
  const gchat      = filterByProgram(curriculumGoogleChatUpdates, programName);
  const calEvents  = filterByProgram(curriculumCalendarEvents, programName);
  const officeHrs  = filterByProgram(curriculumOfficeHours, programName);
  const healthIssues = curriculumHealthIssues.filter(h => h.program === programName);

  function selectItem(item: CurriculumItem) {
    setSelectedItem({ type: 'curriculumItem', id: item.id, data: item });
  }

  const isFoundations = selectedProgramId === 'prog-foundations';

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Programs · Blueprint Canvas</p>
            <h1 className="text-[15px] font-semibold text-foreground leading-snug">Program Canvas</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              What actually exists — structure, curriculum, {TERMS.aiAssistant} assets, delivery, and content health.
              {isFoundations && <span className="ml-1 text-primary font-medium">Foundations Trail is the reference implementation.</span>}
            </p>
          </div>

          {/* Program selector */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Program</p>
            <select
              value={selectedProgramId}
              onChange={e => setSelectedProgramId(e.target.value)}
              className="text-[12px] font-semibold border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
            >
              {curriculumPrograms.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Blueprint vs program helper */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">This is what exists.</span>{' '}
            The <span className="font-semibold text-foreground">Program Blueprint</span> standard in Standards Studio defines what every program should contain.
            This canvas shows what has actually been built for the selected program.
          </p>
        </div>

        {/* Program header card */}
        <button
          onClick={() => selectItem(program)}
          className="w-full rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-left hover:border-primary/40 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isFoundations && <span className="text-[10px] font-bold text-primary border border-primary/20 bg-white rounded-full px-2 py-0.5">★ Reference Implementation</span>}
                <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${CONTENT_STATUS_CONFIG[program.status].cls}`}>
                  {CONTENT_STATUS_CONFIG[program.status].label}
                </span>
              </div>
              <p className="text-[20px] font-bold text-foreground">{program.name}</p>
              <p className="text-[12px] text-muted-foreground mt-1">{program.purpose}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <StatPill label="Cohorts" value={cohorts.length} cls="border-teal-200 bg-teal-50" />
              <StatPill label="Sprints" value={sprints.length} cls="border-violet-200 bg-violet-50" />
              <StatPill label="Modules" value={modules.length} cls="border-sky-200 bg-sky-50" />
            </div>
          </div>

          {/* Google Drive quick link */}
          {driveResource && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${driveStatusCfg?.cls || ''}`}>
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <p className="text-[11px] font-semibold">{driveResource.folderName}</p>
              <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ml-auto ${driveStatusCfg?.cls}`}>{driveStatusCfg?.label}</span>
              {driveResource.folderUrl && <ExternalLink className="w-3 h-3 shrink-0" />}
            </div>
          )}
        </button>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${tab === t.id ? 'bg-secondary text-white border-secondary' : 'border-border text-muted-foreground hover:border-secondary/40'}`}>
                <Icon className="w-3 h-3" />
                {t.label}
                {t.id === 'health' && healthIssues.length > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{healthIssues.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Structure Tab ── */}
        {tab === 'structure' && (
          <div className="space-y-3">
            {/* Relationship chain header */}
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Full Relationship Chain</p>
              <div className="flex items-center gap-2 flex-wrap">
                {['Program', 'Cohorts', 'Sprints', 'Modules', 'Lessons', 'Assessments', 'Knowledge Articles', `${TERMS.aiAssistant} Assets`, 'Delivery Assets', 'Salesforce Objects'].map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-foreground bg-muted/50 rounded px-2 py-0.5">{step}</span>
                    {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                  </div>
                ))}
              </div>
            </div>

            <SectionCard title="Cohorts" items={cohorts} icon={Users} color="text-teal-600" onSelect={selectItem} />
            <SectionCard title="Sprints" items={sprints} icon={Layers} color="text-violet-600" onSelect={selectItem} />
            <SectionCard title="Modules" items={modules} icon={BookOpen} color="text-sky-600" onSelect={selectItem} />
          </div>
        )}

        {/* ── Learning Assets Tab ── */}
        {tab === 'learning' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <StatPill label="Lessons" value={lessons.length} cls="border-amber-200 bg-amber-50" />
              <StatPill label="Assessments" value={assessments.length} cls="border-rose-200 bg-rose-50" />
              <StatPill label="KB Articles" value={articles.length} cls="border-indigo-200 bg-indigo-50" />
              <StatPill label="Resources" value={resources.length} cls="border-slate-200 bg-slate-50" />
            </div>
            <SectionCard title="Lessons" items={lessons} icon={BookOpen} color="text-amber-600" onSelect={selectItem} />
            <SectionCard title="Assessments" items={assessments} icon={CheckCircle2} color="text-rose-600" onSelect={selectItem} />
            <SectionCard title="Knowledge Articles" items={articles} icon={BookOpen} color="text-indigo-600" onSelect={selectItem} />
            <SectionCard title="Resources" items={resources} icon={Layers} color="text-slate-600" onSelect={selectItem} />
          </div>
        )}

        {/* ── Penny Assets Tab ── */}
        {tab === 'penny' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <StatPill label="Coaching" value={coaching.length} cls="border-secondary/20 bg-secondary/10" />
              <StatPill label="Reflection" value={reflection.length} cls="border-purple-200 bg-purple-50" />
              <StatPill label="Trail Quests" value={quests.length} cls="border-emerald-200 bg-emerald-50" />
              <StatPill label="Weekly Reviews" value={weeklyRevs.length} cls="border-cyan-200 bg-cyan-50" />
            </div>
            <SectionCard title="Coaching Prompts" items={coaching} icon={Sparkles} color="text-secondary" onSelect={selectItem} />
            <SectionCard title="Reflection Prompts" items={reflection} icon={MessageCircle} color="text-purple-600" onSelect={selectItem} />
            <SectionCard title="Trail Quests" items={quests} icon={Star} color="text-emerald-600" onSelect={selectItem} />
            <SectionCard title="Weekly Reviews" items={weeklyRevs} icon={BarChart2} color="text-cyan-600" onSelect={selectItem} />
          </div>
        )}

        {/* ── Delivery Assets Tab ── */}
        {tab === 'delivery' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <StatPill label="Slack" value={slack.length} cls="border-green-200 bg-green-50" />
              <StatPill label="Google Chat" value={gchat.length} cls="border-blue-200 bg-blue-50" />
              <StatPill label="Calendar Events" value={calEvents.length} cls="border-orange-200 bg-orange-50" />
              <StatPill label="Office Hours" value={officeHrs.length} cls="border-pink-200 bg-pink-50" />
            </div>
            <SectionCard title="Slack Activities" items={slack} icon={Hash} color="text-green-600" onSelect={selectItem} />
            <SectionCard title="Google Chat Updates" items={gchat} icon={MessageCircle} color="text-blue-600" onSelect={selectItem} />
            <SectionCard title="Calendar Events" items={calEvents} icon={Calendar} color="text-orange-600" onSelect={selectItem} />
            <SectionCard title="Office Hours" items={officeHrs} icon={Clock} color="text-pink-600" onSelect={selectItem} />
          </div>
        )}

        {/* ── Salesforce Tab ── */}
        {tab === 'salesforce' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-[13px] font-bold text-blue-900">Salesforce — System of Record</p>
              </div>
              <p className="text-[12px] text-blue-800">
                Salesforce is the data source of truth. Trail OS visualizes and operates on top of SF data.
                These mappings show how {programName} objects correspond to your NPSP/PMM/existing objects.
              </p>
            </div>
            <div className="space-y-2">
              {sfMappings.map(mapping => {
                const statusCfg = SF_STATUS_CONFIG[mapping.status];
                return (
                  <button
                    key={mapping.id}
                    onClick={() => setSelectedItem({ type: 'sfMapping', id: mapping.id, data: mapping })}
                    className="w-full rounded-xl border border-border bg-white p-3 text-left hover:shadow-sm hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${statusCfg.dot} shrink-0`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-bold text-foreground">{mapping.trailOsObject}</p>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                          <p className="text-[12px] font-semibold text-blue-700">{mapping.sfLabel}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{mapping.sfApiName}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{mapping.currentImplementation}</p>
                      </div>
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Google Drive Tab ── */}
        {tab === 'drive' && (
          <div className="space-y-4">
            {driveResource ? (
              <>
                <div className={`rounded-xl border-2 p-5 ${driveStatusCfg?.cls?.replace('text-', 'border-') || 'border-border'} bg-white`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-foreground">{driveResource.folderName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 ${driveStatusCfg?.cls}`}>{driveStatusCfg?.label}</span>
                          <span className="text-[10px] text-muted-foreground">Owner: {driveResource.owner}</span>
                        </div>
                      </div>
                    </div>
                    {driveResource.folderUrl ? (
                      <a href={driveResource.folderUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-primary border border-primary/20 bg-primary/5 rounded-full px-3 py-1.5 hover:bg-primary/10 transition-colors">
                        Open Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground border border-border rounded-full px-3 py-1.5">No URL configured</span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-3">{driveResource.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {driveResource.contentTypes.map(ct => (
                      <span key={ct} className="text-[10px] font-medium border border-border bg-muted/30 rounded-full px-2 py-0.5 text-muted-foreground">{ct}</span>
                    ))}
                  </div>
                </div>

                {driveResource.subFolders.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Sub-Folders</p>
                    <div className="space-y-1.5">
                      {driveResource.subFolders.map((sf, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
                          <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="text-[12px] font-semibold text-foreground">{sf.name}</p>
                            <p className="text-[10px] text-muted-foreground">{sf.description}</p>
                          </div>
                          {sf.url && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Configuration Details</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">Permissions Model:</span> <span className="font-medium text-foreground">{driveResource.permissionsModel.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></div>
                    <div><span className="text-muted-foreground">Sync Status:</span> <span className="font-medium text-foreground capitalize">{driveResource.syncStatus.replace(/-/g, ' ')}</span></div>
                    <div><span className="text-muted-foreground">Last Updated:</span> <span className="font-medium text-foreground">{driveResource.lastUpdated}</span></div>
                    <div><span className="text-muted-foreground">Created By:</span> <span className="font-medium text-foreground">{driveResource.createdBy}</span></div>
                  </div>
                  {driveResource.sharedDriveId ? (
                    <div className="mt-2 text-[11px]"><span className="text-muted-foreground">Shared Drive ID:</span> <span className="font-mono font-medium text-foreground">{driveResource.sharedDriveId}</span></div>
                  ) : (
                    <p className="mt-2 text-[10px] text-muted-foreground italic">Shared Drive ID not set — configure in Admin &gt; Program Resources for future API access.</p>
                  )}
                  {driveResource.notes && <p className="mt-2 text-[10px] text-amber-700 border-t border-border pt-2">{driveResource.notes}</p>}
                </div>
              </>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-[13px] font-semibold text-muted-foreground mb-1">No Google Drive configured</p>
                <p className="text-[11px] text-muted-foreground">Set up a Google Drive workspace for {programName} in Admin &gt; Program Resources.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Content Health Tab ── */}
        {tab === 'health' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <StatPill label="Total Issues" value={healthIssues.length} cls="border-red-200 bg-red-50" />
              <StatPill label="High Severity" value={healthIssues.filter(h => h.severity === 'high').length} cls="border-red-200 bg-red-50" />
              <StatPill label="Modules Affected" value={new Set(healthIssues.map(h => h.affectedObjectId)).size} cls="border-amber-200 bg-amber-50" />
            </div>
            {healthIssues.length === 0 ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-[13px] font-semibold text-green-800">All Clear</p>
                <p className="text-[11px] text-green-700">No content health issues found for {programName}.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {healthIssues.map(issue => (
                  <button key={issue.id} onClick={() => selectItem(issue)}
                    className="w-full rounded-xl border border-red-200 bg-red-50/30 p-4 text-left hover:shadow-sm transition-all">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${issue.severity === 'high' ? 'text-red-500' : 'text-orange-400'}`} />
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-foreground">{issue.name}</p>
                        <p className="text-[11px] text-muted-foreground">{issue.purpose}</p>
                        <p className="text-[11px] text-amber-700 mt-1 font-medium">→ {issue.actionRequired as string}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </ScrollArea>
  );
}
