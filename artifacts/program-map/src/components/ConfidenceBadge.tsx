import { Badge } from '@/components/ui/badge';

export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

const confidenceConfig: Record<ConfidenceStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary border-primary/20' },
  'needs-review': { label: 'Needs Review', className: 'bg-accent/20 text-amber-800 border-accent/30' },
  draft: { label: 'Draft', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  deprecated: { label: 'Deprecated', className: 'bg-muted text-muted-foreground border-border' }
};

export function ConfidenceBadge({ status }: { status: ConfidenceStatus }) {
  const config = confidenceConfig[status] || confidenceConfig['needs-review'];
  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold ${config.className}`}>
      {config.label}
    </Badge>
  );
}
