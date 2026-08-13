/**
 * DomainReadsSidebar
 *
 * Compact sidebar rendered during an active assessment session.
 * Shows one row per SF Admin domain with:
 *   - Colour-coded domain label (abbreviation)
 *   - Progress bar (green=settled, amber=reading, grey=not_yet)
 *   - Answered / correct counts
 *
 * Props:
 *   domainReads — array of DomainState returned by every assessments API response
 */

interface DomainState {
  domain:        string;
  domainLabel:   string;
  domainWeight:  number;
  read:          "settled" | "reading" | "not_yet";
  answeredCount: number;
  correctCount:  number;
}

// Per-domain colour palette — one accent per SF Admin exam domain
const DOMAIN_COLORS: Record<string, { bar: string; chip: string; label: string }> = {
  "config-setup":           { bar: "#3B82F6", chip: "#EFF6FF", label: "#1D4ED8" },
  "object-manager-builder": { bar: "#7C3AED", chip: "#F5F3FF", label: "#6D28D9" },
  "sales-marketing":        { bar: "#10B981", chip: "#ECFDF5", label: "#065F46" },
  "service-support":        { bar: "#F97316", chip: "#FFF7ED", label: "#92400E" },
  "productivity":           { bar: "#F59E0B", chip: "#FFFBEB", label: "#78350F" },
  "data-analytics":         { bar: "#14B8A6", chip: "#F0FDFA", label: "#0F766E" },
  "workflow-automation":    { bar: "#6366F1", chip: "#EEF2FF", label: "#3730A3" },
  "security-access":        { bar: "#F43F5E", chip: "#FFF1F2", label: "#9F1239" },
};

const DEFAULT_COLOR = { bar: "#9CA3AF", chip: "#F9FAFB", label: "#6B7280" };

// Abbreviate a domain label to ≤ 20 chars for the compact view
function abbrev(label: string): string {
  const MAP: Record<string, string> = {
    "Configuration and Setup":                       "Config & Setup",
    "Object Manager and Lightning App Builder":      "Object Manager",
    "Sales and Marketing Applications":              "Sales & Marketing",
    "Service and Support Applications":              "Service & Support",
    "Productivity and Collaboration":                "Productivity",
    "Data and Analytics Management":                 "Data & Analytics",
    "Workflow and Process Automation":               "Workflow Auto.",
    "Security and Access Management":               "Security & Access",
  };
  return MAP[label] ?? label.slice(0, 18);
}

interface Props {
  domainReads: DomainState[];
}

export function DomainReadsSidebar({ domainReads }: Props) {
  if (!domainReads.length) return null;

  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-xl border overflow-auto"
      style={{ background: "white", borderColor: "#E2E4E1", minWidth: 160 }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>
        Domains
      </p>
      {domainReads.map(d => {
        const clr = DOMAIN_COLORS[d.domain] ?? DEFAULT_COLOR;

        // Bar fill: settled=100%, reading=proportional to answeredCount/5, not_yet=0
        const barPct =
          d.read === "settled"  ? 100 :
          d.read === "reading"  ? Math.min(95, (d.answeredCount / 5) * 100) :
          0;

        const barColor =
          d.read === "settled" ? "#10B981" :
          d.read === "reading" ? "#F59E0B" :
          "#E5E7EB";

        return (
          <div key={d.domain} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-1">
              <span
                className="text-[10px] font-medium truncate"
                style={{ color: clr.label, maxWidth: 120 }}
              >
                {abbrev(d.domainLabel)}
              </span>
              {d.read === "settled" && (
                <span className="text-[9px] font-semibold px-1 rounded" style={{ background: "#ECFDF5", color: "#065F46" }}>
                  ✓
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barPct}%`, background: barColor }}
              />
            </div>

            {d.answeredCount > 0 && (
              <p className="text-[9px]" style={{ color: "#9CA3AF" }}>
                {d.correctCount}/{d.answeredCount} correct
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
