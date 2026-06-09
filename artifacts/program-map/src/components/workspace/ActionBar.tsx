import { type ComponentType } from 'react';
import { useLocation } from 'wouter';

export interface ActionItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  disabledReason?: string;
}

interface ActionBarProps {
  actions: ActionItem[];
  note?: string;
  className?: string;
}

export function ActionBar({ actions, note, className = '' }: ActionBarProps) {
  const [, setLocation] = useLocation();

  function handleClick(action: ActionItem) {
    if (action.disabled) return;
    if (action.href) setLocation(action.href);
    else action.onClick?.();
  }

  return (
    <div className={`flex items-center gap-1.5 px-4 py-2 border-b bg-muted/20 flex-wrap ${className}`}>
      {actions.map(action => {
        const Icon = action.icon;
        const isPrimary  = action.variant === 'primary';
        const isDisabled = action.disabled === true;

        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            disabled={isDisabled}
            title={isDisabled ? (action.disabledReason ?? 'Not available') : action.label}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors
              ${isPrimary
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-card'
              }
              ${isDisabled ? 'opacity-40 pointer-events-none' : ''}
            `}
          >
            {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
            {action.label}
          </button>
        );
      })}
      {note && (
        <span className="ml-auto text-[10px] text-muted-foreground/60 italic">{note}</span>
      )}
    </div>
  );
}
