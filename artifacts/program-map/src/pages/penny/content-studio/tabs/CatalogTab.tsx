// ─────────────────────────────────────────────────────────────────────────────
// Catalog tab — Content Studio
// Read-only commerce view: Product2, Product_Content__c, Asset.
// Never configures the storefront, sets a price, or activates an order.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  CircleSlash,
  ChevronRight,
  ChevronDown,
  Lock,
  ExternalLink,
  Check,
  Package,
  ShoppingCart,
  Zap,
  Truck,
} from 'lucide-react';
import { MOCK_PRODUCT_TREE, MOCK_PRODUCT_CONTENT_ROWS } from '../mockData';
import type { ProductNode } from '../types';

// ── Product tree ──────────────────────────────────────────────────────────────

function kindLabel(kind: ProductNode['kind']): string {
  switch (kind) {
    case 'collection': return 'Collection';
    case 'bundle': return 'Bundle';
    case 'variation': return 'Variation';
    case 'standalone': return 'Product';
  }
}

function kindColor(kind: ProductNode['kind']): string {
  switch (kind) {
    case 'collection': return 'text-[#2F6F7E]';
    case 'bundle': return 'text-[#CC8400]';
    case 'variation': return 'text-[#2F6B3F]';
    case 'standalone': return 'text-[#4B5563]';
  }
}

interface TreeNodeProps {
  node: ProductNode;
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
}

function TreeNode({ node, depth, selectedId, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!(node.children && node.children.length > 0);
  const isSelected = node.id === selectedId;

  return (
    <div>
      <div
        className={[
          'flex items-center gap-1.5 cursor-pointer rounded-md px-2 py-1.5 text-[13px] transition-colors',
          isSelected
            ? 'bg-[#E6F0EA] text-[#2F6B3F] font-semibold'
            : 'text-foreground hover:bg-[#F6F8F5]',
        ].join(' ')}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* expand / leaf arrow */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex-shrink-0"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

        {/* node name */}
        <span className="truncate flex-1">{node.name}</span>

        {/* kind badge */}
        <span className={`text-[10px] font-medium flex-shrink-0 ${kindColor(node.kind)}`}>
          {kindLabel(node.kind)}
        </span>
      </div>

      {/* children */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Find a node by id in the tree ─────────────────────────────────────────────

function findNode(tree: ProductNode, id: string): ProductNode | null {
  if (tree.id === id) return tree;
  if (!tree.children) return null;
  for (const child of tree.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#F0F1EF] last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
        {icon}
        {value}
      </span>
    </div>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ label, variant }: { label: string; variant?: 'danger' | 'default' }) {
  return (
    <span
      className={[
        'inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border',
        variant === 'danger'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-[#F0F1EF] text-[#687069] border-[#E2E4E1]',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

// ── Variation detail pane ─────────────────────────────────────────────────────

function VariationDetailPane({ node }: { node: ProductNode }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2
          className="text-[16px] font-semibold text-foreground"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {node.name}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Pill label="Class · Digital" />
          {node.sku && <Pill label={`SKU · ${node.sku}`} />}
          <Pill label="Product class · Digital" />
          <Pill label="Inactive" variant="danger" />
        </div>
      </div>

      {/* Field rows */}
      <div className="bg-white rounded-lg border border-[#E2E4E1] px-4 divide-y divide-[#F0F1EF]">
        <FieldRow label="Assetizable" value="Yes" />
        <FieldRow label="Shipping charge" value="Digital — no charge" />
        <FieldRow label="Selling model" value="One-time" />
        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-[11px] text-muted-foreground">Price</span>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
            <Lock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground italic text-[12px]">On the price book entry</span>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <a
          href="#"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#7FAFC6] text-[#2F6F7E] text-[12px] font-medium hover:bg-[#EDF5F8] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Salesforce
        </a>
        <p className="text-[11px] text-muted-foreground">
          Activation and pricing sit with the Commerce permission set holder.
        </p>
      </div>

      {/* Junction table */}
      <ProductContentSection />

      {/* Order activation */}
      <OrderActivationCard />
    </div>
  );
}

// ── Bundle detail pane ────────────────────────────────────────────────────────

function BundleDetailPane({ node }: { node: ProductNode }) {
  const components = node.children ?? [];
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2
          className="text-[16px] font-semibold text-foreground"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {node.name}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Pill label="Bundle" />
          <Pill label="Digital" />
        </div>
      </div>

      {/* Components table */}
      <div>
        <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Components
        </h3>
        <div className="bg-white rounded-lg border border-[#E2E4E1] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F6F8F5]">
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground">Name</th>
                <th className="text-center px-3 py-2 text-[11px] font-semibold text-muted-foreground">Qty</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1EF]">
              {components.slice(0, 3).map((c, i) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-foreground">{c.name}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {i === 0 ? 'Core material' : i === 1 ? 'Supplemental' : 'Reference'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bundle rule card */}
      <div className="bg-[#EDF5F8] border border-[#7FAFC6] rounded-lg px-4 py-3 space-y-1">
        <p className="text-[12px] font-semibold text-[#2F6F7E]">Bundle pricing rule</p>
        <p className="text-[12px] text-[#2F6F7E] leading-relaxed">
          Bundle price is set on the bundle product, not calculated from components. A bundle is a
          decision about value, and the saving should be describable in one sentence.
        </p>
      </div>

      {/* Still show junction + activation */}
      <ProductContentSection />
      <OrderActivationCard />
    </div>
  );
}

// ── Collection / standalone detail pane ──────────────────────────────────────

function GenericDetailPane({ node }: { node: ProductNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-[16px] font-semibold text-foreground"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {node.name}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Pill label={kindLabel(node.kind)} />
          {node.sku && <Pill label={`SKU · ${node.sku}`} />}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#E2E4E1] px-4 divide-y divide-[#F0F1EF]">
        <FieldRow label="Assetizable" value="Yes" />
        <FieldRow label="Shipping charge" value="Digital — no charge" />
        <FieldRow label="Selling model" value="One-time" />
        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-[11px] text-muted-foreground">Price</span>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
            <Lock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground italic text-[12px]">On the price book entry</span>
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <a
          href="#"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#7FAFC6] text-[#2F6F7E] text-[12px] font-medium hover:bg-[#EDF5F8] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Salesforce
        </a>
        <p className="text-[11px] text-muted-foreground">
          Activation and pricing sit with the Commerce permission set holder.
        </p>
      </div>
      <ProductContentSection />
      <OrderActivationCard />
    </div>
  );
}

// ── Product Content junction table ────────────────────────────────────────────

function ProductContentSection() {
  return (
    <div>
      <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Product Content · junction table
      </h3>
      <div className="bg-white rounded-lg border border-[#E2E4E1] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F6F8F5]">
            <tr>
              <th className="text-center px-3 py-2 text-[11px] font-semibold text-muted-foreground w-10">Seq</th>
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground">Content Item</th>
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground">Role</th>
              <th className="text-center px-3 py-2 text-[11px] font-semibold text-muted-foreground w-20">Included</th>
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground">Also in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F1EF]">
            {MOCK_PRODUCT_CONTENT_ROWS.map((row) => (
              <tr key={row.seq}>
                <td className="px-3 py-2 text-center text-muted-foreground">{row.seq}</td>
                <td className="px-3 py-2 text-foreground">{row.contentItem}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.role}</td>
                <td className="px-3 py-2 text-center">
                  {row.included ? (
                    <Check className="w-4 h-4 text-[#2F6B3F] mx-auto" />
                  ) : (
                    <CircleSlash className="w-4 h-4 text-muted-foreground mx-auto" />
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-[12px]">{row.alsoIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        The glossary is one item in four kits — corrected once and corrected everywhere.
        This junction table is the single source of truth for what a product delivers.
      </p>
    </div>
  );
}

// ── Order activation flow ─────────────────────────────────────────────────────

const ACTIVATION_STEPS = [
  {
    icon: ShoppingCart,
    label: 'Order',
    desc: 'Buyer places an order through Commerce checkout.',
  },
  {
    icon: Zap,
    label: 'Activated',
    desc: 'A person or a Flow — never an agent.',
    amber: true,
  },
  {
    icon: Package,
    label: 'Asset',
    desc: 'Asset record created and linked to the Account.',
  },
  {
    icon: Truck,
    label: 'Delivery',
    desc: 'File or access granted. No expiry by default.',
  },
];

function OrderActivationCard() {
  return (
    <div>
      <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        On order activation
      </h3>
      <div className="bg-white rounded-lg border border-[#E2E4E1] p-4">
        <div className="grid grid-cols-4 gap-2">
          {ACTIVATION_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="flex flex-col items-center text-center gap-2 border border-[#E2E4E1] rounded-lg px-2 py-3"
              >
                <Icon className="w-5 h-5 text-[#2F6F7E]" />
                <p className="text-[12px] font-semibold text-foreground">{step.label}</p>
                <p
                  className={[
                    'text-[11px] leading-snug',
                    step.amber ? 'text-amber-700 font-medium' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          No DRM, no watermarking, no per-user file locking.
        </p>
      </div>
    </div>
  );
}

// ── Detail pane switcher ──────────────────────────────────────────────────────

function DetailPane({ node }: { node: ProductNode }) {
  if (node.kind === 'variation') return <VariationDetailPane node={node} />;
  if (node.kind === 'bundle') return <BundleDetailPane node={node} />;
  return <GenericDetailPane node={node} />;
}

// ── Default selection: first variation node ───────────────────────────────────

function findFirstVariation(tree: ProductNode): ProductNode | null {
  if (tree.kind === 'variation') return tree;
  if (!tree.children) return null;
  for (const child of tree.children) {
    const found = findFirstVariation(child);
    if (found) return found;
  }
  return null;
}

// ── Root component ────────────────────────────────────────────────────────────

export function CatalogTab() {
  const defaultNode = findFirstVariation(MOCK_PRODUCT_TREE) ?? MOCK_PRODUCT_TREE;
  const [selectedId, setSelectedId] = useState(defaultNode.id);

  const selectedNode = findNode(MOCK_PRODUCT_TREE, selectedId) ?? defaultNode;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Boundary strip */}
      <div className="flex items-start gap-3 mx-4 mt-4 px-4 py-3 rounded-lg bg-[#EDF5F8] border-l-4 border-[#7FAFC6]">
        <CircleSlash className="w-4 h-4 text-[#2F6F7E] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-[#2F6F7E] leading-relaxed">
          <span className="font-semibold">Commerce boundary</span> · The Commerce build is Hugh's.
          The studio reads Product2, Product_Content__c and Asset. It never configures the
          storefront, sets a price, or activates an order.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[240px_1fr] items-start gap-4 p-4">
        {/* Left — Product2 tree */}
        <div className="bg-white rounded-[14px] border border-[#E2E4E1] p-3 sticky top-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Product2
          </p>
          <TreeNode
            node={MOCK_PRODUCT_TREE}
            depth={0}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right — Detail pane */}
        <div>
          <DetailPane node={selectedNode} />
        </div>
      </div>
    </div>
  );
}
