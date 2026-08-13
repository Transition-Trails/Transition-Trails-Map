/**
 * SortableCard
 *
 * Wraps a Homebase card with:
 *   - Drag-to-reorder via @dnd-kit/sortable (GripVertical handle, hover-revealed)
 *   - Collapse/expand toggle (ChevronDown handle, hover-revealed)
 *
 * When collapsed the card body is replaced by a compact strip that still shows
 * the card icon, title, and an expand button — preserving grid column space.
 *
 * Drag handle and collapse button appear together in the top-right corner on
 * hover. Touch/keyboard users can activate via the focusable buttons.
 */

import { type LucideIcon, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS }         from "@dnd-kit/utilities";

interface SortableCardProps {
  id:               string;
  title:            string;
  icon:             LucideIcon;
  isCollapsed:      boolean;
  onToggleCollapse: () => void;
  children:         React.ReactNode;
}

export function SortableCard({
  id,
  title,
  icon: Icon,
  isCollapsed,
  onToggleCollapse,
  children,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.45 : 1,
    zIndex:     isDragging ? 20 : undefined,
    position:   "relative",
  };

  /* ── Collapsed strip ──────────────────────────────────────────────────────── */
  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border border-border bg-white flex items-center gap-2 px-3 h-10 min-w-0 select-none"
      >
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder"
          className="flex-shrink-0 p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Icon + title */}
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[12px] font-medium text-foreground truncate flex-1">
          {title}
        </span>

        {/* Expand button */}
        <button
          onClick={onToggleCollapse}
          aria-label={`Expand ${title}`}
          className="flex-shrink-0 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  /* ── Expanded card ────────────────────────────────────────────────────────── */
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/card relative min-w-0"
    >
      {/* Hover controls: collapse + drag handle */}
      <div
        className="absolute top-2 right-2 z-20 flex items-center gap-0.5
                   opacity-0 group-hover/card:opacity-100
                   transition-opacity duration-150 pointer-events-none
                   group-hover/card:pointer-events-auto"
      >
        <button
          onClick={onToggleCollapse}
          aria-label={`Collapse ${title}`}
          title="Collapse"
          className="flex items-center justify-center w-6 h-6 rounded bg-white/90 border border-border/60
                     text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/60
                     shadow-sm transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <button
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="flex items-center justify-center w-6 h-6 rounded bg-white/90 border border-border/60
                     text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/60
                     shadow-sm transition-colors cursor-grab active:cursor-grabbing touch-none
                     focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {children}
    </div>
  );
}
