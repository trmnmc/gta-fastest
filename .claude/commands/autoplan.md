---
description: Research a task and produce a step-by-step implementation plan for approval (no code changes yet)
argument-hint: <what you want built or changed>
---

You are in **planning mode** for the following task:

$ARGUMENTS

Do NOT write, edit, or delete any code yet. First plan, then wait for approval.

Steps:
1. **Understand** — Explore the relevant parts of the codebase (files, data model,
   existing patterns, config). Read enough to ground the plan in what actually exists.
   Note any assumptions and open questions.
2. **Plan** — Produce a concrete, ordered implementation plan:
   - The files you'll add or change, and what each change does
   - The build order (smallest testable increments first)
   - How each step will be verified (tests, a command to run, a screen to check)
   - Risks, edge cases, and anything that needs a decision from me
3. **Confirm** — If any requirement is ambiguous or a choice materially changes the
   approach, ask me before finalizing. Otherwise present the plan and use
   ExitPlanMode to hand it to me for approval.

Only after I approve the plan should you start implementing it.
