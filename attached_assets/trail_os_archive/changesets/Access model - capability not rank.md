# Access model — capability, not rank

**Status:** proposed. Needs a ruling before the coach and learner views are designed.
**Trigger:** a user can hold more than one Google group — Penny Admin and Platform Admin.

---

## What the code does today

Access is a single value from a four-item ordered list, and permission is an index comparison:
higher index means more access. Every user holds exactly one rung.

The three production groups map onto that ladder:

| Google group | Tier | How the config describes it |
|---|---|---|
| `trailosusers` | everyday | "Program team, coaches, and coordinators" |
| `trailospennyadmin` | power | "Penny governors and AI operations" |
| `trailosadmin` | admin | "System integrators and platform operators" |
| *(email whitelist)* | superadmin | "Platform builder" |

## Why that is the wrong shape

**Penny governance and platform integration are not levels of the same thing.** They are two
different domains of authority. Stacking them means:

- A system integrator automatically governs prompt quality, source trust and Penny analytics —
  because admin sits above power on the ladder.
- A Penny governor automatically gets Slack configuration, Drive configuration, Knowledge sources,
  Operations scorecards and Programs standards — because those are all gated at power.

Neither of those follows from the role. The ladder is granting authority by proximity rather than by
purpose.

**And a user in both groups cannot be represented at all.** The tier is one value; dual membership
has to collapse to one rung, so either the person loses authority they hold or gains authority they
do not.

**Two more things worth knowing while we are here.** The configuration file states plainly that the
prototype default is Super Admin and that no URL-level access enforcement exists yet — so none of
this is currently enforced, which is why the problem has not bitten. And the `everyday` tier's own
description is "Program team, coaches, and coordinators", with Penny access described as "learner
outcomes and program progress only". Coaches are Everyday users today. A thin coach view already
exists by accident.

---

## Proposed model — three independent axes

None of these is a level of another. A single enum cannot carry any two of them.

### 1. Surface — which product you are using

`staff` · `coach` · `learner`

Not a rank. A learner is not less than a coach; they are using a different thing. This is the axis
the new views sit on, and it is the one Google groups should drive most directly.

A person can legitimately hold more than one: an Assistant Coach drawn from Explorer's Trail is a
coach *and* a learner, which is exactly the case the ladder cannot express.

### 2. Domain authority — what you may govern

`penny` · `platform` · `programs` · `knowledge`

Independent and additive. Each is held or not held. Someone may govern Penny and nothing else.
Someone may govern the platform and not Penny. Both are reasonable and neither is "more".

Within a domain there is a genuine level — read, operate, configure — and that is a real ladder,
just a short one scoped to its own domain.

### 3. Coach level — how a verdict is weighted

`assistant` · `associate` · `advanced`

Affects calibration, not access. Two coaches at different levels may see identical screens while
their verdicts carry different weight in the rework curve. This is the axis Kim's measurement
dashboard needs, and it is invisible to the permission system.

---

## What this changes in practice

**Permission checks stop being an index comparison** and become a question about a grant: does this
person hold this authority in this domain, at this level. The current single-value check cannot
express that.

**The tier can survive as a display convenience** — derived from grants, shown in the interface,
used in the existing labels — so nothing has to be rewritten at once. But it stops being the thing
decisions are made on.

**The permission matrix needs rebuilding.** It currently documents eleven personas against four
tiers. Against three axes it becomes a different document, and a more honest one: it would show that
two people described as "Admin" today may hold quite different authority.

**The Google groups need revisiting.** Three groups cannot express three axes. Whether that means
more groups, or groups mapped to grants rather than tiers, is the decision to take.

---

## Why now

Nothing is enforced yet and the coach and learner views are not built. This is the cheapest moment
this decision will ever be available.

If the views are built on the tier ladder, the coach ladder gets bolted on as a fourth rung, a
learner becomes "below everyday", and the model calcifies at exactly the point it starts carrying
real permissions.

---

## Also noticed

The tier configuration file assigns each tier a color — emerald, violet and amber — with full class
strings. The color sweep converted the pages but this file sits in configuration rather than pages
and appears to have been missed. Worth folding into the next pass; the amber one matters, since it
puts a non-action amber on any screen showing a tier badge.
