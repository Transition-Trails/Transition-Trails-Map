import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  sfMappings, SF_STATUS_CONFIG, SF_PRODUCT_CONFIG,
  type SfMappingStatus, type SfProduct, type TrailOsSfMapping,
} from '@/data/salesforceArchitectureData';
import { Database, ArrowRight, Layers, ExternalLink } from 'lucide-react';

const TRAIL_OS_GROUPS = [
  'Program Structure', 'Learning Assets', 'Penny Assets',
  'Delivery Assets', 'Demand Management', 'Content Repository',
];
const ALL_PRODUCTS = Object.keys(SF_PRODUCT_CONFIG) as SfProduct[];
const ALL_STATUSES = Object.keys(SF_STATUS_CONFIG) as SfMappingStatus[];

type ViewMode = 'visual' | 'table' | 'by-product';

export default function SalesforceMapping() {
  const { setSelectedItem } = useAppContext();
  const [view, setView]               = useState<ViewMode>('visual');
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
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Compact admin header ── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 pt-3 pb-2.5 border-b bg-card">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-0.5">Administration · Integrations</p>
          <h1 className="text-[15px] font-semibold text-foreground leading-snug">Salesforce Architecture</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">
            Object-level mapping between Trail OS, Salesforce (NPSP · PMM · Nonprofit Cloud), and Google Drive.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="flex items-center gap-1 text-[14px] font-semibold bg-[#EDF5F8] border border-[#7FAFC6] text-[#2F6F7E] px-2 py-1 rounded-full whitespace-nowrap">
            <Database className="w-3 h-3" />Salesforce
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
          <span className="flex items-center gap-1 text-[14px] font-semibold bg-primary/5 border border-primary/20 text-primary px-2 py-1 rounded-full whitespace-nowrap">
            <Layers className="w-3 h-3" />Trail OS
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
          <span className="flex items-center gap-1 text-[14px] font-semibold bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F] px-2 py-1 rounded-full whitespace-nowrap">
            <ExternalLink className="w-3 h-3" />Drive
          </span>
        </div>
      </div>

      {/* ── Filter + view controls bar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2 border-b bg-card/60 overflow-x-auto">
        {/* Status filter pills */}
        {ALL_STATUSES.map(s => {
          const cfg   = SF_STATUS_CONFIG[s];
          const count = sfMappings.filter(m => m.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[14px] font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                statusFilter === s ? 'ring-1 ring-foreground/20 shadow-sm' : ''
              } ${cfg.cls}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {count} {cfg.label}
            </button>
          );
        })}

        <div className="flex-1 min-w-2" />

        {/* View mode */}
        {(['visual', 'table', 'by-product'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-[14px] font-semibold rounded-full px-3 py-1 border transition-colors flex-shrink-0 ${
              view === v
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/30'
            }`}
          >
            {v === 'visual' ? 'Visual Map' : v === 'table' ? 'Table' : 'By Product'}
          </button>
        ))}

        {/* Product filter */}
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value as SfProduct | 'all')}
          className="text-[14px] border border-border rounded-full px-2.5 py-1 bg-white text-muted-foreground flex-shrink-0"
        >
          <option value="all">All Products</option>
          {ALL_PRODUCTS.map(p => <option key={p} value={p}>{SF_PRODUCT_CONFIG[p].label}</option>)}
        </select>
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl space-y-5">

          {/* ── Visual Map — 2-col compact cards ── */}
          {view === 'visual' && (
            <div className="space-y-5">
              {TRAIL_OS_GROUPS.map(group => {
                const groupMappings = filtered.filter(m => m.trailOsGroup === group);
                if (groupMappings.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-[14px] font-bold  text-muted-foreground/50 mb-2">{group}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {groupMappings.map(mapping => {
                        const statusCfg  = SF_STATUS_CONFIG[mapping.status];
                        const productCfg = SF_PRODUCT_CONFIG[mapping.sfProduct];
                        return (
                          <button
                            key={mapping.id}
                            onClick={() => handleSelect(mapping)}
                            className="rounded-lg border border-border bg-white p-3 text-left hover:shadow-sm hover:border-primary/30 transition-all group"
                          >
                            {/* Trail OS object row */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                                <p className="text-[14px] font-bold text-foreground leading-tight truncate">{mapping.trailOsObject}</p>
                              </div>
                              <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap ${statusCfg.cls}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                            {/* SF object row */}
                            <div className="flex items-center gap-1.5 pl-3">
                              <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold text-foreground truncate">{mapping.sfLabel}</p>
                                <p className="text-[14px] text-muted-foreground font-mono truncate">{mapping.sfApiName}</p>
                              </div>
                              <span className={`text-[14px] font-semibold border rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap ${productCfg.cls}`}>
                                {productCfg.label}
                              </span>
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
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-[14px]">Trail OS Object</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-[14px]">SF Object</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-[14px]">Product</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-[14px]">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-[14px]">Relationship</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(mapping => {
                    const statusCfg  = SF_STATUS_CONFIG[mapping.status];
                    const productCfg = SF_PRODUCT_CONFIG[mapping.sfProduct];
                    return (
                      <tr
                        key={mapping.id}
                        className="hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => handleSelect(mapping)}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-foreground">{mapping.trailOsObject}</p>
                          <p className="text-[14px] text-muted-foreground">{mapping.trailOsGroup}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{mapping.sfLabel}</p>
                          <p className="text-[14px] text-muted-foreground font-mono">{mapping.sfApiName}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${productCfg.cls}`}>{productCfg.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[14px] text-muted-foreground capitalize">{mapping.relationshipType}</span>
                        </td>
                        <td className="px-3 py-2.5">
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
                      <span className={`text-[14px] font-bold border rounded-full px-2.5 py-1 ${productCfg.cls}`}>{productCfg.label}</span>
                      <p className="text-[14px] text-muted-foreground">{productCfg.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {productMappings.map(mapping => {
                        const statusCfg = SF_STATUS_CONFIG[mapping.status];
                        return (
                          <button
                            key={mapping.id}
                            onClick={() => handleSelect(mapping)}
                            className="rounded-lg border border-border bg-white p-3 text-left hover:shadow-sm hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-[14px] font-bold text-foreground leading-tight">{mapping.sfLabel}</p>
                              <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 flex-shrink-0 ${statusCfg.cls}`}>{statusCfg.label}</span>
                            </div>
                            <p className="text-[14px] text-muted-foreground font-mono mb-1">{mapping.sfApiName}</p>
                            <p className="text-[14px] text-muted-foreground">← Trail OS: <strong>{mapping.trailOsObject}</strong></p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Foundations Trail example — compact ── */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-primary border border-primary/20 bg-white rounded-full px-2 py-0.5 flex-shrink-0">
                ★ Foundations Trail Example
              </span>
              {sfMappings.filter(m => m.foundationsTrailExample).slice(0, 5).map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="text-[14px] font-medium border border-primary/20 bg-white text-primary rounded-full px-2.5 py-0.5 hover:bg-primary/10 transition-colors"
                >
                  {m.trailOsObject} →
                </button>
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
