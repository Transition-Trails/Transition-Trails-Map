import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { Layers, Calendar, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

export function ContextPanel() {
  const { selectedItem, setSelectedItem, trailOsCapabilities, pennyCapabilities } = useAppContext();
  const [location, setLocation] = useLocation();

  const handleChipClick = (type: string, id: string, route?: string) => {
    if (route) {
      setLocation(route);
    }
  };

  const renderContent = () => {
    if (!selectedItem) {
      if (location === '/') return <HomeWelcomeGuide />;
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-sm">Select any item to open its knowledge brief.</p>
        </div>
      );
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

  return (
    <div className="w-[300px] h-full bg-card border-l border-border flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10 flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">
          {!selectedItem && location === '/' ? 'How to Use Trail OS' : 'Knowledge Brief'}
        </h3>
      </div>
      <div className="flex-1 relative overflow-hidden bg-white/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedItem ? `${selectedItem.type}-${selectedItem.id}` : `empty-${location}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Home welcome guide rendered in the Knowledge Brief on the home route ──────
const WELCOME_TABS = ['Overview', 'Navigator', 'Operations', 'Demand', 'Penny', 'Library', 'Admin'] as const;
type WelcomeTab = typeof WELCOME_TABS[number];

const WELCOME_CONTENT: Record<WelcomeTab, { title: string; body: string; path?: string; pathLabel?: string }> = {
  Overview: {
    title: 'Welcome to Trail OS',
    body: "Trail OS is Transition Trails' unified operating platform. Use the left navigation to move between sections. Use this page to get a snapshot of what's happening, what needs attention, and where to go next.",
  },
  Navigator: {
    title: 'Navigator',
    body: "The ecosystem map for Transition Trails programs. Program Map shows how Explorer's Trail, Foundations Trail, Guided Trail, Trail of Mastery, and Digital Compass connect. RESOLVE shows the delivery lifecycle. Trail OS Capability Map links Penny AI and capabilities to programs.",
    path: '/navigator/program-map',
    pathLabel: 'Open Program Map',
  },
  Operations: {
    title: 'Operations Center',
    body: 'Real-time health for programs, Salesforce, automation, Penny, and the website. Use Program Health to monitor cohort status and capacity. Salesforce Health shows integration and sync status.',
    path: '/operations/program-health',
    pathLabel: 'Open Program Health',
  },
  Demand: {
    title: 'Demand Management',
    body: 'Where new program requests, change requests, and delivery work lives. Start with Intake to create a new request, or review Salesforce Cases for active items. Epics, Features, and Stories organize the delivery backlog.',
    path: '/demand/intake',
    pathLabel: 'Open Intake',
  },
  Penny: {
    title: 'Penny Command Center',
    body: 'Penny is the AI coaching and operations layer. Use Learners for cohort learner data, Logs for session history, Trail Quests for guided learning flows, and Test Penny to run prototype interactions.',
    path: '/penny/test-penny',
    pathLabel: 'Open Penny Test',
  },
  Library: {
    title: 'Knowledge Library',
    body: 'The source of truth for Transition Trails documentation. Documents holds all source blueprints and reference materials. Source Mapping tracks how each document connects to programs, phases, and Penny capabilities.',
    path: '/library/documents',
    pathLabel: 'Open Documents',
  },
  Admin: {
    title: 'Administration',
    body: 'Configure programs, RESOLVE phases, Trail OS capabilities, Penny settings, communication channels, templates, users, and permissions. Changes here affect the entire platform.',
    path: '/admin',
    pathLabel: 'Open Admin',
  },
};

function HomeWelcomeGuide() {
  const [activeTab, setActiveTab] = useState<WelcomeTab>('Overview');
  const [, setLocation] = useLocation();
  const c = WELCOME_CONTENT[activeTab];

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">

        <div>
          <Badge variant="outline" className="bg-white uppercase tracking-wider text-[10px] mb-2">
            How to use Trail OS
          </Badge>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Mission Control
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Select a section below to learn where things live, or click any item on the Home page to open its brief here.
          </p>
        </div>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-1">
          {WELCOME_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
          {c.path && (
            <button
              onClick={() => setLocation(c.path!)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {c.pathLabel}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Prototype mode note */}
        <div className="rounded-md bg-muted/40 border border-border p-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <strong>Prototype Mode —</strong> Data throughout Trail OS is representative. Salesforce, Agentforce, and GA4 connections are planned for Q3–Q4 2025.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}
