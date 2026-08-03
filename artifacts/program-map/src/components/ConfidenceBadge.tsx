import { Badge } from '@/components/ui/badge';
import { STATUS_CLASSES } from '@/config/statusColors';

export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

const CONFIDENCE_CLASSES: Record<ConfidenceStatus, string> = {
  confirmed:      STATUS_CLASSES.success.badge,
  'needs-review': STATUS_CLASSES.attention.badge,
  draft:          STATUS_CLASSES.information.badge,
  deprecated:     STATUS_CLASSES.neutral.badge,
};

const CONFIDENCE_LABELS: Record<ConfidenceStatus, string> = {
  confirmed:      'Confirmed',
  'needs-review': 'Needs Review',
  draft:          'Draft',
  deprecated:     'Deprecated',
};

export function ConfidenceBadge({ status }: { status: ConfidenceStatus }) {
  const cls   = CONFIDENCE_CLASSES[status] ?? CONFIDENCE_CLASSES['needs-review'];
  const label = CONFIDENCE_LABELS[status] ?? status;
  return (
    <Badge variant="outline" className={`text-[14px]  font-semibold ${cls}`}>
      {label}
    </Badge>
  );
}
