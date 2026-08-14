// ─────────────────────────────────────────────────────────────────────────────
// Trail Crew tab — Content Studio
// External-contributor surface: volunteers and learners, same work, same screens.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  KeyRound,
  Circle,
  CalendarClock,
  FolderOpen,
  Pen,
  Lightbulb,
  X,
} from 'lucide-react';
import { ContentStudioPennyCard } from '../components/PennyCard';
import {
  MOCK_CREW_TASKS,
  MOCK_THIS_MONTH_ITEMS,
  MOCK_POINTS,
  MOCK_SUBMITTED_IDEAS,
} from '../mockData';

// ── Types ─────────────────────────────────────────────────────────────────────

type CrewSubTab = 'my-work' | 'submit-idea' | 'submit-draft' | 'mark-published' | 'this-month';

const SUB_TABS: { id: CrewSubTab; label: string }[] = [
  { id: 'my-work', label: 'My work' },
  { id: 'submit-idea', label: 'Submit an idea' },
  { id: 'submit-draft', label: 'Submit a draft' },
  { id: 'mark-published', label: 'Mark published' },
  { id: 'this-month', label: 'This month' },
];

// ── Pill tab bar ──────────────────────────────────────────────────────────────

function PillTabBar({
  active,
  onChange,
}: {
  active: CrewSubTab;
  onChange: (t: CrewSubTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2">
      {SUB_TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={[
              'px-3 py-1 rounded-full text-[13px] font-medium transition-colors',
              isActive
                ? 'bg-[#2F6B3F] text-white'
                : 'border border-[#E2E4E1] bg-white text-[#687069] hover:bg-[#f3f4f2]',
            ].join(' ')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <Circle
      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
      style={{ color: '#C4C7BF' }}
    />
  );
}

// ── Due date chip ─────────────────────────────────────────────────────────────

function DueDateChip({ isoDate }: { isoDate: string }) {
  const d = new Date(isoDate);
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
      <CalendarClock className="w-3 h-3" />
      Due {label}
    </span>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: (typeof MOCK_CREW_TASKS)[number] }) {
  const isFolder = task.contentItemId.startsWith('ci-');
  return (
    <div className="bg-white rounded-lg border border-[#E2E4E1] p-4 space-y-2.5">
      <div className="flex items-start gap-2">
        <StatusDot status={task.status} />
        <div className="space-y-0.5 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-snug">
            {task.title}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {task.contentItemTitle}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {task.dueDate && <DueDateChip isoDate={task.dueDate} />}
        <button className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#2F6B3F] text-white text-[12px] font-medium hover:bg-[#245732] transition-colors">
          {isFolder ? (
            <>
              <FolderOpen className="w-3.5 h-3.5" />
              Open folder
            </>
          ) : (
            <>
              <Pen className="w-3.5 h-3.5" />
              Open Canva
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── My Work sub-tab ───────────────────────────────────────────────────────────

function MyWorkTab() {
  const myTasks = MOCK_CREW_TASKS.filter((t) => t.tab === 'mine');
  return (
    <div className="grid grid-cols-[1fr_320px] gap-4 p-4 items-start">
      {/* Left — assigned tasks */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-semibold text-foreground">Assigned to you</h3>
        {myTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Right rail */}
      <div className="space-y-3">
        <ContentStudioPennyCard
          mode="Coach"
          message="What's the trickiest part of the piece you're working on right now? Sometimes naming it is half the fix."
          actions={['Tell Penny']}
        />

        <div className="bg-white rounded-lg border border-[#E2E4E1] p-4 space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Need something that isn't on your task list? Raise it and it goes straight
            to the content coordinator.
          </p>
          <button className="w-full text-[12px] font-medium border border-[#2F6B3F] text-[#2F6B3F] rounded-md px-3 py-1.5 hover:bg-[#EDF5F0] transition-colors">
            Raise a request
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submit an idea sub-tab ────────────────────────────────────────────────────

function SubmitIdeaTab() {
  const [showPenny, setShowPenny] = useState(true);

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4 p-4 items-start">
      {/* Left — form */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-[#E2E4E1] p-4 space-y-3">
          <h3 className="text-[13px] font-semibold text-foreground">New idea</h3>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              Describe the idea in one sentence
            </label>
            <textarea
              className="w-full rounded-md border border-[#E2E4E1] px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7FAFC6] resize-none"
              rows={3}
              placeholder="e.g. A short explainer video about what a coaching session looks like…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">
                Topic (optional)
              </label>
              <select className="w-full rounded-md border border-[#E2E4E1] px-2 py-1.5 text-[13px] text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAFC6]">
                <option value="">Select…</option>
                <option>Coaching Practice</option>
                <option>Housing Navigation</option>
                <option>Benefits Navigation</option>
                <option>RESOLVE Framework</option>
                <option>Life Skills</option>
                <option>Org Communications</option>
                <option>Nonprofit Tech Stack</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">
                Format (optional)
              </label>
              <select className="w-full rounded-md border border-[#E2E4E1] px-2 py-1.5 text-[13px] text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAFC6]">
                <option value="">Select…</option>
                <option>Article</option>
                <option>Video</option>
                <option>Checklist</option>
                <option>Guide</option>
                <option>Template</option>
                <option>Social</option>
                <option>Email</option>
              </select>
            </div>
          </div>
          <button className="w-full bg-[#2F6B3F] text-white text-[13px] font-medium rounded-md px-3 py-2 hover:bg-[#245732] transition-colors">
            Submit idea
          </button>
        </div>

        {/* Penny fill-in band */}
        {showPenny && (
          <div className="rounded-lg border border-[#7FAFC6] bg-[#EDF5F8] px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#2F6F7E] leading-snug">
              <span className="font-semibold">Penny · Coach</span> — I can fill in the rest
              from context. Want me to suggest a topic and format?
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowPenny(false)}
                className="px-3 py-1 rounded-full bg-[#2F6B3F] text-white text-[12px] font-medium hover:bg-[#245732] transition-colors"
              >
                Yes, please
              </button>
              <button
                onClick={() => setShowPenny(false)}
                className="px-3 py-1 rounded-full border border-[#7FAFC6] text-[#2F6F7E] text-[12px] font-medium hover:bg-[#daeef5] transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Submitted ideas */}
        <div className="space-y-2">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Your submitted ideas
          </h3>
          {MOCK_SUBMITTED_IDEAS.map((idea) => (
            <div
              key={idea.id}
              className="bg-white rounded-lg border border-[#E2E4E1] px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground leading-snug truncate">
                  {idea.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {idea.topic} · {idea.format}
                </p>
              </div>
              {idea.status === 'Idea' ? (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EDF5F8] border border-[#7FAFC6] text-[#2F6F7E] text-[11px] font-semibold">
                  <Lightbulb className="w-3 h-3" />
                  Idea
                </span>
              ) : (
                <span className="flex-shrink-0 text-[11px] text-muted-foreground font-medium">
                  Closed · {idea.closedReason}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right rail — explanation */}
      <div className="bg-white rounded-lg border border-[#E2E4E1] p-4 space-y-2">
        <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          What happens next?
        </h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Your idea arrives as a <span className="font-medium text-foreground">Content Item</span>{' '}
          at status <span className="font-semibold text-[#2F6F7E]">Idea</span> with a triage Task
          assigned to the content coordinator. They'll review it in the weekly pipeline meeting and
          either move it forward, park it, or close it with a reason — you'll see the outcome here.
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Closed ideas stay visible so you know the loop closed — never a black hole.
        </p>
      </div>
    </div>
  );
}

// ── Submit a draft sub-tab ────────────────────────────────────────────────────

function SubmitDraftTab() {
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg border border-[#E2E4E1] p-5 space-y-4 max-w-lg">
        <h3 className="text-[13px] font-semibold text-foreground">Attach your file</h3>

        {/* Upload area */}
        <div
          className="rounded-[8px] border-2 border-dashed border-[#E2E4E1] flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-[#fafaf9] transition-colors"
        >
          <FolderOpen className="w-8 h-8 text-[#C4C7BF] mb-2" />
          <p className="text-[13px] text-muted-foreground">Drop file or browse</p>
          <input type="file" className="hidden" />
        </div>

        {/* Content item selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            Link to content item
          </label>
          <select className="w-full rounded-md border border-[#E2E4E1] px-2 py-1.5 text-[13px] text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAFC6]">
            <option value="">Select content item…</option>
            <option>RESOLVE Phase Overview: From Recognize to Evolve</option>
            <option>Building Your Support Network: A Worksheet</option>
            <option>Who Can See What: Data Access in Salesforce</option>
            <option>Trail Quest Facilitator Guide</option>
            <option>Volunteer Orientation: Your First 30 Days</option>
          </select>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This sets status to <span className="font-semibold text-foreground">Ready for Review</span>{' '}
          and fires the approval task. The coordinator will be notified automatically.
        </p>

        <button className="w-full bg-[#2F6B3F] text-white text-[13px] font-medium rounded-md px-3 py-2 hover:bg-[#245732] transition-colors">
          Submit draft
        </button>
      </div>
    </div>
  );
}

// ── Mark published sub-tab ────────────────────────────────────────────────────

function MarkPublishedTab() {
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg border border-[#E2E4E1] p-5 space-y-4 max-w-lg">
        <h3 className="text-[13px] font-semibold text-foreground">Publication record</h3>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            Actual publish date
          </label>
          <input
            type="date"
            className="w-full rounded-md border border-[#E2E4E1] px-3 py-1.5 text-[13px] text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAFC6]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">
            Published URL
          </label>
          <input
            type="url"
            placeholder="https://"
            className="w-full rounded-md border border-[#E2E4E1] px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7FAFC6]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Platform</label>
          <select className="w-full rounded-md border border-[#E2E4E1] px-2 py-1.5 text-[13px] text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAFC6]">
            <option value="">Select platform…</option>
            <option>Salesforce Knowledge</option>
            <option>Slack</option>
            <option>Email Newsletter</option>
            <option>LinkedIn</option>
            <option>Website Blog</option>
          </select>
        </div>

        <button className="w-full bg-[#2F6B3F] text-white text-[13px] font-medium rounded-md px-3 py-2 hover:bg-[#245732] transition-colors">
          Mark published
        </button>

        <p className="text-[11px] text-muted-foreground">
          Planned is what we meant; actual is what happened.
        </p>
      </div>
    </div>
  );
}

// ── This month sub-tab ────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  Published: 'bg-[#E6F0EA] text-[#2F6B3F]',
  'Ready to Publish': 'bg-amber-50 text-amber-700',
  'In Progress': 'bg-blue-50 text-blue-700',
};

function ThisMonthTab() {
  return (
    <div className="grid grid-cols-[1fr_320px] gap-4 p-4 items-start">
      {/* Left — produced items list */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-semibold text-foreground">Produced this month</h3>
        {MOCK_THIS_MONTH_ITEMS.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg border border-[#E2E4E1] px-4 py-3 flex items-center gap-3"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[13px] font-medium text-foreground leading-snug truncate">
                {item.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {item.format} · {item.platform} · {item.publishDate}
              </p>
            </div>
            <span
              className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[item.status] ?? 'bg-muted text-muted-foreground'}`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* Right rail — points card */}
      <div className="bg-white rounded-lg border border-[#E2E4E1] p-4 space-y-3">
        <div>
          <p
            className="font-[Poppins,sans-serif] text-[22px] font-semibold text-foreground"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {MOCK_POINTS.total}
          </p>
          <p className="text-[11px] text-muted-foreground">{MOCK_POINTS.label}</p>
        </div>
        <ul className="space-y-1.5">
          {MOCK_POINTS.events.map((ev) => (
            <li key={ev.id} className="flex items-start gap-2 text-[12px]">
              <span className="font-semibold text-[#2F6B3F] flex-shrink-0">{ev.delta}</span>
              <span className="text-muted-foreground">
                {ev.item}
                <span className="italic"> · {ev.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-[#E2E4E1] pt-2">
          {MOCK_POINTS.footer}
        </p>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function TrailCrewTab() {
  const [crewTab, setCrewTab] = useState<CrewSubTab>('my-work');

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Boundary strip */}
      <div className="flex items-start gap-3 mx-4 mt-4 px-4 py-3 rounded-lg bg-[#EDF5F8] border-l-4 border-[#7FAFC6]">
        <KeyRound className="w-4 h-4 text-[#2F6F7E] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-[#2F6F7E] leading-relaxed">
          <span className="font-semibold">External Apps Login · Dana R.</span> One surface for
          volunteers and learners alike — same work, same screens. Never sees Setup, donor records,
          payment data or partner records.
        </p>
      </div>

      {/* Pill sub-tabs */}
      <PillTabBar active={crewTab} onChange={setCrewTab} />

      {/* Sub-tab content */}
      <div className="flex-1 min-h-0">
        {crewTab === 'my-work' && <MyWorkTab />}
        {crewTab === 'submit-idea' && <SubmitIdeaTab />}
        {crewTab === 'submit-draft' && <SubmitDraftTab />}
        {crewTab === 'mark-published' && <MarkPublishedTab />}
        {crewTab === 'this-month' && <ThisMonthTab />}
      </div>
    </div>
  );
}
