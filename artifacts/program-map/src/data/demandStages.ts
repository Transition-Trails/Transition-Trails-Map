export const demandStages = [
  {
    id: "intake",
    name: "Request Intake",
    items: ["Digital Compass cohort Q3", "Employer partner onboarding", "New facilitator application"],
    purpose: "Capture all incoming requests and demands.",
    inputs: "Emails, forms, meetings",
    outputs: "Logged requests",
    owner: "Intake Coordinator",
    artifacts: ["Master Program Overview"]
  },
  {
    id: "triage",
    name: "Triage",
    items: ["Guided Trail expansion — Atlanta", "Trail OS integration request"],
    purpose: "Sort and categorize incoming requests.",
    inputs: "Logged requests",
    outputs: "Categorized demands",
    owner: "Operations",
    artifacts: []
  },
  {
    id: "scoring",
    name: "Scoring",
    items: ["Data analytics module add-on"],
    purpose: "Evaluate requests based on strategic alignment.",
    inputs: "Categorized demands",
    outputs: "Scored requests",
    owner: "Leadership",
    artifacts: ["Pricing Analysis"]
  },
  {
    id: "backlog",
    name: "Backlog",
    items: ["Alumni network portal", "Salesforce advanced cert track", "Spanish-language program", "Partner capacity assessment"],
    purpose: "Store approved but unscheduled requests.",
    inputs: "Scored requests",
    outputs: "Prioritized backlog",
    owner: "Program Director",
    artifacts: []
  },
  {
    id: "sprint-planning",
    name: "Sprint Planning",
    items: ["Guided Trail Sprint 3 — cohort B", "Foundations revision"],
    purpose: "Select requests for the upcoming sprint.",
    inputs: "Prioritized backlog",
    outputs: "Sprint plan",
    owner: "Operations",
    artifacts: ["Guided Trail Sprint Cadence"]
  },
  {
    id: "delivery",
    name: "Delivery",
    items: ["Explorer's Trail Cohort 7", "Guided Trail Sprint 2", "Digital Compass Week 4", "Foundations Cohort 3", "Trail of Mastery — capstone"],
    purpose: "Execute the sprint plan.",
    inputs: "Sprint plan",
    outputs: "Delivered outcomes",
    owner: "Facilitators",
    artifacts: ["Facilitator Guide"]
  },
  {
    id: "verification",
    name: "Verification",
    items: ["Exam Coach integration UAT"],
    purpose: "Check delivered outcomes against requirements.",
    inputs: "Delivered outcomes",
    outputs: "Verified results",
    owner: "Evaluators",
    artifacts: []
  },
  {
    id: "retrospective",
    name: "Retrospective",
    items: ["Q2 program retro", "Employer feedback synthesis", "Coach capacity review"],
    purpose: "Review the process and identify improvements.",
    inputs: "Verified results, team feedback",
    outputs: "Action items for improvement",
    owner: "Strategy Team",
    artifacts: []
  }
];