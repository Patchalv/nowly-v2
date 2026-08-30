---
name: Factory ticket
about: Work for the dark-factory to pick up autonomously
title: ''
labels: ''
assignees: ''
---

<!--
  Delete every comment block before saving. They are notes to you, not to the agent.

  Add the `state:ready` label when you want a run to start. Nothing happens
  without it.

  Two sections are STRUCTURALLY REQUIRED and intake rejects the ticket without
  them, before any model is called:

    1. Prose above the "## Acceptance criteria" heading. At least one line that
       is not a heading and not a bullet. A ticket that is only bullets fails.
    2. A "## Acceptance criteria" heading with at least one line under it,
       before the next heading of any kind.

  A bold line on its own (**like this**) counts as a heading, so do not put one
  between the heading and its first criterion.
-->

## Goal

<!--
  What you want to be true afterwards, in a few sentences of plain prose.
  Write the OUTCOME, not the implementation — the agent reads the repository
  and plans the how. Say why it matters if that constrains the answer.

  Intake rejects a ticket with no edge. "Improve performance" and "modernise
  the codebase" are unfinishable. "Cut the /today route's first paint below
  1.5s on a cold cache" is not.
-->

## Acceptance criteria

<!--
  THE MOST IMPORTANT SECTION. It is what the reviewer judges the diff against,
  and the reviewer sees only this ticket, the published plan, and the diff — it
  cannot see the agent's reasoning. Vague criteria produce a reviewer that
  cannot approve, which burns review rounds and escalates to you.

  Each one observable: something a person could check by looking, running a
  command, or clicking. Not "works well" — "returns 400 with { error } when the
  date is in the past".
-->

- [ ]
- [ ]
- [ ]

## Out of scope

<!--
  Optional but high value. The agent escalates on material choices, and every
  escalation costs you a round trip. Naming what NOT to touch prevents a plan
  that reaches too far and a reviewer that flags reasonable restraint.

  Delete the heading if you have nothing to say. An empty section is noise.
-->

-

## Notes

<!--
  Optional. Anything that saves a round trip:

    - Files or components you already know are involved
    - A decision already made, so the agent does not ask ("use the existing
      useTasks hook, do not add a data layer")
    - Links to a design, a Supabase table, a previous PR
    - Anything you would say in the first review comment anyway

  This repo has no test suite. If a change is worth a test, say so here —
  otherwise the agent will not add a framework on its own.
-->
