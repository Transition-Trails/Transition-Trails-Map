export const pennyCapabilities = [
  {
    id: "trail-guide",
    name: "Trail Guide",
    purpose: "Personalized learning path advisor; maps learner goals to program sequence and content",
    programs: ["Explorer's Trail", "Foundations Trail", "Guided Trail", "Digital Compass"],
    trailOsCapabilities: ["Intake Coordination"],
    docs: ["Trail Guide Framework"]
  },
  {
    id: "learning-coach",
    name: "Learning Coach",
    purpose: "Real-time support during coursework; answers questions, surfaces resources, checks comprehension",
    programs: ["Explorer's Trail", "Foundations Trail", "Digital Compass"],
    trailOsCapabilities: ["Coach Visibility", "Documentation"],
    docs: []
  },
  {
    id: "exam-coach",
    name: "Exam Coach",
    purpose: "Pre-assessment and certification prep, with adaptive practice questions",
    programs: ["Foundations Trail", "Guided Trail"],
    trailOsCapabilities: ["Outcomes Tracking"],
    docs: []
  },
  {
    id: "build-companion",
    name: "Build Companion",
    purpose: "Project assistant for hands-on work; provides scaffolded hints and feedback",
    programs: ["Foundations Trail", "Guided Trail", "Digital Compass"],
    trailOsCapabilities: ["Project Delivery"],
    docs: []
  },
  {
    id: "career-translator",
    name: "Career Translator",
    purpose: "Translates learner skills into employer language; builds resume narratives and LinkedIn profiles",
    programs: ["Explorer's Trail", "Guided Trail", "Digital Compass"],
    trailOsCapabilities: ["Learner-Client Matching"],
    docs: []
  },
  {
    id: "quest-master",
    name: "Quest Master",
    purpose: "Gamified progress system; manages badges, milestones, and learner achievements",
    programs: ["Guided Trail"],
    trailOsCapabilities: ["Project Delivery"],
    docs: []
  },
  {
    id: "coach-intelligence",
    name: "Coach Intelligence Layer",
    purpose: "AI layer surfacing insights for human coaches: learner risk flags, engagement patterns, coaching recommendations",
    programs: ["Trail of Mastery"],
    trailOsCapabilities: ["Coach Visibility", "Analytics Layer"],
    docs: []
  }
];