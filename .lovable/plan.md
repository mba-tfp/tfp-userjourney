## Add gap lines to journey seed data

Append new `exists: false` lines to each of the 11 stages in `src/lib/journey-data.ts`. Existing lines, stages, tags, and structure remain untouched.

### Where the change lands

The seed data is built from `sourceRows` in `src/lib/journey-data.ts`. Rather than reshape that table, I'll append the new gap lines directly inside the `stages.forEach(...)` builder loop after the existing `sourceRows` lines are pushed — keeping the original data structure intact and isolating the additions in one block.

### Tag assignment (using existing tags only: Patient, Clinic, TFP, Channel)

Each new item gets one tag based on who owns/operates the missing capability:

- **Stage 1** — HCP hub → Channel; Pre-referral education → Patient; Fertility preservation tool → Patient
- **Stage 2** — Success calculator → Patient; Cost estimator → Patient; Competitor comparison → TFP
- **Stage 3** — HCP referral portal → Channel; Self-referral smart intake → Patient; Cross-clinic lookup → Clinic
- **Stage 4** — Smart form routing → Patient; REI waitlist visibility → Patient; Partner onboarding → Patient
- **Stage 5** — Lab results to portal → Patient; Automated requisition dispatch → Clinic; Plain-language interpretation → Patient
- **Stage 6** — Self-serve booking → Patient; GP notification → Channel; Pre-consult checklist → Patient
- **Stage 7** — Pre-consult AI summary → Clinic; Post-consult summary → Patient; FertiWise integrated → TFP
- **Stage 8** — Cycle calendar → Patient; Funded waitlist visibility → Patient; Medication delivery → Channel; Financial planning tool → Patient
- **Stage 9** — Proactive embryo updates → Patient; Emotional support pathway → Patient; Funded vs private segmentation → Clinic
- **Stage 10** — Post-outcome pathway → Patient; Mental health referral automation → Patient; OB handoff letter → Channel; OttoPulse post-outcome NPS → TFP
- **Stage 11** — Cryo renewal reminders → Patient; Re-entry pathway → Patient; Long-term HCP engagement → Channel; Sibling cycle fast-track → Patient

### Technical detail

In `src/lib/journey-data.ts`, after the existing `stages.forEach((stage, si) => { ... })` block, add a parallel mapping `EXTRA_GAPS: Array<Array<{ text: string; tagName: 'Patient'|'Clinic'|'TFP'|'Channel' }>>` indexed by stage index (0–10), then loop and push each entry into `lines[stage.id]` with `exists: false`, `tagIds: [TAG_BY_NAME[tagName]]`, and a unique id continuing the per-stage counter.

No UI, store, route, or component changes. The roadmap automatically renders the new lines under "What Doesn't Exist Today" via existing logic.

### Out of scope

No new tags, no stage edits, no edits to existing lines, no schema/store changes.