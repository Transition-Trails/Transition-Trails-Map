import type { PennyRetrievalEntry } from '@/data/knowledgeSourceData';

export const pennyRetrievalMap: PennyRetrievalEntry[] = [
  {
    capabilityId: 'cap-learner-coaching',
    capabilityName: 'Learner Coaching',
    capabilityDomain: 'Coaching',
    retrievalNote: 'Every coaching interaction loads a context envelope: current module (LMS), learner progress (Assessments), and coaching rules (Standards Studio). Coach notes are loaded if an escalation flag is active.',
    retrievalSteps: [
      { order: 1, sourceId: 'src-lms-modules',         role: 'Primary',   reasoning: "Current module content gives Penny the topic being studied. Cannot coach accurately without this.", confidenceImpact: 'High'   },
      { order: 2, sourceId: 'src-assessments',         role: 'Primary',   reasoning: "Assessment scores reveal where the learner is struggling. Penny personalizes based on performance patterns.", confidenceImpact: 'High'   },
      { order: 3, sourceId: 'src-standards-studio',    role: 'Context',   reasoning: "Coach Notes standard defines what valid coaching looks like — tone, escalation triggers, format.", confidenceImpact: 'Medium' },
      { order: 4, sourceId: 'src-sf-mission-delivery', role: 'Secondary', reasoning: "Program model context — Penny stays aligned to the organization's coaching delivery approach.", confidenceImpact: 'Medium' },
      { order: 5, sourceId: 'src-coach-notes',         role: 'Fallback',  reasoning: "Read only when escalation signals are detected. Gives Penny human-coach context.", confidenceImpact: 'High'   },
    ],
  },
  {
    capabilityId: 'cap-knowledge-retrieval',
    capabilityName: 'Knowledge Retrieval',
    capabilityDomain: 'Knowledge',
    retrievalNote: 'Penny searches in priority order. If SF Knowledge answers the question with high confidence, retrieval stops. Source documents are the fallback for edge cases.',
    retrievalSteps: [
      { order: 1, sourceId: 'src-sf-technology',       role: 'Primary',   reasoning: "Technology questions are the most common learner query. Highest accuracy requirement.", confidenceImpact: 'High'   },
      { order: 2, sourceId: 'src-sf-mission-delivery', role: 'Primary',   reasoning: "Program and career questions are second most common. Authoritative for coaching alignment.", confidenceImpact: 'High'   },
      { order: 3, sourceId: 'src-curriculum-studio',   role: 'Secondary', reasoning: "For questions about the program structure — what's in a module, what's coming next.", confidenceImpact: 'Medium' },
      { order: 4, sourceId: 'src-gdrive-source-docs',  role: 'Fallback',  reasoning: "Supplementary for edge-case technical questions not in SF Knowledge.", confidenceImpact: 'Low'    },
      { order: 5, sourceId: 'src-standards-studio',    role: 'Context',   reasoning: "Penny checks that its answer format meets the Knowledge Article standard before delivering.", confidenceImpact: 'Medium' },
    ],
  },
  {
    capabilityId: 'cap-resume-review',
    capabilityName: 'Resume Review',
    capabilityDomain: 'Career',
    retrievalNote: 'Resume Review is career-domain context heavy. Penny loads role definitions, program progress, and certification data before generating feedback.',
    retrievalSteps: [
      { order: 1, sourceId: 'src-sf-mission-delivery', role: 'Primary',   reasoning: 'Career outcomes framework defines what "Salesforce-ready" means for each role type.', confidenceImpact: 'High'   },
      { order: 2, sourceId: 'src-assessments',         role: 'Primary',   reasoning: "Certification progress and assessment scores tell Penny what skills the learner can credibly claim.", confidenceImpact: 'High'   },
      { order: 3, sourceId: 'src-lms-modules',         role: 'Secondary', reasoning: 'Module completion tells Penny what topics the learner has covered — feeds "skills you can talk to" list.', confidenceImpact: 'Medium' },
      { order: 4, sourceId: 'src-gdrive-foundations',  role: 'Fallback',  reasoning: "Program-specific career prep materials if available in Drive.", confidenceImpact: 'Low'    },
    ],
  },
  {
    capabilityId: 'cap-reflection-prompts',
    capabilityName: 'Reflection Prompts',
    capabilityDomain: 'Coaching',
    retrievalNote: 'Reflection delivery is standards-driven. Penny loads the correct prompt from Curriculum Studio, validates against the Reflection Prompt standard, then delivers.',
    retrievalSteps: [
      { order: 1, sourceId: 'src-curriculum-studio', role: 'Primary',  reasoning: "Reflection prompts are authored in Curriculum Studio as Penny assets per module. This is the source.", confidenceImpact: 'High'   },
      { order: 2, sourceId: 'src-standards-studio',  role: 'Context',  reasoning: "Reflection Prompt standard validates the prompt has deepening question, follow-up logic, and format.", confidenceImpact: 'High'   },
      { order: 3, sourceId: 'src-lms-modules',       role: 'Secondary', reasoning: "Module context ensures the reflection is aligned to what the learner actually just completed.", confidenceImpact: 'Medium' },
    ],
  },
  {
    capabilityId: 'cap-study-coach',
    capabilityName: 'Study Coach',
    capabilityDomain: 'Learning',
    retrievalNote: 'Study coaching is pacing + content aware. Penny needs sprint schedule, current module content, and assessment history to generate an accurate study plan.',
    retrievalSteps: [
      { order: 1, sourceId: 'src-lms-modules',       role: 'Primary',  reasoning: "Module content and sequence tells Penny what to study and in what order.", confidenceImpact: 'High'   },
      { order: 2, sourceId: 'src-assessments',       role: 'Primary',  reasoning: "Past performance identifies weak areas that need extra study time.", confidenceImpact: 'High'   },
      { order: 3, sourceId: 'src-curriculum-studio', role: 'Context',  reasoning: "Sprint schedule and learning objectives structure the study plan scaffold.", confidenceImpact: 'Medium' },
      { order: 4, sourceId: 'src-sf-technology',     role: 'Fallback', reasoning: "For recommending supplementary Salesforce resources on specific topics.", confidenceImpact: 'Low'    },
    ],
  },
];
