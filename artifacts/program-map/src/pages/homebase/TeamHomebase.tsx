/**
 * TeamHomebase
 *
 * Homebase landing for team@ staff members. They land here instead of the
 * admin app — Mission Control (the full admin app) is one click away via the
 * left drawer or the prominent card below.
 *
 * Cards are drag-to-reorder and individually collapsible. Both preferences
 * persist in localStorage via useHomebaseLayout.
 */

import { useState, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  MessageSquare,
  Activity,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Zap,
  Plus,
  Clock,
  ExternalLink,
  CheckSquare,
  FileText,
  Newspaper,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { HomebaseShell }      from "@/components/layout/HomebaseShell";
import { useTierFlags }       from "@/hooks/useTierFlags";
import { useAppContext }      from "@/context/AppContext";
import { useCollapsible }     from "@/hooks/useCollapsible";
import { useHomebaseLayout }  from "@/hooks/useHomebaseLayout";
import { SubmitCaseDrawer }   from "@/components/homebase/SubmitCaseDrawer";
import { SortableCard }       from "@/components/homebase/SortableCard";
import { TodayTasksCard }     from "@/components/homebase/TodayTasksCard";
import { TodayMeetingsCard }  from "@/components/homebase/TodayMeetingsCard";
import { ActiveTasksCard }    from "@/components/homebase/ActiveTasksCard";
import { MeetingNotesCard }   from "@/components/homebase/MeetingNotesCard";
import { CasesCard }          from "@/components/homebase/CasesCard";
import { MyTimeCard }         from "@/components/homebase/MyTimeCard";
import { WhatsNewCard }       from "@/components/homebase/WhatsNewCard";

// ── Card metadata (title + icon shown in collapsed strip / drag overlay) ───────
const CARD_META: Record<string, { title: string; icon: LucideIcon }> = {
  "today-tasks":    { title: "Today's Tasks",    icon: CheckSquare  },
  "today-meetings": { title: "Today's Meetings", icon: CalendarDays },
  "meeting-notes":  { title: "Meeting Notes",    icon: FileText     },
  "active-tasks":   { title: "Active Tasks",     icon: Activity     },
  "cases-card":     { title: "My Cases",         icon: BookOpen     },
  "my-time":        { title: "My Time",          icon: Clock        },
};

// ── Quick links ────────────────────────────────────────────────────────────────
interface TeamHomebaseProps {
  displayName: string;
  isStaff?: boolean;
}

const TEAM_QUICK_LINKS = [
  { label: "Programs",  href: "/program",                    icon: LayoutDashboard },
  { label: "People",    href: "/admin/people",               icon: Users           },
  { label: "Calendar",  href: "https://calendar.google.com", icon: CalendarDays, external: true },
  { label: "Slack",     href: "https://slack.com",           icon: MessageSquare, external: true },
];

const ADMIN_QUICK_LINKS = [
  { label: "Operations",   href: "/operations/demand",      icon: Activity    },
  { label: "Penny Studio", href: "/penny/prompts",          icon: Sparkles    },
  { label: "Readiness",    href: "/admin/phase1-readiness", icon: ShieldCheck },
  { label: "People",       href: "/admin/people",           icon: Users       },
];

const POWER_QUICK_LINKS = [
  { label: "Programs",   href: "/program",           icon: LayoutDashboard },
  { label: "Penny",      href: "/penny",             icon: Sparkles        },
  { label: "Knowledge",  href: "/knowledge",         icon: BookOpen        },
  { label: "Operations", href: "/operations/demand", icon: Activity        },
];

const EVERYDAY_QUICK_LINKS = [
  { label: "Programs",      href: "/program",       icon: LayoutDashboard },
  { label: "Knowledge",     href: "/knowledge",     icon: BookOpen        },
  { label: "Collaboration", href: "/collaboration", icon: MessageSquare   },
  { label: "Penny",         href: "/penny",         icon: Zap             },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function TeamHomebase({ displayName, isStaff = false }: TeamHomebaseProps) {
  const firstName = displayName.split(" ")[0] || "there";
  const { isAdminOrAbove, isPower, isEveryday } = useTierFlags();
  const { openLogTime, logTimeSavedAt }          = useAppContext();
  const [showSubmitCase, setShowSubmitCase]       = useState(false);

  // ── Card layout state (order + collapsed) ────────────────────────────────
  const { cardOrder, setCardOrder, collapsed, toggleCollapse } = useHomebaseLayout();

  // Separate collapse for the What's New section (not part of the sortable grid)
  const [whatsNewOpen, toggleWhatsNew] = useCollapsible("whats-new-section", true);

  // ── DnD sensors ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as string);
      const newIndex = cardOrder.indexOf(over.id  as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        setCardOrder(arrayMove(cardOrder, oldIndex, newIndex));
      }
    }
  }, [cardOrder, setCardOrder]);

  // ── Card elements (keyed so React reuses instances across re-renders) ─────
  function renderCard(id: string) {
    switch (id) {
      case "today-tasks":    return <TodayTasksCard />;
      case "today-meetings": return <TodayMeetingsCard />;
      case "meeting-notes":  return <MeetingNotesCard />;
      case "active-tasks":   return <ActiveTasksCard />;
      case "cases-card":     return <CasesCard />;
      case "my-time":        return <MyTimeCard refreshKey={logTimeSavedAt} />;
      default:               return null;
    }
  }

  // ── Quick links ───────────────────────────────────────────────────────────
  let quickLinks = TEAM_QUICK_LINKS;
  if (isStaff) {
    if (isAdminOrAbove)  quickLinks = ADMIN_QUICK_LINKS;
    else if (isPower)    quickLinks = POWER_QUICK_LINKS;
    else if (isEveryday) quickLinks = EVERYDAY_QUICK_LINKS;
  }

  return (
    <HomebaseShell audience="team" displayName={displayName}>
      <div className="px-4 py-6 lg:px-6 lg:py-8 space-y-5 min-w-0">

        {/* Greeting + action buttons */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Team Homebase
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Good to see you, {firstName}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your daily workspace.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              onClick={() => openLogTime()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-sm"
            >
              <Clock className="w-4 h-4 text-muted-foreground" />
              Log Time
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitCase(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Submit a Case
            </button>
          </div>
        </div>

        {/* Quick access chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickLinks.map(({ label, href, icon: Icon, external }) =>
            external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-sm text-foreground hover:border-primary/40 hover:bg-muted/50 transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {label}
                <ExternalLink className="w-3 h-3 text-muted-foreground/60 ml-0.5" />
              </a>
            ) : (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-sm text-foreground hover:border-primary/40 hover:bg-muted/50 transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {label}
              </Link>
            )
          )}
        </div>

        {/* ── Sortable card grid ─────────────────────────────────────────── */}
        <div className="space-y-3 min-w-0">
          {/* Section label */}
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Today
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-3 items-start min-w-0">
                {cardOrder.map(id => {
                  const meta = CARD_META[id];
                  if (!meta) return null;
                  return (
                    <SortableCard
                      key={id}
                      id={id}
                      title={meta.title}
                      icon={meta.icon}
                      isCollapsed={collapsed.has(id)}
                      onToggleCollapse={() => toggleCollapse(id)}
                    >
                      {renderCard(id)}
                    </SortableCard>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* ── What's New (pinned at bottom, collapsible but not sortable) ── */}
        <div className="space-y-2">
          {/* Collapsible section header */}
          <button
            type="button"
            onClick={toggleWhatsNew}
            className="flex items-center gap-1.5 group/wn"
          >
            <Newspaper className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide group-hover/wn:text-foreground transition-colors">
              What's New
            </p>
            {whatsNewOpen
              ? <ChevronDown  className="w-3.5 h-3.5 text-muted-foreground/60" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            }
          </button>

          {whatsNewOpen && <WhatsNewCard />}
        </div>

      </div>

      <SubmitCaseDrawer
        open={showSubmitCase}
        onClose={() => setShowSubmitCase(false)}
      />
    </HomebaseShell>
  );
}
