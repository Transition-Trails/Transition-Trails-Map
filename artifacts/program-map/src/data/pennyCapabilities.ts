export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

export interface PennyCapability {
  id: string;
  entityType: 'penny-capability';
  confidence: ConfidenceStatus;
  name: string;
  purpose: string;
  executiveSummary: string;
  whyItMatters: string;
  keyFacts: string[];
  programs: string[];
  trailOsCapabilities: string[];
  docs: string[];
}

export const pennyCapabilities: PennyCapability[] = [
  {
    id: "trail-guide",
    entityType: "penny-capability",
    confidence: "confirmed",
    name: "Trail Guide",
    purpose: "Personalized learning path advisor; maps learner goals to program sequence and content",
    executiveSummary: "Trail Guide is Penny's personalized path advisor — it maps each learner's goals to the right program sequence and learning content.",
    whyItMatters: "Without Trail Guide, learners navigate the program ecosystem without personalized guidance, increasing dropout and misalignment.",
    keyFacts: ["Primary touchpoint for new learners", "Maps goals to program sequence", "Active in Explorer's, Foundations, Guided Trail, and Digital Compass"],
    programs: ["Explorer's Trail", "Foundations Trail", "Guided Trail", "Digital Compass"],
    trailOsCapabilities: ["Intake Coordination"],
    docs: ["Trail Guide Framework"]
  },
  {
    id: "learning-coach",
    entityType: "penny-capability",
    confidence: "confirmed",
    name: "Learning Coach",
    purpose: "Real-time support during coursework; answers questions, surfaces resources, checks comprehension",
    executiveSummary: "Learning Coach provides real-time AI support during coursework — answering questions, surfacing resources, and checking comprehension.",
    whyItMatters: "Reduces facilitator load during independent learning and ensures learners are not stuck for long periods without support.",
    keyFacts: ["Active during asynchronous and self-paced work", "Surfaces existing documentation as answers", "Works alongside human facilitators, not in place of them"],
    programs: ["Explorer's Trail", "Foundations Trail", "Digital Compass"],
    trailOsCapabilities: ["Coach Visibility", "Documentation"],
    docs: []
  },
  {
    id: "exam-coach",
    entityType: "penny-capability",
    confidence: "confirmed",
    name: "Exam Coach",
    purpose: "Pre-assessment and certification prep, with adaptive practice questions",
    executiveSummary: "Exam Coach prepares learners for assessments and certifications with adaptive practice and targeted feedback.",
    whyItMatters: "Certification readiness is a key outcome metric. Exam Coach improves pass rates and reduces assessment anxiety.",
    keyFacts: ["Adaptive practice question engine", "Supports Salesforce certification prep", "Active in Foundations and Guided Trail"],
    programs: ["Foundations Trail", "Guided Trail"],
    trailOsCapabilities: ["Outcomes Tracking"],
    docs: []
  },
  {
    id: "build-companion",
    entityType: "penny-capability",
    confidence: "confirmed",
    name: "Build Companion",
    purpose: "Project assistant for hands-on work; provides scaffolded hints and feedback",
    executiveSummary: "Build Companion assists learners during hands-on project work with scaffolded hints, guidance, and structured feedback.",
    whyItMatters: "Project-based learning is central to the Transition Trails model. Build Companion ensures learners can make progress without waiting for facilitator attention.",
    keyFacts: ["Active during sprint project work", "Provides scaffolded hints, not answers", "Works within Guided Trail's project structure"],
    programs: ["Foundations Trail", "Guided Trail", "Digital Compass"],
    trailOsCapabilities: ["Project Delivery"],
    docs: []
  },
  {
    id: "career-translator",
    entityType: "penny-capability",
    confidence: "confirmed",
    name: "Career Translator",
    purpose: "Translates learner skills into employer language; builds resume narratives and LinkedIn profiles",
    executiveSummary: "Career Translator converts learner skills and experiences into employer-ready language — resumes, LinkedIn profiles, and professional narratives.",
    whyItMatters: "Many learners have real skills but struggle to articulate them in employer language. Career Translator closes this communication gap.",
    keyFacts: ["Outputs include resume drafts and LinkedIn summaries", "Emphasizes transferable skills", "Active at Explorer's and Guided Trail exit points"],
    programs: ["Explorer's Trail", "Guided Trail", "Digital Compass"],
    trailOsCapabilities: ["Learner-Client Matching"],
    docs: []
  },
  {
    id: "quest-master",
    entityType: "penny-capability",
    confidence: "confirmed",
    name: "Quest Master",
    purpose: "Gamified progress system; manages badges, milestones, and learner achievements",
    executiveSummary: "Quest Master is the gamified progress layer — managing badges, milestones, and learner achievement recognition across the program.",
    whyItMatters: "Engagement and motivation are key to completion rates. Quest Master creates visible progress momentum for learners in intensive programs.",
    keyFacts: ["Badge and milestone system", "Active primarily in Guided Trail", "Supports engagement during long sprint cycles"],
    programs: ["Guided Trail"],
    trailOsCapabilities: ["Project Delivery"],
    docs: []
  },
  {
    id: "coach-intelligence",
    entityType: "penny-capability",
    confidence: "confirmed",
    name: "Coach Intelligence Layer",
    purpose: "AI layer surfacing insights for human coaches: learner risk flags, engagement patterns, coaching recommendations",
    executiveSummary: "Coach Intelligence Layer surfaces AI-generated insights for human coaches — flagging at-risk learners, engagement patterns, and coaching recommendations.",
    whyItMatters: "Human coaches cannot monitor all learners at all times. Coach Intelligence Layer makes coaching proactive rather than reactive.",
    keyFacts: ["AI-driven risk flagging for coaches", "Engagement pattern analysis", "Most relevant in Trail of Mastery's advanced coaching model"],
    programs: ["Trail of Mastery"],
    trailOsCapabilities: ["Coach Visibility", "Analytics Layer"],
    docs: []
  }
];
