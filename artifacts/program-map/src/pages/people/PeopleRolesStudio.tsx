import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import { Users, ChevronRight, Shield, MessageSquare, Sparkles, Database, Activity, BookOpen, Map, Target, CheckCircle2, AlertTriangle, XCircle, User, Plus } from 'lucide-react';
import {
  personas, roles, responsibilities, roleBlueprints,
  programParticipation, commMappings, pennySupportMappings,
  salesforceMappings, roleHealthRecords,
  PERSONA_TYPE_CONFIG, HEALTH_STATUS_CONFIG, BLUEPRINT_STATUS_CONFIG, PARTICIPATION_TYPE_CONFIG,
  type Persona, type Role, type RoleBlueprint, type ProgramParticipation,
} from '@/data/peopleRolesData';

const VIEWS = [
  'Overview', 'Personas', 'Roles', 'Responsibilities',
  'Role Blueprints', 'Program Participation', 'Communications',
  'Penny Support', 'Salesforce Mapping', 'Role Health',
] as const;
type View = typeof VIEWS[number];

const VIEW_ICONS: Record<View, typeof Users> = {
  'Overview': Map, 'Personas': User, 'Roles': Users,
  'Responsibilities': Target, 'Role Blueprints': BookOpen,
  'Program Participation': Activity, 'Communications': MessageSquare,
  'Penny Support': Sparkles, 'Salesforce Mapping': Database,
  'Role Health': Shield,
};

function HealthDot({ status }: { status: 'healthy' | 'needs-attention' | 'incomplete' }) {
  const cfg = HEALTH_STATUS_CONFIG[status];
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />;
}

function StatBox({ label, value, sub, color = 'text-foreground' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PeopleRolesStudio() {
  const [view, setView] = useState<View>('Overview');
  const { setSelectedItem, openActionPanel } = useAppContext();

  const selectPersona  = (p: Persona) =>       setSelectedItem({ type: 'persona',      id: p.id, data: p });
  const selectRole     = (r: Role) =>           setSelectedItem({ type: 'role',         id: r.id, data: r });
  const selectBlueprint = (b: RoleBlueprint) => setSelectedItem({ type: 'roleBlueprint', id: b.id, data: b });
  const selectParticipation = (prog: ProgramParticipation) => setSelectedItem({ type: 'roleParticipation', id: prog.programId, data: prog });

  const healthy    = roleHealthRecords.filter(r => r.healthStatus === 'healthy').length;
  const attention  = roleHealthRecords.filter(r => r.healthStatus === 'needs-attention').length;
  const incomplete = roleHealthRecords.filter(r => r.healthStatus === 'incomplete').length;
  const blueprintsDone = roleBlueprints.filter(b => b.status === 'complete').length;

  function handleNewPersona() {
    openActionPanel({
      title: 'New Persona', objectType: 'Persona',
      subtitle: 'Define a learner or stakeholder archetype for the Trail OS human layer.',
      slackContext: 'people',
      fields: [
        { id: 'name',         label: 'Persona Name',     type: 'text',     required: true, placeholder: 'e.g. Career Changer — Mid-level' },
        { id: 'type',         label: 'Type',             type: 'select',   options: ['Learner', 'Coach', 'Admin', 'Employer', 'Partner', 'Funder'], required: true },
        { id: 'background',   label: 'Background',       type: 'textarea', placeholder: 'Who is this person? Brief demographic and context…', rows: 3 },
        { id: 'goals',        label: 'Goals',            type: 'textarea', placeholder: 'What does this persona want to achieve?', rows: 3 },
        { id: 'frustrations', label: 'Frustrations',     type: 'textarea', placeholder: 'What blocks them from their goals?', rows: 3 },
        { id: 'programs',     label: 'Typical Programs', type: 'text',     placeholder: 'e.g. Digital Literacy Trail, Foundations Trail' },
      ],
      onSaveAndView: () => setView('Personas'),
    });
  }

  function handleNewRole() {
    openActionPanel({
      title: 'New Role', objectType: 'Role',
      subtitle: 'Define a functional role in the Trail OS human operating layer.',
      slackContext: 'people',
      fields: [
        { id: 'name',        label: 'Role Name',         type: 'text',     required: true, placeholder: 'e.g. Peer Mentor Lead' },
        { id: 'category',    label: 'Category',          type: 'select',   options: ['Staff', 'Participant', 'Partner', 'Admin', 'Coach', 'Volunteer'] },
        { id: 'description', label: 'Description',       type: 'textarea', placeholder: 'What is this role responsible for?', rows: 3 },
        { id: 'programs',    label: 'Programs',          type: 'text',     placeholder: 'Which programs does this role operate in?' },
        { id: 'pennySupport',label: 'Penny Support',     type: 'text',     placeholder: 'How does Penny support this role?' },
        { id: 'sfObject',    label: 'Salesforce Object', type: 'text',     placeholder: 'e.g. Contact (role: Volunteer)' },
      ],
      onSaveAndView: () => setView('Roles'),
    });
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 pt-5 pb-0 bg-background">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-primary" />
          <h1 className="text-lg font-bold text-foreground">People &amp; Roles Studio</h1>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 ml-1">Human Layer</span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={handleNewPersona}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[10px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3 h-3" />
              New Persona
            </button>
            <button
              onClick={handleNewRole}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-full text-[10px] font-bold hover:bg-muted/40 transition-colors"
            >
              <Plus className="w-3 h-3" />
              New Role
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 max-w-2xl">Models the human operating layer of Trail OS — personas, roles, blueprints, program participation, communications, Penny support, and Salesforce mappings.</p>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {VIEWS.map(v => {
            const Icon = VIEW_ICONS[v];
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-md whitespace-nowrap border-b-2 transition-colors ${
                  view === v ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="w-3 h-3" />
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-6">

          {/* ── OVERVIEW ── */}
          {view === 'Overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Personas"        value={personas.length}        sub="across org" />
                <StatBox label="Roles Defined"   value={roles.length}           sub={`${roles.filter(r=>r.owner).length} with owner`} />
                <StatBox label="Blueprints"       value={`${blueprintsDone}/${roleBlueprints.length}`} sub="complete" color="text-primary" />
                <StatBox label="Health Issues"    value={attention + incomplete} sub={`${attention} attention · ${incomplete} incomplete`} color={attention + incomplete > 0 ? 'text-amber-600' : 'text-emerald-600'} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Role health bar */}
                <div className="col-span-2 rounded-lg border border-border bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">Role Health Overview</p>
                  <div className="flex h-3 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-400 transition-all" style={{ width: `${(healthy / roles.length) * 100}%` }} />
                    <div className="bg-amber-400 transition-all"   style={{ width: `${(attention / roles.length) * 100}%` }} />
                    <div className="bg-rose-400 transition-all"    style={{ width: `${(incomplete / roles.length) * 100}%` }} />
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{healthy} Healthy</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{attention} Needs Attention</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />{incomplete} Incomplete</span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="rounded-lg border border-border bg-white p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Quick Stats</p>
                  {[
                    { label: 'Roles with owner',       value: `${roles.filter(r=>r.owner).length}/${roles.length}` },
                    { label: 'Blueprints complete',    value: `${blueprintsDone}/${roleBlueprints.length}` },
                    { label: 'Programs mapped',        value: programParticipation.length },
                    { label: 'Comm mappings',          value: commMappings.length },
                    { label: 'Penny support mapped',   value: pennySupportMappings.length },
                    { label: 'SF mappings defined',    value: salesforceMappings.length },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-semibold text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personas at a glance */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Personas at a Glance</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {personas.map(p => {
                    const typCfg = PERSONA_TYPE_CONFIG[p.type];
                    const hlth   = HEALTH_STATUS_CONFIG[p.healthStatus];
                    return (
                      <button key={p.id} onClick={() => selectPersona(p)}
                        className="rounded-lg border border-border bg-white p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${typCfg.cls}`}>{typCfg.label}</span>
                          <HealthDot status={p.healthStatus} />
                        </div>
                        <p className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── PERSONAS ── */}
          {view === 'Personas' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Persona</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Type</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px] hidden md:table-cell">Purpose</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Health</th>
                      <th className="px-3 py-2 w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {personas.map(p => {
                      const typCfg = PERSONA_TYPE_CONFIG[p.type];
                      const hlth   = HEALTH_STATUS_CONFIG[p.healthStatus];
                      return (
                        <tr key={p.id} onClick={() => selectPersona(p)}
                          className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-foreground">{p.name}</td>
                          <td className="px-3 py-2.5"><span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${typCfg.cls}`}>{typCfg.label}</span></td>
                          <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell max-w-xs truncate">{p.purpose}</td>
                          <td className="px-3 py-2.5">
                            <span className={`flex items-center gap-1 text-[10px] font-semibold ${hlth.cls.split(' ')[0]}`}>
                              <HealthDot status={p.healthStatus} />{hlth.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5"><ChevronRight className="w-3 h-3 text-muted-foreground/40" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ROLES ── */}
          {view === 'Roles' && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Role</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Persona</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Blueprint</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Owner</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Health</th>
                    <th className="px-3 py-2 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {roles.map(r => {
                    const bpCfg  = BLUEPRINT_STATUS_CONFIG[r.blueprintStatus];
                    const hlth   = HEALTH_STATUS_CONFIG[r.healthStatus];
                    return (
                      <tr key={r.id} onClick={() => selectRole(r)}
                        className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-foreground">{r.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{r.personaName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{r.type}</td>
                        <td className="px-3 py-2.5"><span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${bpCfg.cls}`}>{bpCfg.label}</span></td>
                        <td className="px-3 py-2.5">{r.owner ?? <span className="text-rose-500 italic">Unassigned</span>}</td>
                        <td className="px-3 py-2.5"><span className={`flex items-center gap-1 text-[10px] font-semibold ${hlth.cls.split(' ')[0]}`}><HealthDot status={r.healthStatus} />{hlth.label}</span></td>
                        <td className="px-3 py-2.5"><ChevronRight className="w-3 h-3 text-muted-foreground/40" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── RESPONSIBILITIES ── */}
          {view === 'Responsibilities' && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Role</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Area</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px] hidden md:table-cell">Description</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Required</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Penny</th>
                    <th className="px-3 py-2 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {responsibilities.map(resp => {
                    const role = roles.find(r => r.id === resp.roleId);
                    return (
                      <tr key={resp.id}
                        onClick={() => role && selectRole(role)}
                        className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-foreground">{resp.roleName}</td>
                        <td className="px-3 py-2.5"><span className="font-medium text-primary/80">{resp.area}</span></td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell max-w-xs truncate">{resp.description}</td>
                        <td className="px-3 py-2.5">
                          {resp.required
                            ? <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">Required</span>
                            : <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">Optional</span>}
                        </td>
                        <td className="px-3 py-2.5">{resp.pennySupport
                          ? <span className="flex items-center gap-1 text-[10px] text-secondary font-medium"><Sparkles className="w-2.5 h-2.5" />AI</span>
                          : <span className="text-muted-foreground/40 text-[10px]">—</span>}
                        </td>
                        <td className="px-3 py-2.5"><ChevronRight className="w-3 h-3 text-muted-foreground/40" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ROLE BLUEPRINTS ── */}
          {view === 'Role Blueprints' && (
            <div className="space-y-3">
              {roleBlueprints.map(bp => {
                const stCfg = BLUEPRINT_STATUS_CONFIG[bp.status];
                return (
                  <div key={bp.id}
                    onClick={() => selectBlueprint(bp)}
                    className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${stCfg.cls}`}>{stCfg.label}</span>
                          <span className="text-[10px] text-muted-foreground/60">{bp.personaName}</span>
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                          <span className="text-[10px] text-muted-foreground/60">Owner: {bp.owner || <em>unassigned</em>}</span>
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                          <span className="text-[10px] text-muted-foreground/60">Reviewed {bp.lastReviewed}</span>
                        </div>
                        <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{bp.roleName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{bp.shortDescription}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
                    </div>
                    <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
                      <span>{bp.responsibilities.length} responsibilities</span>
                      <span>{bp.pennySupport.length} Penny capabilities</span>
                      <span>{bp.salesforceMappings.length} SF objects</span>
                      <span>{bp.calendarTouchpoints.length} calendar events</span>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {bp.standards.map(s => (
                        <span key={s} className="text-[10px] border border-border rounded-full px-2 py-0.5 text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Roles without blueprints */}
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Roles Pending Blueprint</p>
                <div className="flex flex-wrap gap-2">
                  {roles.filter(r => r.blueprintStatus !== 'complete').map(r => (
                    <span key={r.id}
                      onClick={() => selectRole(r)}
                      className={`cursor-pointer text-[10px] font-medium border rounded-full px-2 py-0.5 hover:bg-amber-100 transition-colors ${BLUEPRINT_STATUS_CONFIG[r.blueprintStatus].cls}`}>
                      {r.name} — {r.blueprintStatus}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PROGRAM PARTICIPATION ── */}
          {view === 'Program Participation' && (
            <div className="space-y-4">
              {programParticipation.map(prog => (
                <div key={prog.programId}
                  onClick={() => selectParticipation(prog)}
                  className="rounded-lg border border-border bg-white overflow-hidden hover:border-primary/40 cursor-pointer transition-colors group">
                  <div className="px-4 py-3 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                    <div>
                      <p className={`text-[12px] font-bold ${prog.programColorCls}`}>{prog.programName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{prog.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{prog.roleParticipation.length} roles</span>
                  </div>
                  <div className="px-4 py-2">
                    <div className="flex flex-wrap gap-1.5 py-1.5">
                      {prog.roleParticipation.map(rp => {
                        const typCfg = PARTICIPATION_TYPE_CONFIG[rp.type];
                        return (
                          <span key={rp.roleId} className={`text-[10px] font-semibold border rounded-full px-2.5 py-0.5 ${typCfg.cls}`}>
                            {rp.roleName} <span className="opacity-60">·</span> {rp.type}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── COMMUNICATIONS ── */}
          {view === 'Communications' && (
            <div className="space-y-3">
              {commMappings.map(cm => {
                const role = roles.find(r => r.id === cm.roleId);
                return (
                  <div key={cm.roleId}
                    onClick={() => role && selectRole(role)}
                    className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 cursor-pointer transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">{cm.roleName}</p>
                        <p className="text-[10px] text-muted-foreground">{cm.personaName}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {cm.slack.length > 0 && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">{cm.slack.length} Slack</span>}
                        {cm.googleChat.length > 0 && <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">{cm.googleChat.length} Chat</span>}
                        {cm.calendar.length > 0 && <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5">{cm.calendar.length} Cal</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
                      {cm.slack.map(s => (
                        <div key={s.channel} className="rounded border border-emerald-100 bg-emerald-50/50 px-2 py-1">
                          <p className="font-semibold text-emerald-800">{s.channel}</p>
                          <p className="text-muted-foreground">{s.purpose}</p>
                        </div>
                      ))}
                      {cm.googleChat.map(g => (
                        <div key={g.space} className="rounded border border-blue-100 bg-blue-50/50 px-2 py-1">
                          <p className="font-semibold text-blue-800">{g.space}</p>
                          <p className="text-muted-foreground">{g.purpose}</p>
                        </div>
                      ))}
                      {cm.calendar.map(c => (
                        <div key={c.event} className="rounded border border-violet-100 bg-violet-50/50 px-2 py-1">
                          <p className="font-semibold text-violet-800">{c.event}</p>
                          <p className="text-muted-foreground">{c.cadence} · {c.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PENNY SUPPORT ── */}
          {view === 'Penny Support' && (
            <div className="space-y-3">
              {pennySupportMappings.map(ps => {
                const role = roles.find(r => r.id === ps.roleId);
                const STATUS_CLS: Record<string, string> = {
                  active:    'text-emerald-700 bg-emerald-50 border-emerald-200',
                  prototype: 'text-amber-700 bg-amber-50 border-amber-200',
                  planned:   'text-slate-600 bg-slate-50 border-slate-200',
                };
                const ACCESS_CLS: Record<string, string> = {
                  Full: 'text-primary bg-primary/10 border-primary/20',
                  Guided: 'text-blue-700 bg-blue-50 border-blue-200',
                  'Read-Only': 'text-slate-600 bg-slate-50 border-slate-200',
                  None: 'text-muted-foreground bg-muted border-border',
                };
                return (
                  <div key={ps.roleId}
                    onClick={() => role && selectRole(role)}
                    className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 cursor-pointer transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[12px] font-semibold text-foreground group-hover:text-primary">{ps.roleName}</p>
                        <p className="text-[10px] text-muted-foreground">{ps.personaName}</p>
                      </div>
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${ACCESS_CLS[ps.accessLevel]}`}>{ps.accessLevel} Access</span>
                    </div>
                    <div className="space-y-1.5 mb-2">
                      {ps.capabilities.map(c => (
                        <div key={c.capability} className="flex items-start gap-2">
                          <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 ${STATUS_CLS[c.status]}`}>{c.status}</span>
                          <div>
                            <p className="text-[11px] font-semibold text-foreground leading-tight">{c.capability}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{c.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {ps.notes && <p className="text-[10px] text-muted-foreground/70 italic border-t border-border/50 pt-2">{ps.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SALESFORCE MAPPING ── */}
          {view === 'Salesforce Mapping' && (
            <div className="space-y-3">
              {salesforceMappings.map(sm => {
                const role = roles.find(r => r.id === sm.roleId);
                return (
                  <div key={sm.roleId}
                    onClick={() => role && selectRole(role)}
                    className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 cursor-pointer transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[12px] font-semibold text-foreground group-hover:text-primary">{sm.roleName}</p>
                        <p className="text-[10px] text-muted-foreground">{sm.personaName} · Primary: <strong>{sm.primaryObject}</strong></p>
                      </div>
                      <Database className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="space-y-1.5 mb-2">
                      {sm.relatedObjects.map(obj => (
                        <div key={obj.object} className="flex items-start gap-2">
                          <span className="text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 text-blue-700 bg-blue-50 border-blue-200">{obj.relationship}</span>
                          <div>
                            <p className="text-[11px] font-semibold text-foreground leading-tight">{obj.object}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{obj.fields.slice(0, 3).join(', ')}{obj.fields.length > 3 ? '…' : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 italic border-t border-border/50 pt-2">{sm.permissionModel}</p>
                    {sm.futureNotes && <p className="text-[10px] text-amber-700 italic mt-1">{sm.futureNotes}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ROLE HEALTH ── */}
          {view === 'Role Health' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Healthy"        value={roleHealthRecords.filter(r=>r.healthStatus==='healthy').length}          color="text-emerald-600" />
                <StatBox label="Needs Attention" value={roleHealthRecords.filter(r=>r.healthStatus==='needs-attention').length} color="text-amber-600" />
                <StatBox label="Incomplete"      value={roleHealthRecords.filter(r=>r.healthStatus==='incomplete').length}      color="text-rose-600" />
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Role</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Score</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Owner</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Blueprint</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Comms</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">Penny</th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">SF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleHealthRecords.sort((a, b) => a.healthScore - b.healthScore).map(rh => {
                      const role = roles.find(r => r.id === rh.roleId);
                      const Icon = rh.healthScore >= 80 ? CheckCircle2 : rh.healthScore >= 50 ? AlertTriangle : XCircle;
                      const iconCls = rh.healthScore >= 80 ? 'text-emerald-500' : rh.healthScore >= 50 ? 'text-amber-500' : 'text-rose-500';
                      const check = (ok: boolean) => ok
                        ? <XCircle className="w-3 h-3 text-rose-400 mx-auto" />
                        : <CheckCircle2 className="w-3 h-3 text-emerald-400 mx-auto" />;
                      return (
                        <tr key={rh.roleId}
                          onClick={() => role && selectRole(role)}
                          className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-foreground">{rh.roleName}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Icon className={`w-3 h-3 ${iconCls}`} />
                              <span className={`font-bold ${iconCls}`}>{rh.healthScore}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center">{check(rh.missingOwner)}</td>
                          <td className="px-2 py-2.5 text-center">{check(rh.unclearResponsibilities)}</td>
                          <td className="px-2 py-2.5 text-center">{check(rh.missingCommChannel)}</td>
                          <td className="px-2 py-2.5 text-center">{check(rh.missingPennySupport)}</td>
                          <td className="px-2 py-2.5 text-center">{check(rh.missingSalesforceMapping)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
