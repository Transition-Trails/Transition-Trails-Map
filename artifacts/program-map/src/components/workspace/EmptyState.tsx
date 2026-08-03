import { type ComponentType } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
  secondaryAction,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-8'} ${className}`}>
      <div className={`rounded-full bg-muted flex items-center justify-center mb-3 flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}>
        <Icon className={`text-muted-foreground/40 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
      </div>
      <p className={`font-semibold text-foreground mb-1 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {body && (
        <p className={`text-muted-foreground leading-relaxed max-w-xs ${compact ? 'text-sm' : 'text-sm'}`}>{body}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-4">
          {action && (
            <button
              onClick={action.onClick}
              className={`font-semibold text-primary hover:underline ${compact ? 'text-sm' : 'text-sm'}`}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={`font-medium text-muted-foreground hover:text-foreground hover:underline ${compact ? 'text-sm' : 'text-sm'}`}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
