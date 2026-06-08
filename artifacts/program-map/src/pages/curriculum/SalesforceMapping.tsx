import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  sfMappings, SF_STATUS_CONFIG, SF_PRODUCT_CONFIG, SF_MAPPING_SUMMARY,
  type SfMappingStatus, type SfProduct, type TrailOsSfMapping,
} from '@/data/salesforceArchitectureData';
import { Database, ArrowRight, CheckCircle2, AlertTriangle, Layers, Link2, ExternalLink, Info } from 'lucide-react';

const TRAIL_OS_GROUPS = ['Program Structure', 'Learning Assets', 'Penny Assets', 'Delivery Assets', 'Demand Management', 'Content Repository'];
const ALL_PRODUCTS = Object.keys(SF_PRODUCT_CONFIG) as SfProduct[];
const ALL_STATUSES = Object.keys(SF_STATUS_CONFIG) as SfMappingStatus[];

type ViewMode = 'visual' | 'table' | 'by-product';

export default function SalesforceMapping() {
  const { setSelectedItem } = useAppContext();
  const [view, setView] = useState<ViewMode>('visual');
  const [statusFilter, setStatusFilter] = useState<SfMappingStatus | 'all'>('all');
  const [productFilter, setProductFilter] = useState<SfProduct | 'all'>('all');

  const filtered = sfMappings.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (productFilter !== 'all' && m.sfProduct !== productFilter) return false;
    return true;
  });

  function handleSelect(mapping: TrailOsSfMapping) {
    setSelectedItem({ type: 'sfMapping' as any, id: mapping.id, data: mapping });
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-6xl space-y-5">

        {/* Header */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Salesforce Architecture</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Salesforce Architecture Mapping</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-3xl">
            How every Trail OS object maps to your existing Salesforce architecture — NPSP, Nonprofit Cloud, PMM, Volunteer Management,
            Salesforce Knowledge, and your existing Assessment and LMS objects.
          </p>
        </div>

        {/* System of Record callout */}
        <div className="rounded-xl border border-border bg-slate-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-[13px] font-bold text-foreground">Salesforce</p>
              </div>
              <p className="text-[11px] text-muted-foreground">System of Record</p>
              <p className="text-[10px] text-blue-700 font-medium">Source of truth for all data</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <p className="text-[13px] font-bold text-foreground">Trail OS</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Operating Layer</p>
              <p className="text-[10px] text-primary font-medium">Visualization + team workspace</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4 text-green-600" />
                <p className="text-[13px] font-bold text-foreground">Google Drive</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Content Repository</p>
              <p className="text-[10px] text-green-700 font-medium">Admin-configured per program</p>
            </div>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_STATUSES.map(s => {
            const cfg = SF_STATUS_CONFIG[s];
            const count = sfMappings.filter(m => m.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${statusFilter === s ? 'border-foreground/30 shadow-sm' : 'border-border'} ${cfg.cls}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <p className="text-3xl font-bold">{count}</p>
                </div>
                <p className="text-[11px] font-semibold">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['visual', 'table', 'by-product'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors capitalize ${view === v ? 'bg-secondary text-white border-secondary' : 'border-border text-muted-foreground hover:border-secondary/40'}`}>
              {v === 'visual' ? 'Visual Map' : v === 'table' ? 'Mapping Table' : 'By SF Product'}
            </button>
          ))}
          <div className="flex-1" />
          <select
            value={productFilter}
            onChange={e => setProductFilter(e.target.value as SfProduct | 'all')}
            className="text-[11px] border border-border rounded-full px-3 py-1.5 bg-white text-muted-foreground"
          >
            <option value="all">All Products</option>
            {ALL_PRODUCTS.map(p => <option key={p} value={p}>{SF_PRODUCT_CONFIG[p].label}</option>)}
          </select>
        </div>

        {/* ── Visual Map ── */}
        {view === 'visual' && (
          <div className="space-y-4">
            {TRAIL_OS_GROUPS.map(group => {
              const groupMappings = filtered.filter(m => m.trailOsGroup === group);
              if (groupMappings.length === 0) return null;
              return (
                <div key={group}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">{group}</p>
                  <div className="space-y-2">
                    {groupMappings.map(mapping => {
                      const statusCfg = SF_STATUS_CONFIG[mapping.status];
                      const productCfg = SF_PRODUCT_CONFIG[mapping.sfProduct];
                      return (
                        <button
                          key={mapping.id}
                          onClick={() => handleSelect(mapping)}
                          className="w-full rounded-xl border border-border bg-white p-3 text-left hover:shadow-sm hover:border-secondary/30 transition-all"
                        >
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                            {/* Trail OS side */}
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full bg-primary/20 shrink-0" />
                              <div>
                                <p className="text-[13px] font-bold text-foreground">{mapping.trailOsObject}</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{mapping.trailOsDescription.substring(0, 60)}…</p>
                              </div>
                            </div>

                            {/* Status connector */}
                            <div className="flex flex-col items-center gap-1">
                              <div className={`text-[9px] font-bold border rounded-full px-2 py-0.5 whitespace-nowrap ${statusCfg.cls}`}>
                                {statusCfg.label}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground/40">
                                <div className="w-6 h-px bg-current" />
                                <ArrowRight className="w-3 h-3" />
                              </div>
                            </div>

                            {/* Salesforce side */}
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <p className="text-[13px] font-bold text-foreground">{mapping.sfLabel}</p>
                                  <span className={`text-[9px] font-semibold border rounded-full px-1.5 py-0.5 ${productCfg.cls}`}>{productCfg.label}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-mono">{mapping.sfApiName}</p>
                              </div>
                              <div className="w-2 h-8 rounded-full bg-blue-200 shrink-0" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Mapping Table ── */}
        {view === 'table' && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px]">Trail OS Object</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px]">SF Object</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px]">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px]">Relationship</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(mapping => {
                  const statusCfg = SF_STATUS_CONFIG[mapping.status];
                  const productCfg = SF_PRODUCT_CONFIG[mapping.sfProduct];
                  return (
                    <tr key={mapping.id} className="hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => handleSelect(mapping)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{mapping.trailOsObject}</p>
                        <p className="text-[10px] text-muted-foreground">{mapping.trailOsGroup}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{mapping.sfLabel}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{mapping.sfApiName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${productCfg.cls}`}>{productCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-muted-foreground capitalize">{mapping.relationshipType}</span>
                      </td>
                      <td className="px-3 py-3">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── By Product ── */}
        {view === 'by-product' && (
          <div className="space-y-5">
            {ALL_PRODUCTS.map(product => {
              const productMappings = filtered.filter(m => m.sfProduct === product);
              if (productMappings.length === 0) return null;
              const productCfg = SF_PRODUCT_CONFIG[product];
              return (
                <div key={product}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] font-bold border rounded-full px-2.5 py-1 ${productCfg.cls}`}>{productCfg.label}</span>
                    <p className="text-[11px] text-muted-foreground">{productCfg.description}</p>
                  </div>
                  <div className="grid gap-2">
                    {productMappings.map(mapping => {
                      const statusCfg = SF_STATUS_CONFIG[mapping.status];
                      return (
                        <button key={mapping.id} onClick={() => handleSelect(mapping)}
                          className="rounded-xl border border-border bg-white p-3 text-left hover:shadow-sm hover:border-secondary/30 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[13px] font-bold text-foreground">{mapping.sfLabel}</p>
                                <span className="text-[9px] text-muted-foreground font-mono">{mapping.sfApiName}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mb-1">← Trail OS: <strong>{mapping.trailOsObject}</strong></p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{mapping.purpose}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Foundations Trail example */}
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-primary border border-primary/20 bg-white rounded-full px-2 py-0.5">★ Foundations Trail Example</span>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3">
            Foundations Trail is the canonical example of how a complete Trail OS program maps into Salesforce. Click any object to see the full example.
          </p>
          <div className="flex flex-wrap gap-2">
            {sfMappings.filter(m => m.foundationsTrailExample).slice(0, 6).map(m => (
              <button key={m.id} onClick={() => handleSelect(m)}
                className="text-[11px] font-medium border border-primary/20 bg-white text-primary rounded-full px-3 py-1 hover:bg-primary/10 transition-colors">
                {m.trailOsObject} →
              </button>
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
