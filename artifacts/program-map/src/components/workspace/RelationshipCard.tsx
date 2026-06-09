import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { type ComponentType } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';

export interface RelatedItem {
  id: string;
  label: string;
  status?: string;
  statusColor?: string;
  href?: string;
}

interface RelationshipCardProps {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  items: RelatedItem[];
  emptyMessage?: string;
  viewAllHref?: string;
  onViewAll?: () => void;
  defaultOpen?: boolean;
  className?: string;
}

export function RelationshipCard({
  title,
  icon: Icon,
  items,
  emptyMessage = 'None linked',
  viewAllHref,
  onViewAll,
  defaultOpen = true,
  className = '',
}: RelationshipCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [, setLocation] = useLocation();

  function handleViewAll() {
    if (viewAllHref) setLocation(viewAllHref);
    else onViewAll?.();
  }

  return (
    <div className={`rounded-lg border border-border bg-card overflow-hidden ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex-1">{title}</span>
        {items.length > 0 && (
          <span className="text-[10px] text-muted-foreground/50 tabular-nums mr-1">{items.length}</span>
        )}
        <ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="px-3 pb-3">
          {items.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/50 italic py-1">{emptyMessage}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => item.href && setLocation(item.href)}
                    className={item.href ? 'cursor-pointer hover:opacity-75 transition-opacity' : 'cursor-default'}
                  >
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-muted/40 font-normal py-0 h-5 gap-1 hover:bg-muted/70 transition-colors"
                    >
                      {item.statusColor && (
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.statusColor}`} />
                      )}
                      {item.label}
                    </Badge>
                  </button>
                ))}
              </div>
              {(viewAllHref || onViewAll) && (
                <button
                  onClick={handleViewAll}
                  className="text-[10px] text-primary font-semibold hover:underline"
                >
                  View all →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
