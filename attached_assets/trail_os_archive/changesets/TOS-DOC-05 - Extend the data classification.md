# TOS-DOC-05 — Extend the data classification

**Status:** ready to apply · **Revised from:** "no data dictionary exists" (that was wrong)

---

## What already exists

Section 14 of the specification classifies data files into three buckets — accurate and ready for a
live swap, placeholder shapes needing live data, and stale needing review — and names what replaces
each one. That is a real data dictionary and my original review was wrong to say there wasn't one.

## The gap

It covers **twelve** of the **thirty-three** files in the data folder. The omissions are not the
small ones — every file over forty kilobytes is unclassified.

### Classified (12)

`programs.ts` · `knowledgeSourceData.ts` · `resolvePhases.ts` · `standardsData.ts` ·
`operationalIntelligenceData.ts` · `signalCounts.ts` · `pennyCapabilityData.ts` · `commData.ts` ·
`googleCalendarData.ts` · `googleDriveData.ts` · `universalObjectProfileData.ts` ·
`demandStages.ts` · `trailOsCapabilities.ts`

(Plus `accessTiers.ts` and `terminology.ts`, which live in config rather than data.)

### Unclassified (21) — ordered by size

| File | Size |
|---|---|
| `curriculumData.ts` | 88 KB |
| `peopleRolesData.ts` | 80 KB |
| `slackPhase2Data.ts` | 78 KB |
| `integrationReadinessData.ts` | 76 KB |
| `pennyPromptStudioData.ts` | 65 KB |
| `governanceData.ts` | 59 KB |
| `slackIntegrationData.ts` | 50 KB |
| `globalSearchData.ts` | 46 KB |
| `knowledgeGraphData.ts` | 41 KB |
| `unifiedObjectModelData.ts` | 40 KB |
| `pennyContentActions.ts` | 37 KB |
| `salesforceArchitectureData.ts` | 31 KB |
| `sourceDocuments.ts` | 18 KB |
| `contextEngineData.ts` | 17 KB |
| `programResourcesData.ts` | 9 KB |
| `readinessState.ts` | 8 KB |
| `pennyCapabilities.ts` | 6 KB |
| `commRouting.ts` | 5 KB |
| `messageTemplates.ts` | 5 KB |
| `commProviders.ts` | 4 KB |

Roughly 600 KB of unclassified data against roughly 200 KB classified.

Note `readinessState.ts`: elsewhere the specification calls it the single source of truth for
integration status, but section 14 does not classify it. It should be the first entry.

---

## The rubric change

The existing three buckets answer two questions at once — *is this accurate* and *is this
live-backed* — and neither answers the one that matters in a demonstration: **can this number be
said out loud and defended?**

Replace three buckets with four columns:

| Column | What it answers |
|---|---|
| **What it holds** | One line, in plain language |
| **Source** | Where the content came from — a named Transition Trails document, a live system query, or invented for the prototype |
| **Status** | One of the four below |
| **Replaced by** | What makes it live, and in which phase |

### The four statuses

- **Live** — served from a real system at runtime. Safe to show, safe to quote.
- **Real** — accurate Transition Trails content, hardcoded. Safe to show and quote; it simply is not
  yet wired. The program records and the RESOLVE phases are this.
- **Illustrative** — plausible, well-shaped, and invented. Safe to *show* as a demonstration of the
  interface. **Never quote a number from it.** This is the category the old rubric was missing.
- **Stale** — was accurate once and is now wrong. Not safe to show. Fix or remove.

The distinction that matters is **Illustrative** versus **Real**. "Phase 2" tells you when a file
gets wired; it does not tell you whether the ninety-day placement rate on the overview screen is a
real figure. Anyone demonstrating Trail OS needs to know which numbers are theirs.

### Required summary

The classification should end with a count of Illustrative files and a short list of the specific
screens that render figures from them — the demonstration exposure, in one place.
