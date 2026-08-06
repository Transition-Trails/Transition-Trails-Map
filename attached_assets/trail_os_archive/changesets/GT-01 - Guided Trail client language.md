# GT-01 changeset — Guided Trail client language

**Repo:** Transition-Trails/TT-Public-Website @ main
**Root:** `artifacts/transition-trails/`
**Finding:** GT-01 (blocker). The site implies learners are paired with an external nonprofit client and meet them. Reality: real member work, in a **sandbox**, **never client production**, and **never in front of the client** — the coach relays every requirement. Squads also take brand-new Base Camp setups and Transition Trails' own 501(c)(3) org.

**Rule:** keep "real nonprofit work". Remove pairing verbs and implied meetings. 9 edits across 6 files.

---

## 1. `src/content/programs.json` → `guidedTrail.highlight`

FIND
```
"highlight": "Real nonprofit client · 12 weeks · Portfolio",
```
REPLACE
```
"highlight": "Real nonprofit work · 12 weeks · Portfolio",
```

---

## 2. `src/components/Nav.jsx` (~line 99)

FIND
```
desc="Our flagship program — real nonprofit clients"
```
REPLACE
```
desc="Our flagship program — supervised nonprofit work"
```

---

## 3. `src/pages/GuidedTrail.jsx` — PageMeta title (~line 12)

FIND
```
title="Guided Trail | Real-Client Salesforce Practicum | Transition Trails"
```
REPLACE
```
title="Guided Trail | Supervised Salesforce Practicum | Transition Trails"
```

---

## 4. `src/pages/GuidedTrail.jsx` — PageMeta description (~line 13)

FIND
```
description="Close the experience gap. Work with a real nonprofit client, build a job-ready portfolio piece, and get hired. Guided Trail Cohort 1 waitlist open. Starting at $1,497."
```
REPLACE
```
description="Close the experience gap. Work real nonprofit requirements in a sandbox with a coach beside you, build a job-ready portfolio piece, and get hired. Guided Trail Cohort 1 waitlist open. Starting at $1,497."
```

---

## 5. `src/pages/GuidedTrail.jsx` — hero paragraph (~line 29)

FIND
```
You passed the Admin cert. You've applied to dozens of jobs. You keep getting rejected for lack of experience. That cycle ends here. Guided Trail pairs you with a real nonprofit client for a real 12-week Salesforce implementation — and you walk away with a portfolio piece employers actually care about.
```
REPLACE
```
You passed the Admin cert. You've applied to dozens of jobs. You keep getting rejected for lack of experience. That cycle ends here. Guided Trail puts you on real nonprofit work for twelve weeks — in a sandbox, with an Associate Coach holding the client relationship — and you walk away with a portfolio piece employers actually care about.
```

---

## 6. `src/pages/GuidedTrail.jsx` — Layer 3 paragraph (~line 138)

Currently promises working *directly* with clients. Same work, correct framing.

FIND
```
Depending on your cohort workload and demonstrated experience, you may have the opportunity to work directly with Digital Compass nonprofit clients — real organizations with real Salesforce needs. Not every learner reaches this level in 12 weeks, but when you do, it is the most compelling portfolio entry of all.
```
REPLACE
```
Depending on your cohort workload and demonstrated experience, you may be assigned work from a Digital Compass nonprofit client — a real organization with a real Salesforce need. You build it in a sandbox and your coach carries requirements and results between you and the client, so you are corrected in private rather than in front of the person being served. Not every learner reaches this level in 12 weeks, but when you do, it is the most compelling portfolio entry of all.
```

---

## 7. `src/pages/Home.jsx` (~line 203)

FIND
```
Under the guidance of experienced coaches, you will work on real Salesforce solutions for real nonprofit clients, earning the portfolio proof that moves careers forward.
```
REPLACE
```
Under the guidance of experienced coaches, you will work on real Salesforce solutions for nonprofit organizations, earning the portfolio proof that moves careers forward.
```

---

## 8. `src/pages/PartnersRecruiters.jsx` (~line 119) and `src/pages/PartnersEmployers.jsx` (~line 51)

Same string in both files' credential lists. Recruiters verify this — make it survive a probe.

FIND (both files)
```
"Real nonprofit client project experience",
```
REPLACE (both files)
```
"Supervised nonprofit project delivery — sandbox-based",
```

---

## 9. `src/pages/Coaches.jsx` (~line 319)

FIND
```
TT coaches work with cohorts of learners through the Guided Trail — 12 weeks of structured Salesforce project work delivered to real nonprofit clients using the RESOLVE methodology.
```
REPLACE
```
TT coaches work with cohorts of learners through the Guided Trail — 12 weeks of structured Salesforce project work for real nonprofit organizations, using the RESOLVE methodology. The coach holds every client relationship: learners build in sandboxes and never face the client directly, so you can stop a learner mid-decision and correct them without an audience.
```

---

## Deliberately NOT changed

- `GuidedTrail.jsx` hero eyebrow "BRIDGE TIER · COHORT-BASED · REAL CLIENT WORK" — accurate as written.
- `Home.jsx:167` "real client work and a real portfolio" — accurate.
- `About.jsx:96` "real work, real clients, and a real portfolio" — accurate.
- `home.json` hero subheadline "real nonprofit client work" — accurate.

## Separate findings, same files — do not conflate

- **GT-02** — "Cohort 1 · 8–12 seats" (`GuidedTrail.jsx` ~line 42) vs 3–5 per squad. Needs your decision first.
- **GT-03** — capstone framing vs inherited seeded org (`GuidedTrail.jsx` Layer 1, deliverables list, `FoundationsTrail.jsx:140`).
- **CERT-01** — "Salesforce Platform Administrator" (`GuidedTrail.jsx` ~line 88 and elsewhere) → "Salesforce Certified Administrator".
- **GT-05** — Layer 2 "real deployments" reads as CI/CD; Guided Trail deploys by change set.
- **Trail OS** — Layer 2 sells "the Trail OS platform", live Q1 2027, after Cohort 1 ends.
