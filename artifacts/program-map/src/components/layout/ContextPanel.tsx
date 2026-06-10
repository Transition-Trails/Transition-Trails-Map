import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { Layers, Calendar, ArrowRight, ChevronRight, ChevronLeft, Database, Sparkles, MessageSquare, Bell, Radio, CalendarDays, FileText, BookOpen, GraduationCap, AlertTriangle, Zap, CheckCircle2, Clock, Shield, Link2, Pencil, Hash, Bot } from 'lucide-react';
import { PagePennyGuide } from './PagePennyGuide';
import { RailActionPanel } from '@/components/workspace/RailActionPanel';
import { SlackContextPanel } from '@/components/workspace/SlackContextPanel';
import { ACTION_CATEGORY_CONFIG, type PennyContentAction } from '@/data/pennyContentActions';
import { type TrailOsSfMapping, SF_STATUS_CONFIG, type SfMappingStatus, SF_PRODUCT_CONFIG } from '@/data/salesforceArchitectureData';
import { type ContentStandard, STANDARD_STATUS_CONFIG, STANDARD_CONFIDENCE_CONFIG, STANDARD_CATEGORY_CONFIG } from '@/data/standardsData';
import { type PennyCapability, CAPABILITY_READINESS_CONFIG, CAPABILITY_DOMAIN_CONFIG, POC_STATUS_CONFIG } from '@/data/pennyCapabilityData';
import { type KnowledgeSource, SOURCE_TYPE_CONFIG, TRUST_LEVEL_CONFIG, SYNC_STATUS_CONFIG, HEALTH_CONFIG } from '@/data/knowledgeSourceData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { locationToContext, getSignalPanelConfig, SIGNAL_COUNTS } from '@/data/signalCounts';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { useTierFlags } from '@/hooks/useTierFlags';

export function ContextPanel() {
  const { selectedItem, setSelectedItem, trailOsCapabilities, pennyCapabilities, actionPanel, closeActionPanel, slackPanel, closeSlackPanel, openSlackPanel, setPennyPanelTab } = useAppContext();
  const [location, setLocation] = useLocation();
  const { isEveryday } = useTierFlags();

  // ── Focus / Brief mode ────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (selectedItem) setCollapsed(false);
  }, [selectedItem]);

  useEffect(() => {
    if (actionPanel) setCollapsed(false);
  }, [actionPanel]);

  useEffect(() => {
    if (slackPanel) setCollapsed(false);
  }, [slackPanel]);

  const handleChipClick = (type: string, id: string, route?: string) => {
    if (route) {
      setLocation(route);
    }
  };

  const renderContent = () => {
    if (!selectedItem) {
      return <PagePennyGuide />;
    }

    const { type, data } = selectedItem;

    if (type === 'document') {
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">
                  Document
                </Badge>
                <ConfidenceBadge status={data.confidence || 'needs-review'} />
                <Badge variant={data.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                  {data.status}
                </Badge>
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground">
                {data.name}
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground italic leading-relaxed">{data.summary}</p>
              
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Purpose</span>
                <p className="text-sm text-muted-foreground">{data.purpose}</p>
              </div>

              {data.quickTake && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Quick Take</span>
                  <p className="text-sm text-emerald-900 leading-tight">{data.quickTake}</p>
                </div>
              )}

              {data.sourceOfTruthFor && data.sourceOfTruthFor.length > 0 && (
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1">Source of Truth For</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                    {data.sourceOfTruthFor.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {data.notSourceOfTruthFor && data.notSourceOfTruthFor.length > 0 && (
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1">Not Source of Truth For</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                    {data.notSourceOfTruthFor.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {data.keyDecisionsInfluenced && data.keyDecisionsInfluenced.length > 0 && (
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1">Key Decisions Influenced</span>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                    {data.keyDecisionsInfluenced.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {data.programs && data.programs.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-foreground uppercase">Programs Affected</span>
                  <div className="flex flex-wrap gap-1">
                    {data.programs.map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
                  </div>
                </div>
              )}

              {data.relatedDocuments && data.relatedDocuments.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-foreground uppercase">Related Documents</span>
                  <div className="flex flex-wrap gap-1">
                    {data.relatedDocuments.map((d: string) => <Badge key={d} variant="outline" className="bg-muted text-muted-foreground">{d}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      );
    }

    if (type === 'commProvider') {
      const statusBg = data.status === 'prototype'
        ? 'bg-amber-50 border-amber-200 text-amber-700'
        : 'bg-muted border-border text-muted-foreground';
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">Comm Provider</Badge>
                <span className={`inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full ${statusBg}`}>
                  {data.status === 'prototype' ? 'Prototype-Ready' : 'Future'}
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground">{data.name}</h2>
              <p className="text-xs text-muted-foreground">{data.tagline}</p>
            </div>
            <div>
              <span className="block text-xs font-semibold text-foreground uppercase mb-1">Connection Status</span>
              <p className="text-sm text-muted-foreground">{data.connectionStatus} — {data.futureSetup}</p>
            </div>
            <div>
              <span className="block text-xs font-semibold text-foreground uppercase mb-1">Purpose</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.purpose}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <span className="block text-[10px] font-bold text-primary uppercase mb-1">Why It Matters</span>
              <p className="text-sm text-foreground leading-snug">{data.whyItMatters}</p>
            </div>
            {data.useCases?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Use Cases</span>
                <ul className="space-y-1">
                  {data.useCases.map((uc: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0 mt-2" />
                      {uc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.relatedPennyCaps?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Related Penny Capabilities</span>
                <div className="flex flex-wrap gap-1">
                  {data.relatedPennyCaps.map((c: string) => <Badge key={c} variant="secondary">{c}</Badge>)}
                </div>
              </div>
            )}
            {data.relatedDemandEvents?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Related Demand Events</span>
                <div className="flex flex-wrap gap-1">
                  {data.relatedDemandEvents.map((e: string) => <Badge key={e} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{e}</Badge>)}
                </div>
              </div>
            )}
            {data.requiredSetup?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Required Setup</span>
                <ol className="space-y-1">
                  {data.requiredSetup.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <span className="text-[10px] font-bold text-muted-foreground/60 mt-0.5 w-3 flex-shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Source / Owner: </span>{data.sourceOwner}
            </div>
          </div>
        </ScrollArea>
      );
    }

    if (type === 'commRoute') {
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">Comm Route</Badge>
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 text-[10px]">Planned</Badge>
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground">{data.eventType}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <span className="block text-[10px] font-bold text-primary uppercase mb-1">Why It Matters</span>
              <p className="text-sm text-foreground leading-snug">{data.whyItMatters}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Trigger',   value: data.trigger },
                { label: 'Audience', value: data.audience },
                { label: 'Owner',    value: data.owner },
              ].map(f => (
                <div key={f.label}>
                  <span className="block text-xs font-semibold text-foreground uppercase mb-0.5">{f.label}</span>
                  <p className="text-sm text-muted-foreground">{f.value}</p>
                </div>
              ))}
            </div>
            <div>
              <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Slack Channel (Now)</span>
              <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                <span className="font-mono text-sm text-foreground">{data.slackChannel}</span>
                <span className="text-[10px] text-amber-700 ml-auto">{data.slackStatus}</span>
              </div>
            </div>
            {data.googleChatSpace && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Google Chat (Future)</span>
                <div className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-md px-3 py-2">
                  <span className="text-sm text-muted-foreground">{data.googleChatSpace}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{data.googleChatStatus}</span>
                </div>
              </div>
            )}
            {data.relatedPennyCap && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Related Penny Capability</span>
                <Badge variant="secondary">{data.relatedPennyCap}</Badge>
              </div>
            )}
            {data.relatedDemandEvent && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Related Demand Event</span>
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{data.relatedDemandEvent}</Badge>
              </div>
            )}
          </div>
        </ScrollArea>
      );
    }

    if (type === 'commTemplate') {
      const statusColor = data.status === 'active' ? 'text-emerald-700' : data.status === 'draft' ? 'text-amber-700' : 'text-muted-foreground';
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">Message Template</Badge>
                <Badge variant="outline" className={`text-[10px] ${statusColor} bg-white`}>
                  {data.status?.charAt(0).toUpperCase() + data.status?.slice(1)}
                </Badge>
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground">{data.name}</h2>
            </div>
            <div className="bg-muted/60 border border-border rounded-md p-3">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Message Preview</span>
              <p className="text-sm text-foreground leading-relaxed font-mono text-[12px]">{data.messageSummary}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <span className="block text-[10px] font-bold text-primary uppercase mb-1">Why It Matters</span>
              <p className="text-sm text-foreground leading-snug">{data.whyItMatters}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Provider',     value: data.provider },
                { label: 'Destination', value: data.destination },
                { label: 'Audience',    value: data.audience },
                { label: 'Owner',       value: data.owner },
                { label: 'Reviewed',    value: data.lastReviewed },
              ].map(f => (
                <div key={f.label}>
                  <span className="block text-xs font-semibold text-foreground uppercase mb-0.5">{f.label}</span>
                  <p className="text-sm text-muted-foreground font-mono text-[12px]">{f.value}</p>
                </div>
              ))}
            </div>
            <div>
              <span className="block text-xs font-semibold text-foreground uppercase mb-1">Trigger Event</span>
              <p className="text-sm text-muted-foreground">{data.triggerEvent}</p>
            </div>
            {data.relatedPennyCap && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Related Penny Capability</span>
                <Badge variant="secondary">{data.relatedPennyCap}</Badge>
              </div>
            )}
            {data.relatedDemandEvent && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Related Demand Event</span>
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{data.relatedDemandEvent}</Badge>
              </div>
            )}
          </div>
        </ScrollArea>
      );
    }

    if (type === 'program') {
      const opStatus = data.operationalStatus;
      const statusDot = opStatus === 'active' ? 'bg-emerald-500' : opStatus === 'in-discovery' ? 'bg-sky-400' : 'bg-muted-foreground/50';
      const statusLabel = opStatus === 'active' ? 'Active' : opStatus === 'in-discovery' ? 'In Discovery' : 'Draft';
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">Program</Badge>
                <ConfidenceBadge status={data.confidence || 'needs-review'} />
                {opStatus && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                    <span className="text-muted-foreground">{statusLabel}</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground">{data.name}</h2>
              <p className="text-xs text-muted-foreground italic leading-snug">{data.strategicRole}</p>
            </div>

            {/* Health snapshot */}
            {opStatus && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: data.activeCohorts ?? 0, lbl: 'cohorts' },
                  { val: data.learnerCount > 0 ? data.learnerCount : '—', lbl: data.learnerLabel || 'learners' },
                  { val: data.applicants ?? data.waitlist ?? '—', lbl: data.applicants ? 'applied' : data.waitlist ? 'waitlist' : 'pipeline' },
                ].map(s => (
                  <div key={s.lbl} className="rounded-lg bg-muted/40 border border-border p-2 text-center">
                    <p className="text-base font-bold text-foreground">{String(s.val)}</p>
                    <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{s.lbl}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Next event */}
            {data.nextDate && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-md p-3">
                <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase mb-0.5">Next · {data.nextDate}</p>
                  <p className="text-xs text-foreground leading-snug">{data.nextEvent}</p>
                </div>
              </div>
            )}

            {/* Executive summary */}
            {data.executiveSummary && (
              <p className="text-sm text-muted-foreground italic leading-relaxed">{data.executiveSummary}</p>
            )}

            {/* Why it matters */}
            {data.whyItMatters && (
              <div className="bg-primary/5 border border-primary/15 rounded-md p-3">
                <span className="block text-[10px] font-bold text-primary uppercase mb-1">Why It Matters</span>
                <p className="text-sm text-foreground leading-snug">{data.whyItMatters}</p>
              </div>
            )}

            {/* Key facts */}
            {data.keyFacts?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Key Facts</span>
                <ul className="space-y-1">
                  {data.keyFacts.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0 mt-2" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* RESOLVE phases */}
            {data.resolvePhases?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">RESOLVE Phases</span>
                <div className="flex flex-wrap gap-1">
                  {data.resolvePhases.map((p: string) => (
                    <Badge key={p} variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[10px]">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Penny capabilities */}
            {data.pennyFeatures?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Penny Capabilities</span>
                <div className="flex flex-wrap gap-1">
                  {data.pennyFeatures.map((f: string) => (
                    <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Trail OS capabilities */}
            {data.trailOsCapabilities?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Trail OS Capabilities</span>
                <div className="flex flex-wrap gap-1">
                  {data.trailOsCapabilities.map((c: string) => (
                    <Badge key={c} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Slack channels */}
            {data.commChannels?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">
                  Slack Channels <span className="text-muted-foreground/50 normal-case font-normal">(Planned Q3 2025)</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {data.commChannels.map((c: string) => (
                    <Badge key={c} variant="outline" className="bg-[#4A154B]/5 text-[#4A154B] border-[#4A154B]/20 font-mono text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Source documents */}
            {data.docs?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Source Documents</span>
                <div className="flex flex-wrap gap-1">
                  {data.docs.map((d: string) => (
                    <Badge key={d} variant="outline" className="bg-muted text-muted-foreground text-[10px]">{d}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* What breaks if missing */}
            {data.whatBreaksIfMissing && (
              <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                <span className="block text-[10px] font-bold text-amber-800 uppercase mb-1">What Breaks If Missing</span>
                <p className="text-sm text-amber-900 leading-tight">{data.whatBreaksIfMissing}</p>
              </div>
            )}

            {/* Health note */}
            {data.healthNote && (
              <div className="bg-amber-100/50 border border-amber-200 rounded-md p-3">
                <span className="block text-[10px] font-bold text-amber-800 uppercase mb-1">⚠ Health Flag</span>
                <p className="text-xs text-amber-900">{data.healthNote}</p>
              </div>
            )}

            {/* Source + confidence */}
            <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-3">
              <p><span className="font-semibold text-foreground">Source: </span>{data.sourceDoc}</p>
              {data.confidence === 'needs-review' && (
                <p className="mt-1 text-amber-700">⚠ Some details require source document review before treating as authoritative.</p>
              )}
              <p className="mt-1 text-muted-foreground/60">Future: Salesforce MCP · Knowledge links</p>
            </div>
          </div>
        </ScrollArea>
      );
    }

    // ── Dedicated RESOLVE renderer (phases, mappings, work items, metrics) ──
    if (type === 'resolve') {
      const kind: string = data.kind || 'phase';

      // ── Operational Mapping ──
      if (kind === 'mapping') {
        return (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">Operational Mapping</Badge>
                <h2 className="text-xl font-serif font-bold text-foreground">{data.phase}</h2>
                <p className="text-xs text-muted-foreground italic leading-snug">{data.description}</p>
              </div>

              <div className="space-y-2">
                {([
                  { label: 'RESOLVE Phase',     value: data.phase,    cls: 'bg-primary/10 border-primary/20 text-primary' },
                  { label: 'Trail OS Capability', value: data.trailOs,  cls: 'bg-sky-50 border-sky-200 text-sky-800' },
                  { label: 'Penny AI Function',  value: `⚡ ${data.penny as string}`, cls: 'bg-violet-50 border-violet-200 text-violet-800' },
                  { label: 'Program Artifact',   value: data.artifact, cls: 'bg-muted border-border text-foreground' },
                ] as Array<{ label: string; value: string; cls: string }>).map((row) => (
                  <div key={row.label}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{row.label}</p>
                    <span className={`inline-flex text-xs font-medium border px-2 py-1 rounded-md ${row.cls}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              {(data.commChannels as string[])?.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">
                    Slack Channels{' '}
                    <span className="normal-case text-muted-foreground/50 font-normal">(Planned Q3 2025)</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(data.commChannels as string[]).map((c) => (
                      <Badge key={c} variant="outline" className="bg-[#4A154B]/5 text-[#4A154B] border-[#4A154B]/20 font-mono text-[10px]">{c}</Badge>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">Google Chat: Q4 2025+ · Same routing model, channel-agnostic</p>
                </div>
              )}

              {(data.sources as string[])?.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Sources</span>
                  <div className="flex flex-wrap gap-1">
                    {(data.sources as string[]).map((s) => (
                      <Badge key={s} variant="outline" className="bg-muted text-muted-foreground text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground/50">Prototype · Future: Salesforce MCP · Knowledge links</p>
            </div>
          </ScrollArea>
        );
      }

      // ── Active Work Item ──
      if (kind === 'work') {
        const statusDot: Record<string, string> = {
          'active': 'bg-emerald-500', 'in-discovery': 'bg-sky-400',
          'planning': 'bg-amber-400', 'in-progress': 'bg-primary',
        };
        const statusLabel: Record<string, string> = {
          'active': 'Active', 'in-discovery': 'In Discovery',
          'planning': 'Planning', 'in-progress': 'In Progress',
        };
        const dot = statusDot[data.status as string] ?? 'bg-muted-foreground/40';
        const lbl = statusLabel[data.status as string] ?? String(data.status);
        return (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">Active Work</Badge>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-muted-foreground">{lbl}</span>
                  </span>
                </div>
                <h2 className="text-xl font-serif font-bold text-foreground">{data.name as string}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'RESOLVE Phase', value: data.phase as string },
                  { label: 'Program',       value: data.program as string },
                  { label: 'Owner',         value: data.owner as string },
                  { label: 'Next Date',     value: data.nextDate as string },
                ] as Array<{ label: string; value: string }>).map((r) => (
                  <div key={r.label}>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5">{r.label}</p>
                    <p className="text-sm text-foreground font-medium">{r.value}</p>
                  </div>
                ))}
              </div>

              {(data.commChannels as string[])?.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">
                    Slack Channels{' '}
                    <span className="normal-case text-muted-foreground/50 font-normal">(Planned)</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(data.commChannels as string[]).map((c) => (
                      <Badge key={c} variant="outline" className="bg-[#4A154B]/5 text-[#4A154B] border-[#4A154B]/20 font-mono text-[10px]">{c}</Badge>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">Google Chat: Q4 2025+ · Reminders, alerts, digests</p>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground/50">Prototype data · Future: Salesforce Cases live sync</p>
            </div>
          </ScrollArea>
        );
      }

      // ── Demand Metric ──
      if (kind === 'metric') {
        return (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">Demand Signal</Badge>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-foreground leading-none">{data.count as number}</p>
                  <h2 className="text-xl font-serif font-bold text-foreground">{data.label as string}</h2>
                </div>
                <p className="text-xs text-muted-foreground">{data.note as string}</p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{data.description as string}</p>

              <div className="bg-muted/40 border border-border rounded-md p-3">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Pipeline Stage</span>
                <p className="text-sm text-foreground font-medium">{data.label as string}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.note as string}</p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Sources</span>
                <p className="text-[11px] text-muted-foreground/60">Prototype data · Future: Salesforce Cases live sync</p>
                <p className="text-[11px] text-muted-foreground/60">Knowledge Articles: not yet mapped · Owner: Program Lead</p>
                <p className="text-[11px] text-muted-foreground/60">Confidence: Prototype only — do not treat as authoritative</p>
              </div>
            </div>
          </ScrollArea>
        );
      }

      // ── RESOLVE Phase (default kind) ──
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">RESOLVE Phase</Badge>
                <ConfidenceBadge status={data.confidence || 'needs-review'} />
                {data.status && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                    <span className={`w-1.5 h-1.5 rounded-full ${data.status === 'active' ? 'bg-emerald-500' : data.status === 'needs-review' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                    <span className="text-muted-foreground">{data.status === 'active' ? 'Active' : data.status === 'needs-review' ? 'Needs Review' : 'Planning'}</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground">{data.letter} — {data.name}</h2>
              <p className="text-xs text-muted-foreground italic leading-snug">{data.purpose as string}</p>
            </div>

            {/* Programs using this phase — drawn from canonical relatedPrograms field */}
            {(data.relatedPrograms as string[])?.length > 0 && (
              <div>
                <span className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  Programs Using This Phase
                </span>
                <div className="flex flex-wrap gap-1">
                  {(data.relatedPrograms as string[]).map((p: string) => (
                    <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Overview */}
            {data.executiveSummary && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Overview</span>
                <p className="text-sm text-muted-foreground italic leading-relaxed">{data.executiveSummary as string}</p>
              </div>
            )}

            {data.owner && data.owner !== 'Source mapping needed' && (
              <div className="bg-muted/30 border border-border rounded-md p-2.5">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Owner</span>
                <p className="text-sm font-medium text-foreground">{data.owner as string}</p>
              </div>
            )}

            {data.whyItMatters && data.whyItMatters !== 'Source mapping needed' && (
              <div className="bg-primary/5 border border-primary/15 rounded-md p-3">
                <span className="block text-[10px] font-bold text-primary/80 uppercase mb-1">Why It Matters</span>
                <p className="text-sm text-foreground leading-snug">{data.whyItMatters as string}</p>
              </div>
            )}

            {/* Trail OS section */}
            {(data.trailOs as string[])?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Trail OS Capabilities</span>
                <div className="space-y-1.5">
                  {(data.trailOs as string[]).map((c) => {
                    const cap = trailOsCapabilities.find(t => t.name === c);
                    return (
                      <div key={c} className="bg-sky-50 border border-sky-100 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-sky-800">{c}</p>
                        {cap && <p className="text-[10px] text-sky-600 mt-0.5 leading-snug">{cap.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Penny section */}
            {(data.penny as string[])?.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Penny AI Capabilities</span>
                <div className="space-y-1.5">
                  {(data.penny as string[]).map((p) => {
                    const cap = (pennyCapabilities as Array<{ name: string; description?: string }>)?.find(c => c.name === p);
                    return (
                      <div key={p} className="bg-violet-50 border border-violet-100 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-violet-800">⚡ {p}</p>
                        {cap?.description && <p className="text-[10px] text-violet-600 mt-0.5 leading-snug">{cap.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Communications section */}
            <div>
              <span className="block text-xs font-semibold text-foreground uppercase mb-1.5">Communications</span>
              {(data.commChannels as string[])?.length > 0 ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#4A154B]/60 mb-1">Slack (Planned Q3 2025)</p>
                    <div className="flex flex-wrap gap-1">
                      {(data.commChannels as string[]).map((c) => (
                        <Badge key={c} variant="outline" className="bg-[#4A154B]/5 text-[#4A154B] border-[#4A154B]/20 font-mono text-[10px]">#{c.replace(/^#/, '')}</Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Google Chat: Q4 2025+ · Reminders, alerts, digests · channel-agnostic model</p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/60">No channels configured · Future: Slack Q3 2025 · Google Chat Q4 2025+</p>
              )}
            </div>

            {/* Sources section */}
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-foreground uppercase">Sources</span>
              {(data.docs as string[])?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(data.docs as string[]).map((d) => (
                    <Badge key={d} variant="outline" className="bg-muted text-muted-foreground text-[10px]">{d}</Badge>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground/60">Salesforce Cases: future · Knowledge Articles: future</p>
              {data.owner === 'Source mapping needed' && (
                <div className="bg-amber-50 border border-amber-100 rounded-md p-2.5 mt-1">
                  <p className="text-[11px] text-amber-800">⚠ Owner and operational details require source document review before treating as authoritative.</p>
                </div>
              )}
            </div>

            {/* Source note footer */}
            {data.sourceNote && (
              <p className="text-[11px] text-muted-foreground/50 border-t border-border/40 pt-3 leading-snug">{data.sourceNote as string}</p>
            )}
          </div>
        </ScrollArea>
      );
    }

    // ── Communications Hub — new item types (commChannel/Broadcast/WeeklyBrief/Notification)
    // Note: commProvider, commTemplate, commRoute are handled by existing blocks above.
    if (
      type === 'commChannel' ||
      type === 'commBroadcast' || type === 'commWeeklyBrief' ||
      type === 'commNotification' || type === 'commCalendar'
    ) {
      const TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
        commChannel:      { label: 'Channel / Space',    icon: <MessageSquare className="w-4 h-4 text-primary" /> },
        commBroadcast:    { label: 'Penny Broadcast',    icon: <Radio className="w-4 h-4 text-secondary" /> },
        commWeeklyBrief:  { label: 'Weekly Brief',       icon: <CalendarDays className="w-4 h-4 text-primary" /> },
        commNotification: { label: 'Notification Rule',  icon: <Bell className="w-4 h-4 text-primary" /> },
        commCalendar:     { label: 'Calendar Category',  icon: <CalendarDays className="w-4 h-4 text-emerald-700" /> },
      };
      const meta = TYPE_META[type] || { label: 'Communications', icon: <MessageSquare className="w-4 h-4 text-primary" /> };

      const title  = data.name || data.event || 'Untitled';
      const status = data.status || data.statusLabel || '—';

      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px] flex items-center gap-1">
                  {meta.icon}
                  {meta.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">{status}</Badge>
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground leading-snug">{title}</h2>
            </div>

            {data.purpose && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Purpose</span>
                <p className="text-sm text-foreground leading-relaxed">{data.purpose}</p>
              </div>
            )}

            {data.whyItMatters && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Why It Matters</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.whyItMatters}</p>
              </div>
            )}

            {data.pennyCapability && (
              <div className="rounded-md bg-secondary/5 border border-secondary/20 px-3 py-2">
                <span className="block text-[10px] font-bold text-secondary/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Penny Capability
                </span>
                <p className="text-sm font-medium text-foreground">{data.pennyCapability}</p>
              </div>
            )}

            {(data.relatedDemandEvent || data.demandEvent) && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Related Demand Event</span>
                <p className="text-sm text-foreground">{data.relatedDemandEvent || data.demandEvent}</p>
              </div>
            )}

            {(data.relatedProgram || data.audience) && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  {data.relatedProgram ? 'Related Program' : 'Audience'}
                </span>
                <p className="text-sm text-foreground">{data.relatedProgram || data.audience}</p>
              </div>
            )}

            {data.owner && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Owner</span>
                <p className="text-sm text-foreground">{data.owner}</p>
              </div>
            )}

            {data.capabilities && data.capabilities.length > 0 && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Capabilities</span>
                <div className="flex flex-wrap gap-1">
                  {data.capabilities.map((c: string) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                </div>
              </div>
            )}

            {data.sections && data.sections.length > 0 && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Brief Sections</span>
                <ul className="list-disc pl-4 space-y-1">
                  {data.sections.map((s: string) => {
                    const [title] = s.split(' — ');
                    return <li key={s} className="text-[11px] text-muted-foreground">{title}</li>;
                  })}
                </ul>
              </div>
            )}

            {data.example && (
              <div className="bg-muted/50 rounded-md px-3 py-2 border border-border/40">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Example Message</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">{data.example}</p>
              </div>
            )}

            {data.setupNotes && (
              <div className="bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Future Setup</span>
                <p className="text-[11px] text-amber-900 leading-relaxed">{data.setupNotes}</p>
              </div>
            )}

          </div>
        </ScrollArea>
      );
    }

    // ── Penny Content Action ───────────────────────────────────────────────
    if (type === 'pennyAction') {
      const action = data as PennyContentAction;
      const catCfg = ACTION_CATEGORY_CONFIG[action.category];
      return (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Penny Action</p>
              <p className="text-xl font-serif font-bold text-foreground leading-snug">{action.name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`inline-block text-[10px] font-bold border rounded-full px-2 py-0.5 ${catCfg?.chip ?? ''}`}>{action.category}</span>
                <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{action.estimatedTime}</span>
                <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${action.status === 'prototype' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>{action.status}</span>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{action.purpose}</p>
            <div className="rounded-lg border border-secondary/10 bg-secondary/5 p-3">
              <p className="text-[10px] font-bold text-secondary/60 uppercase tracking-wider mb-1">Context</p>
              <p className="text-[11px] text-foreground/80 italic leading-relaxed">{action.contextSentence}</p>
            </div>
            {action.inputs.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Inputs Required</p>
                <div className="space-y-1.5">
                  {action.inputs.map(inp => (
                    <div key={inp.label} className="flex items-start gap-2">
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 ${inp.required ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>{inp.required ? 'Required' : 'Optional'}</span>
                      <div><p className="text-[11px] font-semibold text-foreground">{inp.label}</p><p className="text-[10px] text-muted-foreground">{inp.description}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {action.generates.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Generates</p>
                <div className="space-y-1">
                  {action.generates.map(g => (
                    <div key={g.label} className="flex items-start gap-2">
                      <Sparkles className="w-3 h-3 text-secondary shrink-0 mt-0.5" />
                      <div><p className="text-[11px] font-semibold text-foreground">{g.label}</p><p className="text-[10px] text-muted-foreground">{g.description}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {action.applicableTo.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Applies To</p>
                <div className="flex flex-wrap gap-1">
                  {action.applicableTo.map(obj => (
                    <span key={obj} className="text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground capitalize">{obj}</span>
                  ))}
                </div>
              </div>
            )}
            {action.salesforceMapping && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Salesforce Mapping</p>
                <p className="text-[11px] font-semibold text-blue-900">{action.salesforceMapping}</p>
              </div>
            )}
            {action.notes && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Note</p>
                <p className="text-[11px] text-amber-900">{action.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      );
    }

    // ── Salesforce Architecture Mapping ────────────────────────────────────
    if (type === 'sfMapping') {
      const mapping = data as TrailOsSfMapping;
      const statusCfg = SF_STATUS_CONFIG[mapping.status];
      const productCfg = SF_PRODUCT_CONFIG[mapping.sfProduct];
      return (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Knowledge Brief — SF Architecture</p>
              <p className="text-xl font-serif font-bold text-foreground leading-snug">{mapping.trailOsObject}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                <span className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 ${productCfg.cls}`}>{productCfg.label}</span>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Maps To</p>
              <p className="text-[14px] font-bold text-blue-900">{mapping.sfLabel}</p>
              <p className="text-[11px] font-mono text-blue-700">{mapping.sfApiName}</p>
              <p className="text-[11px] text-blue-800">{mapping.sfPackageSource}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Purpose</p>
              <p className="text-[12px] text-foreground leading-relaxed">{mapping.purpose}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Current Implementation</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{mapping.currentImplementation}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Future Recommendation</p>
              <p className="text-[11px] text-amber-900 leading-relaxed">{mapping.futureRecommendation}</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">★ Reference Implementation: Foundations Trail</p>
              <p className="text-[11px] text-foreground leading-relaxed italic">{mapping.foundationsTrailExample}</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Link2 className="w-3 h-3" />
              <span className="capitalize">{mapping.relationshipType} relationship</span>
              <span>·</span>
              <span>Owner: {mapping.owner}</span>
            </div>
            {mapping.notes && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-1">Note</p>
                <p className="text-[11px] text-orange-900">{mapping.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      );
    }

    // ── Program Resource (Google Drive) ────────────────────────────────────
    if (type === 'programResource') {
      const res = data as any;
      return (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Knowledge Brief — Program Resource</p>
              <p className="text-xl font-serif font-bold text-foreground">{res.programName}</p>
              <p className="text-[12px] text-muted-foreground">{res.folderName || 'No folder configured'}</p>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{res.description}</p>
            {res.folderUrl && (
              <a href={res.folderUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[12px] font-semibold text-primary border border-primary/20 bg-primary/5 rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors">
                Open Google Drive folder
                <Shield className="w-3.5 h-3.5" />
              </a>
            )}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-[11px]">
              <div><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{res.owner}</span></div>
              <div><span className="text-muted-foreground">Permissions:</span> <span className="font-medium capitalize">{(res.permissionsModel || '').replace(/-/g, ' ')}</span></div>
              <div><span className="text-muted-foreground">Sync:</span> <span className="font-medium capitalize">{(res.syncStatus || '').replace(/-/g, ' ')}</span></div>
            </div>
          </div>
        </ScrollArea>
      );
    }

    // ── Penny Capability ───────────────────────────────────────────────────
    if (type === 'pennyCapability') {
      const cap     = data as PennyCapability;
      const matCfg  = CAPABILITY_READINESS_CONFIG[cap.maturity];
      const domCfg  = CAPABILITY_DOMAIN_CONFIG[cap.domain];
      const pocCfg  = POC_STATUS_CONFIG[cap.pocStatus];
      return (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Knowledge Brief — Penny Capability</p>
              <p className="text-xl font-serif font-bold text-foreground leading-snug">{cap.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${domCfg.cls}`}>{cap.domain}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${matCfg.cls}`}>{cap.maturity}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${pocCfg.cls}`}>{pocCfg.label}</span>
              </div>
            </div>

            <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3">
              <p className="text-[10px] font-bold text-secondary/60 uppercase tracking-wider mb-1">Purpose</p>
              <p className="text-[12px] text-foreground leading-relaxed">{cap.purpose}</p>
            </div>

            {cap.dependencies.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Dependencies</p>
                <div className="flex flex-wrap gap-1">
                  {cap.dependencies.map(depId => (
                    <span key={depId} className="text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground capitalize">{depId.replace('cap-', '').replace(/-/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            {cap.relatedPrograms.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Related Programs</p>
                <div className="flex flex-wrap gap-1">
                  {cap.relatedPrograms.map(p => <span key={p} className="text-[10px] font-medium border border-primary/20 bg-primary/5 rounded-full px-2 py-0.5 text-primary">{p}</span>)}
                </div>
              </div>
            )}

            {cap.relatedSfObjects.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">Salesforce Objects</p>
                <div className="flex flex-wrap gap-1">
                  {cap.relatedSfObjects.map(o => <span key={o} className="text-[10px] font-semibold text-blue-900 bg-white/70 border border-blue-100 rounded-full px-2 py-0.5">{o}</span>)}
                </div>
              </div>
            )}

            {cap.relatedStandards.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Related Standards</p>
                <div className="flex flex-wrap gap-1">
                  {cap.relatedStandards.map(s => <span key={s} className="text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground">{s.replace('std-', '').replace(/-/g, ' ')}</span>)}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-secondary/10 bg-secondary/5 p-3">
              <p className="text-[10px] font-bold text-secondary/60 uppercase tracking-wider mb-1">POC Mapping</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{cap.pocMapping}</p>
            </div>

            {cap.nextSteps.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Next Steps</p>
                <div className="space-y-1.5">
                  {cap.nextSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] text-foreground leading-snug">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cap.foundationsTrailExample && (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">★ Reference Implementation: Foundations Trail</p>
                <p className="text-[11px] text-foreground italic leading-relaxed">{cap.foundationsTrailExample}</p>
              </div>
            )}

            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Future Integration</p>
              <p className="text-[11px] text-amber-900 leading-relaxed">{cap.futureIntegrationStatus}</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] space-y-1">
              <div><span className="text-muted-foreground">Owner</span><span className="font-semibold text-foreground ml-2">{cap.owner}</span></div>
              <div><span className="text-muted-foreground">Audience</span><span className="font-semibold text-foreground ml-2">{cap.audience.join(', ')}</span></div>
            </div>
          </div>
        </ScrollArea>
      );
    }

    // ── Content Standard ───────────────────────────────────────────────────
    if (type === 'contentStandard') {
      const std = data as ContentStandard;
      const statusCfg     = STANDARD_STATUS_CONFIG[std.status];
      const confidenceCfg = STANDARD_CONFIDENCE_CONFIG[std.confidence];
      const catCfg        = STANDARD_CATEGORY_CONFIG[std.category];
      return (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Knowledge Brief — Content Standard</p>
              <p className="text-xl font-serif font-bold text-foreground leading-snug">{std.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${catCfg.cls}`}>{std.category}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${confidenceCfg.cls}`}>{confidenceCfg.label}</span>
              </div>
            </div>

            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
              <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Purpose</p>
              <p className="text-[12px] text-foreground leading-relaxed">{std.purpose}</p>
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Why It Matters</p>
              <p className="text-[11px] text-amber-900 leading-relaxed">{std.whyItMatters}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Required Fields ({std.requiredFields.filter(f => f.required).length} required)</p>
              <div className="space-y-1">
                {std.requiredFields.map(f => (
                  <div key={f.field} className="flex items-start gap-1.5">
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 ${f.required ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>{f.required ? 'Req' : 'Opt'}</span>
                    <div><p className="text-[11px] font-semibold text-foreground leading-tight">{f.field}</p><p className="text-[10px] text-muted-foreground leading-tight">{f.description}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {std.relatedContentObjects.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Related Content Objects</p>
                <div className="flex flex-wrap gap-1">
                  {std.relatedContentObjects.map(o => (
                    <span key={o} className="text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground">{o}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider mb-0.5">Salesforce</p>
                <p className="text-[11px] text-blue-900">{std.sfMapping}</p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5">
                <p className="text-[9px] font-bold text-violet-700 uppercase tracking-wider mb-0.5">LMS</p>
                <p className="text-[11px] text-violet-900">{std.lmsMapping}</p>
              </div>
            </div>

            <div className="rounded-lg border border-secondary/15 bg-secondary/5 p-3">
              <p className="text-[10px] font-bold text-secondary/60 uppercase tracking-wider mb-1">How Penny Uses This</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{std.howPennyUsesIt}</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] space-y-1.5">
              <div><span className="text-muted-foreground">Owner</span><span className="font-semibold text-foreground ml-2">{std.owner}</span></div>
              <div><span className="text-muted-foreground">Review cycle</span><span className="font-semibold text-foreground ml-2">{std.reviewCycle}</span></div>
              <div><span className="text-muted-foreground">Penny checks</span><span className="font-semibold text-foreground ml-2">{std.pennyChecks.length} ({std.pennyChecks.filter(c => c.required).length} required)</span></div>
            </div>
          </div>
        </ScrollArea>
      );
    }

    // ── Curriculum Studio item ─────────────────────────────────────────────
    if (type === 'curriculumItem') {
      const d           = data as any;
      const objType     = d.objectType as string;
      const status      = d.status as string;
      const statusCls: Record<string, string> = {
        published:      'text-green-700 bg-green-50 border-green-200',
        draft:          'text-amber-700 bg-amber-50 border-amber-200',
        'needs-review': 'text-orange-700 bg-orange-50 border-orange-200',
        missing:        'text-red-700 bg-red-50 border-red-200',
        prototype:      'text-violet-700 bg-violet-50 border-violet-200',
      };
      const objChip: Record<string, string> = {
        program:          'bg-primary/10 text-primary border-primary/20',
        sprint:           'bg-violet-50 text-violet-800 border-violet-200',
        module:           'bg-sky-50 text-sky-800 border-sky-200',
        lesson:           'bg-amber-50 text-amber-800 border-amber-200',
        assignment:       'bg-orange-50 text-orange-800 border-orange-200',
        assessment:       'bg-rose-50 text-rose-800 border-rose-200',
        knowledgeArticle: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        pennyTemplate:    'bg-secondary/10 text-secondary border-secondary/20',
        healthIssue:      'bg-red-50 text-red-700 border-red-200',
      };
      const objLabel: Record<string, string> = {
        program: 'Program', sprint: 'Sprint', module: 'Module', lesson: 'Lesson',
        assignment: 'Assignment', assessment: 'Assessment', knowledgeArticle: 'Knowledge Article',
        pennyTemplate: 'Penny Template', healthIssue: 'Content Health Issue',
      };
      const ObjIcon = objType === 'pennyTemplate' ? Sparkles
        : objType === 'knowledgeArticle' ? BookOpen
        : objType === 'healthIssue' ? AlertTriangle
        : GraduationCap;

      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">

            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${objChip[objType] ?? 'bg-muted text-muted-foreground border-border'}`}>
                  <ObjIcon className="w-3 h-3 mr-1" />
                  {objLabel[objType] ?? objType}
                </span>
                <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCls[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                  {status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                {d.confidence && (
                  <span className="inline-flex text-[10px] font-semibold border border-border bg-muted/40 text-muted-foreground rounded-full px-2 py-0.5">
                    {d.confidence}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground leading-tight">{d.name}</h2>
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Purpose</p>
              <p className="text-[12px] text-foreground leading-relaxed">{d.purpose}</p>
            </div>

            {/* Context — program / sprint / module chain */}
            {(d.program || d.sprint || d.module) && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Context</p>
                <div className="space-y-1">
                  {d.program && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-[11px] text-foreground">{d.program}</span>
                    </div>
                  )}
                  {d.sprint && (
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-violet-600 flex-shrink-0" />
                      <span className="text-[11px] text-foreground">{d.sprint}</span>
                    </div>
                  )}
                  {d.module && (
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-sky-600 flex-shrink-0" />
                      <span className="text-[11px] text-foreground">{d.module}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ownership */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Owner</p>
              {d.owner
                ? <p className="text-[12px] text-foreground font-medium">{d.owner}</p>
                : <p className="text-[12px] text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No owner assigned</p>}
            </div>

            {/* Type-specific fields */}

            {objType === 'sprint' && d.resolvePhase && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">RESOLVE Phase</p>
                <span className="inline-flex text-[11px] font-semibold border border-violet-200 bg-violet-50 text-violet-800 rounded-full px-2.5 py-0.5">{d.resolvePhase}</span>
              </div>
            )}

            {objType === 'sprint' && d.theme && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Theme</p>
                <p className="text-[12px] text-foreground">{d.theme}</p>
              </div>
            )}

            {objType === 'module' && Array.isArray(d.learningObjectives) && d.learningObjectives.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Learning Objectives</p>
                <ul className="space-y-1.5">
                  {(d.learningObjectives as string[]).map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-foreground leading-snug">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {objType === 'lesson' && d.learningObjective && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Learning Objective</p>
                <p className="text-[12px] text-foreground leading-relaxed">{d.learningObjective}</p>
              </div>
            )}

            {objType === 'lesson' && (
              <div className="grid grid-cols-2 gap-3">
                {d.lessonType && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Type</p>
                    <p className="text-[12px] text-foreground">{d.lessonType}</p>
                  </div>
                )}
                {d.duration && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Duration</p>
                    <p className="text-[12px] text-foreground">{d.duration}</p>
                  </div>
                )}
              </div>
            )}

            {objType === 'assessment' && (
              <div className="grid grid-cols-2 gap-3">
                {d.questionCount !== undefined && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Questions</p>
                    <p className="text-[12px] text-foreground font-semibold">{d.questionCount}</p>
                  </div>
                )}
                {d.passingScore !== undefined && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Passing Score</p>
                    <p className="text-[12px] text-foreground font-semibold">{d.passingScore}%</p>
                  </div>
                )}
              </div>
            )}

            {objType === 'knowledgeArticle' && (
              <div className="grid grid-cols-2 gap-3">
                {d.articleType && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Article Type</p>
                    <p className="text-[12px] text-foreground">{d.articleType}</p>
                  </div>
                )}
                {d.wordCount && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Word Count</p>
                    <p className="text-[12px] text-foreground">{d.wordCount}</p>
                  </div>
                )}
                {d.lastReviewed && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Last Reviewed</p>
                    <p className="text-[12px] text-foreground">{d.lastReviewed}</p>
                  </div>
                )}
              </div>
            )}

            {objType === 'pennyTemplate' && d.triggerContext && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Trigger Context</p>
                  <p className="text-[12px] text-foreground">{d.triggerContext}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {d.targetAudience && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Audience</p>
                      <p className="text-[12px] text-foreground">{d.targetAudience}</p>
                    </div>
                  )}
                  {d.tone && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Tone</p>
                      <p className="text-[12px] text-foreground italic">{d.tone}</p>
                    </div>
                  )}
                </div>
                {d.sampleOutput && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Sample Output</p>
                    <div className="rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2">
                      <p className="text-[11px] text-foreground leading-relaxed italic">{d.sampleOutput}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {objType === 'healthIssue' && (
              <div className="space-y-3">
                {Array.isArray(d.affectedItems) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Affected Items</p>
                    <ul className="space-y-1">
                      {(d.affectedItems as string[]).map((item, i) => (
                        <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {d.actionRequired && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Action Required</p>
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                      <p className="text-[11px] text-green-800 leading-relaxed">{d.actionRequired}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Salesforce / LMS mapping */}
            <div className="space-y-2 pt-1 border-t border-border/40">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Object Mapping</p>
              <div className="space-y-1.5">
                {d.relatedSalesforceObject && (
                  <div className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-[11px] text-foreground">{d.relatedSalesforceObject}</span>
                  </div>
                )}
                {d.relatedLmsObject && (
                  <div className="flex items-center gap-2">
                    <Layers className="w-3 h-3 text-sky-600 flex-shrink-0" />
                    <span className="text-[11px] text-foreground">{d.relatedLmsObject}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Penny generation actions */}
            {Array.isArray(d.pennyActions) && d.pennyActions.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-border/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Penny Generation</p>
                <div className="flex flex-wrap gap-1">
                  {(d.pennyActions as string[]).map(action => (
                    <span key={action} className="inline-flex items-center gap-1 text-[10px] font-medium text-secondary border border-secondary/20 bg-secondary/5 rounded-full px-2 py-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      {action}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/60">Future state — requires Penny Content Assistant integration</p>
              </div>
            )}

            {/* Future demand link */}
            {d.futureDemandLink && (
              <div className="pt-1 border-t border-border/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">Demand Management</p>
                <p className="text-[11px] text-muted-foreground">{d.futureDemandLink}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Governance workflows planned for Q3–Q4 2025</p>
              </div>
            )}

            {/* Notes */}
            {d.notes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-bold text-amber-900 mb-1">Note</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">{d.notes}</p>
              </div>
            )}

          </div>
        </ScrollArea>
      );
    }

    // Default rich panel for Program, Penny, Trail OS, Demand
    return (
      <ScrollArea className="h-full">
        <div className="p-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px]">
                {type === 'penny' && 'Penny AI Capability'}
                {type === 'trailOs' && 'Trail OS Capability'}
                {type === 'demand' && 'Demand Stage'}
              </Badge>
              <ConfidenceBadge status={data.confidence || 'needs-review'} />
            </div>
            <h2 className="text-xl font-serif font-bold text-foreground">
              {data.name}
            </h2>
          </div>

          <div className="space-y-6">
            {data.executiveSummary && (
              <p className="text-sm text-muted-foreground italic leading-relaxed">{data.executiveSummary}</p>
            )}

            {data.whyItMatters && (
              <div>
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Why It Matters</span>
                <p className="text-sm text-foreground">{data.whyItMatters}</p>
              </div>
            )}

            {data.keyFacts && data.keyFacts.length > 0 && (
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-foreground uppercase mb-1">Key Facts</span>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  {data.keyFacts.map((fact: string, i: number) => <li key={i}>{fact}</li>)}
                </ul>
              </div>
            )}

            {data.programs && data.programs.length > 0 && (
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-foreground uppercase">Programs Impacted</span>
                <div className="flex flex-wrap gap-1">
                  {data.programs.map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
              </div>
            )}

            {data.relatedConcepts && data.relatedConcepts.length > 0 && (
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-foreground uppercase">Related Concepts</span>
                <div className="flex flex-wrap gap-1">
                  {data.relatedConcepts.map((c: any, i: number) => (
                    <Badge key={i} variant="outline" className="bg-white border-primary/20 text-xs">
                      {c.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}


            {data.whatBreaksIfMissing && (
              <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                <span className="block text-[10px] font-bold text-amber-800 uppercase mb-1">What Breaks If Missing</span>
                <p className="text-sm text-amber-900 leading-tight">{data.whatBreaksIfMissing}</p>
              </div>
            )}

            {data.confidence === 'needs-review' && (
              <div className="bg-amber-100/50 border border-amber-200 rounded-md p-3">
                <span className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Source Mapping Note</span>
                <p className="text-xs text-amber-900 leading-tight">Some details in this brief require source mapping. Treat operational specifics as preliminary.</p>
              </div>
            )}

          </div>
        </div>
      </ScrollArea>
    );
  };

  const nudgeContext = locationToContext(location);
  const nudgeCounts = SIGNAL_COUNTS[nudgeContext] ?? null;
  const handleNudgeClick = () => openSlackPanel(getSignalPanelConfig(nudgeContext));

  return (
    <div
      className={`flex-shrink-0 h-full bg-white flex flex-col overflow-hidden transition-[width] duration-[250ms] ease-in-out ${
        collapsed
          ? 'w-9 border-l-2 border-primary/25'
          : actionPanel
          ? 'w-[420px] border-l-[3px] border-primary/45'
          : slackPanel
          ? 'w-[400px] border-l-[3px] border-[#4A154B]/45'
          : 'w-[300px] border-l-2 border-border/70'
      }`}
      style={{ boxShadow: '-4px 0 18px rgba(0,0,0,0.08)' }}
    >
      {collapsed ? (
        /* ── Focus Mode ──────────────────────────────────────────────────────
           Full-height button. ChevronLeft at top signals "click to expand left".
           Colored left border + group-hover primary tint make it clearly
           interactive rather than decorative.
        ──────────────────────────────────────────────────────────────────── */
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Open Trail Insights"
          title="Open Trail Insights"
          className="flex-1 w-full flex flex-col items-center justify-center gap-3 py-6
            hover:bg-primary/5 hover:border-primary transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary
            group"
        >
          {/* Chevron pointing left — expand affordance */}
          <ChevronLeft className="w-4 h-4 text-primary/50 group-hover:text-primary transition-colors duration-200" />

          {/* Icon + label */}
          <Layers className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/70 transition-colors duration-200" />
          <span
            className="text-[9px] font-bold tracking-widest uppercase select-none transition-colors duration-200
              text-muted-foreground/40 group-hover:text-primary/70"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Trail Insights
          </span>
        </button>
      ) : (
        /* ── Brief Mode ──────────────────────────────────────────────────────
           Labeled "Focus ›" collapse button — clearly shows the action and
           its effect. Left-edge primary accent border serves as the divider
           handle so users understand the panel boundary is interactive.
        ──────────────────────────────────────────────────────────────────── */
        <>
          {/* Mode accent line — thin color bar at top gives immediate mode signal */}
          <div className={`h-[3px] w-full flex-shrink-0 ${
            actionPanel ? 'bg-primary/55'
            : slackPanel ? 'bg-[#4A154B]/55'
            : !selectedItem ? 'bg-violet-400/70'
            : 'bg-border/60'
          }`} />
          <div className={`px-3 py-2.5 border-b z-10 flex items-center gap-2 shrink-0 ${
            actionPanel
              ? 'bg-primary/[0.06] border-primary/20'
              : slackPanel
              ? 'bg-[#4A154B]/[0.07] border-[#4A154B]/20'
              : !selectedItem
              ? 'bg-violet-50/60 border-violet-100/80'
              : 'bg-white border-border/60'
          }`}>
            {actionPanel
              ? <Pencil className="w-4 h-4 text-primary shrink-0" />
              : slackPanel
              ? <Hash className="w-4 h-4 text-[#4A154B] shrink-0" />
              : !selectedItem
              ? <Bot className="w-4 h-4 text-violet-600 shrink-0" />
              : <Layers className="w-4 h-4 text-primary shrink-0" />
            }
            <h3 className="font-semibold text-sm truncate flex-1">
              {actionPanel
                ? 'Action Panel'
                : slackPanel
                ? TERMS.trailSignals
                : !selectedItem
                ? 'Ask Penny'
                : TERMS.knowledgeBrief
              }
            </h3>
            {/* Header action button — Trail Insights in Penny mode, Focus collapse in Brief mode */}
            {(!selectedItem && !actionPanel && !slackPanel) ? (
              <button
                onClick={() => setPennyPanelTab('signals')}
                aria-label="View Trail Insights"
                title="View Trail Insights"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold shrink-0
                  text-violet-700 bg-violet-50 border border-violet-200
                  hover:bg-violet-100 hover:text-violet-800 hover:border-violet-300
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                Trail Insights
                <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse panel"
                title="Collapse panel"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold shrink-0
                  text-muted-foreground bg-muted/50 border border-border/60
                  hover:bg-muted hover:text-foreground hover:border-border
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Focus
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ── Trail Signals nudge strip ───────────────────────────────────
              Shown only in Knowledge Brief mode (not when Trail Signals
              or action panel is open) and only when the current page has
              signals available. Clicking it opens the Trail Signals panel.
          ──────────────────────────────────────────────────────────────── */}
          {!actionPanel && !slackPanel && nudgeCounts && nudgeCounts.total > 0 && (
            <button
              onClick={isEveryday ? () => setPennyPanelTab('signals') : handleNudgeClick}
              className="group w-full flex items-center gap-2 px-3 py-1.5 border-b shrink-0
                bg-amber-50/40 border-amber-100/80 hover:bg-amber-50
                transition-colors duration-150"
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                nudgeCounts.urgent > 0 ? 'bg-amber-400 animate-pulse' : 'bg-primary/25'
              }`} />
              <span className="text-[10px] text-left leading-tight flex-1 min-w-0 text-muted-foreground/80 group-hover:text-foreground transition-colors">
                {nudgeCounts.urgent > 0 ? (
                  <><span className="font-semibold text-amber-700">{nudgeCounts.urgent} urgent</span>{' · '}{nudgeCounts.total} {TERMS.trailSignals}</>
                ) : (
                  <><span className="font-semibold text-foreground/70">{nudgeCounts.total} {TERMS.trailSignals}</span>{' available'}</>
                )}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
            </button>
          )}

          <div className="flex-1 relative overflow-hidden bg-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  actionPanel ? `action-${actionPanel.title}`
                  : slackPanel ? `slack-${slackPanel.context}`
                  : selectedItem ? `${selectedItem.type}-${selectedItem.id}`
                  : `empty-${location}`
                }
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {actionPanel
                  ? <RailActionPanel config={actionPanel} onClose={closeActionPanel} />
                  : (!isEveryday && slackPanel)
                  ? <SlackContextPanel config={slackPanel} onClose={closeSlackPanel} />
                  : renderContent()
                }
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

// ── Home welcome guide ────────────────────────────────────────────────────────
// Six accordion chips — tap a section to reveal a short description + nav link.
// No tabs, no long paragraphs. Details appear only on demand.

type NavSection = {
  label: string;
  body: string;
  path: string;
  pathLabel: string;
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Navigator',
    body: "Ecosystem map for all programs. Program Map shows how Explorer's Trail, Foundations Trail, Guided Trail, Trail of Mastery, and Digital Compass connect. RESOLVE shows the delivery lifecycle.",
    path: '/navigator/program-map',
    pathLabel: 'Open Program Map',
  },
  {
    label: 'Operations',
    body: 'Real-time health for programs, Salesforce, automation, Penny, and the website. Start with Program Health for cohort and capacity status.',
    path: '/operations/program-health',
    pathLabel: 'Open Program Health',
  },
  {
    label: 'Demand',
    body: 'New requests, change requests, and delivery work. Use Intake to submit, Cases to review active items, and Roadmap for the delivery backlog.',
    path: '/demand/intake',
    pathLabel: 'Open Intake',
  },
  {
    label: 'Penny',
    body: 'AI coaching and operations layer. Learners shows cohort data, Logs shows session history, Trail Quests holds guided flows, Test Penny lets you run live interactions.',
    path: '/penny/test-penny',
    pathLabel: 'Open Test Penny',
  },
  {
    label: 'Library',
    body: 'Source of truth for all documentation. Documents holds source blueprints. Source Mapping tracks how each document connects to programs, phases, and Penny capabilities.',
    path: '/library/documents',
    pathLabel: 'Open Documents',
  },
  {
    label: 'Admin',
    body: 'Configure programs, RESOLVE phases, Trail OS capabilities, Penny settings, users, and permissions. Changes here affect the entire platform.',
    path: '/admin',
    pathLabel: 'Open Admin',
  },
];

function HomeWelcomeGuide() {
  const [open, setOpen] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
            How to use Trail OS
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select a section to see what lives there.
          </p>
        </div>

        {/* Accordion chips */}
        <div className="space-y-1.5">
          {NAV_SECTIONS.map(s => {
            const isOpen = open === s.label;
            return (
              <div
                key={s.label}
                className={`rounded-lg border transition-colors overflow-hidden ${
                  isOpen
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/60 bg-white/70 hover:bg-muted/30'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : s.label)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <span className={`text-[11px] font-semibold ${isOpen ? 'text-primary' : 'text-foreground'}`}>
                    {s.label}
                  </span>
                  <ChevronRight
                    className={`w-3 h-3 shrink-0 transition-transform ${
                      isOpen ? 'rotate-90 text-primary' : 'text-muted-foreground/40'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3 pb-2.5 space-y-2">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{s.body}</p>
                    <button
                      onClick={() => setLocation(s.path)}
                      className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                    >
                      {s.pathLabel}
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-md bg-muted/40 border border-border/60 p-2.5">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <strong>Prototype Mode —</strong> Salesforce, Agentforce, and GA4 connections planned Q3–Q4 2025.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Communications Hub — Knowledge Brief guide ────────────────────────────────
// Shown when user is on any /communications/* route with no item selected.

function CommsBriefGuide() {
  const [, setLocation] = useLocation();

  const PAGES = [
    { icon: MessageSquare, label: 'Providers',         path: '/communications/providers',         desc: 'Slack (community), Google Chat (client), Google Calendar (timing).' },
    { icon: MessageSquare, label: 'Channels & Spaces', path: '/communications/channels',          desc: 'Slack channels for learners/coaches/ops. Chat Spaces for clients.' },
    { icon: CalendarDays,  label: 'Calendar',          path: '/communications/calendar',          desc: 'Operational timing: cohort starts, UAT sessions, sprint reviews.' },
    { icon: Radio,         label: 'Penny Broadcasts',  path: '/communications/penny-broadcasts',  desc: 'Calendar-aware learner nudges, Trail Wins, Trail Quests, celebrations.' },
    { icon: CalendarDays,  label: 'Weekly Briefs',     path: '/communications/weekly-briefs',     desc: 'Executive and coach digests — Slack + Google Chat, Calendar-triggered.' },
    { icon: Bell,          label: 'Notifications',     path: '/communications/notifications',     desc: 'Audience + timing rules: Slack, Google Chat, and Calendar combined.' },
    { icon: FileText,      label: 'Templates',         path: '/communications/message-templates', desc: 'Reusable templates for Slack, Google Chat, and Calendar reminders.' },
  ];

  const MODEL = [
    { role: 'what',  label: 'Knowledge Library', color: 'text-secondary' },
    { role: 'work',  label: 'Salesforce / Demand', color: 'text-amber-700' },
    { role: 'who',   label: 'Communications', color: 'text-primary' },
    { role: 'when',  label: 'Calendar', color: 'text-emerald-700' },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
            Communications & Collaboration
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Trail OS and Penny's messaging and timing layer. Select any item on the page to open its brief here.
          </p>
        </div>

        {/* Operating model */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">The Operating Model</p>
          <div className="space-y-1">
            {MODEL.map(m => (
              <div key={m.role} className="flex items-baseline gap-1.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider w-8 shrink-0 ${m.color}`}>{m.role}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {PAGES.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.path}
                onClick={() => setLocation(p.path)}
                className="w-full flex items-start gap-2 rounded-md px-2.5 py-2 hover:bg-muted/50 transition-colors text-left group"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-md bg-muted/40 border border-border/60 p-2.5">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <strong>Prototype mode —</strong> No live connections. Slack adapter planned Q3 2025. Google Chat and Calendar to follow.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Trail OS Capability Map — Knowledge Brief guide ───────────────────────────
// Shown when the user lands on /navigator/trail-os-map with no card selected.
// Replaces the removed Overview tab: definitions + architecture live here.

function TrailOSCapabilityGuide() {
  const [, setLocation] = useLocation();

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
            Trail OS Capability Map
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select any capability card to open its brief here.
          </p>
        </div>

        {/* Trail OS definition */}
        <div className="rounded-lg border border-border/60 bg-white/70 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-[11px] font-bold text-foreground">Trail OS</p>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 ml-1">Infrastructure Layer</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            The operational technology foundation coordinating intake, project delivery, documentation, learner-client matching, org readiness, coach visibility, and outcomes measurement across all programs.
          </p>
        </div>

        {/* Penny AI definition */}
        <div className="rounded-lg border border-border/60 bg-white/70 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0" />
            <p className="text-[11px] font-bold text-foreground">Penny AI</p>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 ml-1">Intelligence Layer</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            The AI learning and guidance layer embedded across all programs, providing personalised coaching, skill translation, and learning intelligence at every stage of the learner journey.
          </p>
        </div>

        {/* Architecture flow */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Ecosystem Architecture</p>
          <div className="flex items-center gap-1.5 text-[10px] font-medium flex-wrap">
            <span className="flex items-center gap-1 text-primary"><Database className="w-3 h-3" />Trail OS</span>
            <span className="text-muted-foreground/40 italic text-[9px]">powers</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
            <span className="flex items-center gap-1 text-secondary"><Sparkles className="w-3 h-3" />Penny AI</span>
            <span className="text-muted-foreground/40 italic text-[9px]">guides</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
            <span className="flex items-center gap-1 text-foreground/70"><Layers className="w-3 h-3" />Programs</span>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-1.5">
          <button
            onClick={() => setLocation('/navigator/knowledge-relationships')}
            className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline w-full text-left"
          >
            View full Knowledge Relationships map
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

      </div>
    </ScrollArea>
  );
}
