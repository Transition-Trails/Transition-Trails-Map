---
name: Program health merge pattern
description: How prototype operational health data flows from ProgramMap into ContextPanel via selectedItem
---

When a program card is clicked in ProgramMap.tsx, the handler merges the local HEALTH prototype constant into the program data before calling setSelectedItem:

  const h = HEALTH[program.id] ?? {};
  setSelectedItem({ type: 'program', id: program.id, data: { ...program, ...h } });

ContextPanel's `type === 'program'` renderer can then access BOTH static program fields (pennyFeatures, trailOsCapabilities, resolvePhases, docs) AND prototype health fields (operationalStatus, activeCohorts, learnerCount, commChannels, nextDate, nextEvent, healthNote, waitlist, applicants).

**Why:** Avoids importing HEALTH into ContextPanel; keeps health data co-located with the map that owns it.

**How to apply:** New operational fields → add to HEALTH in ProgramMap.tsx, add renderer section in ContextPanel type === 'program' branch.
