export type Tag = { id: string; name: string; color: string };

export type Line = {
  id: string;
  text: string;
  tagIds: string[];
  exists: boolean;
  // Per-line value tag(s): Capacity / Revenue / Cost (and any user-added).
  // Replaces the prior stage-level valueTagIds.
  valueTagIds?: string[];
  // Per-line "money on fire" flag. Replaces the prior stage-level onFire.
  onFire?: boolean;
  // Prioritization scores (1–5) used in the quadrant view. Optional —
  // auto-seeded by the store on load when missing.
  impact?: number;
  urgency?: number;
  effort?: number;
};

export type Stage = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  valueTagIds: string[];
  onFire?: boolean;
};

export type JourneyDoc = {
  title: string;
  stages: Stage[];
  tags: Tag[];
  valueTags: Tag[];
  lines: Record<string, Line[]>; // lines[stageId] = ordered Line[]
};

const uid = (p: string, i: number) => `${p}-${i}`;

export const newId = (p: string) =>
  `${p}-${Math.random().toString(36).slice(2, 8)}`;

// Value tags (editable registry; seeded with the original Capacity/Revenue/Cost set)
export const VALUE_TAG_IDS = {
  capacity: "vt-capacity",
  revenue: "vt-revenue",
  cost: "vt-cost",
} as const;

const valueTagSeed: Tag[] = [
  { id: VALUE_TAG_IDS.capacity, name: "Capacity", color: "teal" },
  { id: VALUE_TAG_IDS.revenue, name: "Revenue", color: "blue" },
  { id: VALUE_TAG_IDS.cost, name: "Cost", color: "amber" },
];

// Original indexes (0-based) that were flagged "money on fire"
const ON_FIRE_INDEXES = new Set([2, 5, 8, 9, 10]);

type StageSeed = Omit<Stage, "id" | "valueTagIds" | "onFire"> & {
  value: keyof typeof VALUE_TAG_IDS;
};
const stageDefs: StageSeed[] = [
  { emoji: "🔍", title: "Awareness & Discovery", subtitle: "Pre-referral, website, GP search", value: "capacity" },
  { emoji: "🤔", title: "Consideration & Comparison", subtitle: "Evaluating TFP vs. competitors", value: "revenue" },
  { emoji: "📇", title: "Referral & Conversion", subtitle: "HCP sends referral; patient first contacted", value: "cost" },
  { emoji: "📋", title: "Intake & Onboarding", subtitle: "Health history forms completed", value: "capacity" },
  { emoji: "🧪", title: "Pre-Diagnostic Testing", subtitle: "Blood work, ultrasound, semen analysis", value: "cost" },
  { emoji: "📅", title: "Notify & Schedule", subtitle: "Consult booked; patient prepared", value: "revenue" },
  { emoji: "🩺", title: "Physician Consult", subtitle: "REI consult; results & care plan discussed", value: "capacity" },
  { emoji: "💊", title: "Care Planning & Readiness", subtitle: "Treatment plan set; patient prepares for cycle", value: "capacity" },
  { emoji: "⏳", title: "The Wait (Lab & 2-Week)", subtitle: "Egg retrieval; embryo culture; 2WW", value: "revenue" },
  { emoji: "🔄", title: "Outcome & Transition", subtitle: "Pregnancy result; OB handoff or next steps", value: "revenue" },
  { emoji: "♻️", title: "Continuity of Care", subtitle: "Cryo storage, re-entry, long-term support", value: "revenue" },
];

const stages: Stage[] = stageDefs.map(({ value, ...rest }, i) => ({
  ...rest,
  id: uid("s", i + 1),
  valueTagIds: [VALUE_TAG_IDS[value]],
  onFire: ON_FIRE_INDEXES.has(i),
}));

// Helper: per-stage value tag (copied onto every line of that stage so the
// previously-column-level value tag is now expressed on each line).
const stageValueTagId: Record<string, string> = {};
stageDefs.forEach((def, i) => {
  stageValueTagId[stages[i].id] = VALUE_TAG_IDS[def.value];
});

// Tag palette (semantic-ish; works in light theme)
export const TAG_COLORS = [
  "slate",
  "blue",
  "teal",
  "amber",
  "rose",
  "violet",
  "emerald",
  "fuchsia",
] as const;
export type TagColor = (typeof TAG_COLORS)[number];

const tagDefs: { name: string; color: TagColor }[] = [
  { name: "Patient", color: "rose" },
  { name: "Clinic", color: "amber" },
  { name: "TFP", color: "blue" },
  { name: "Channel", color: "violet" },
  { name: "Bloomic", color: "violet" },
];
const tags: Tag[] = tagDefs.map((t, i) => ({ id: uid("t", i + 1), ...t }));
const TAG_BY_NAME: Record<string, string> = Object.fromEntries(
  tags.map((t) => [t.name, t.id]),
);

// Per-source rows: [tagName, lines per stage]
type SourceLine = { text: string; gap?: boolean };
const sourceRows: { tagName: string; rows: SourceLine[][] }[] = [
  {
    tagName: "What Exists Today",
    rows: [
      [{ text: "Clinic website" }, { text: "Blog & social" }, { text: "Paid ads" }],
      [{ text: "GA4 analytics (limited)" }],
      [{ text: "Otto Onboard (form foundation)" }, { text: "Felix fax routing (partial)" }],
      [
        { text: "Otto Onboard ✓" },
        { text: "Otto Engage — SMS/email reminders ✓" },
        { text: "No REI consult waitlist", gap: true },
      ],
      [{ text: "Otto Engage (task reminders) ✓" }, { text: "Otto Pulse (partial rollout)" }],
      [
        { text: "Medeo (selected clinics only)", gap: true },
        { text: "No online self-serve booking", gap: true },
      ],
      [
        { text: "Otto Notes ✓" },
        { text: "Otto Pulse — 1st appt (in dev)" },
        { text: "EngageMD consent ✓" },
        { text: "Pre-consult AI summary (built, not activated everywhere)" },
      ],
      [
        { text: "EngageMD education library ✓" },
        { text: "EngageMD consent ✓" },
        { text: "FertiWISE — not live yet" },
      ],
      [
        { text: "Nothing. Complete gap.", gap: true },
        { text: "No waitlist for private, funded OFP, or regular coverage cycles", gap: true },
      ],
      [{ text: "Otto Pulse NPS (live — gradual rollout)" }, { text: "EngageMD consent (live)" }],
      [{ text: "Nothing. Stage completely uncovered.", gap: true }],
    ],
  },
  {
    tagName: "Patient",
    rows: [
      [{ text: "No digital resource. Overwhelmed — unclear what to do beyond treatment." }],
      [{ text: "Research on Google, Reddit, TikTok. Fears and myths unaddressed. No pre-TFP guidance." }],
      [{ text: "Unclear why questions are asked. Form too long — drops off. Calls clinic: 'do I need this?'" }],
      [
        { text: "No REI waitlist visibility — calls clinic repeatedly for status." },
        { text: "No waitlist position or ETA shown digitally.", gap: true },
      ],
      [{ text: "Sent back to GP. Unclear next step. Feels dismissed by the system." }],
      [{ text: "Doesn't know wait time or how to prepare. Emotionally high-stakes, information gap." }],
      [{ text: "20 min repeating history already submitted. FertiWISE rarely offered. No post-consult summary." }],
      [{ text: "No cycle calendar or financial tool. Education materials sent but not used. No funded waitlist clarity. No visibility on cycle waitlist position or funding type" }],
      [
        { text: "Calls clinic daily on fertilisation results. Turns to forums. Feels alone." },
        { text: "No funded waitlist visibility — unsure of private vs. OFP wait.", gap: true },
      ],
      [{ text: "No structured support after bad news. Emotional low point — no outreach from TFP." }],
      [{ text: "No renewal reminders. Unsure when to return. Likely goes elsewhere or gives up." }],
    ],
  },
  {
    tagName: "Clinic",
    rows: [
      [{ text: "Repetitive inbound calls on referral, timelines, treatment. No self-serve info." }],
      [{ text: "Same questions daily: success rates, cost, insurance. No website behaviour visibility." }],
      [{ text: "Fax → manual data entry. No priority logic. No cross-clinic patient lookup." }],
      [{ text: "Admin chases patients to submit forms. No drop-off visibility. No REI consult waitlist No REI visit type REI coverage gaps, Booking optimisation absent no cross-location training or coverage." }],
      [{ text: "Admin manually bridges referral gaps — calls patient, Rocket Doctor, HCP. Contractors can't be directed." }],
      [{ text: "Consult scheduling manual. Waits: 5 wks–3 mo (RCC); 18–22 mo funded IVF (OFC)." }],
      [{ text: "Otto Notes can't push to EMR — manual copy-paste. FertiWISE inconsistently shown. No post-consult follow-up." }],
      [{ text: "Reminder calls manual. Pharmacy coordination inconsistent. Low education adoption — no visibility why." }],
      [
        { text: "Nursing flooded with status calls. No proactive comms infrastructure." },
        { text: "No waitlist segmented by funding type (private / OFP / coverage).", gap: true },
      ],
      [{ text: "No systematic emotional support pathway. No mental health resources. No post-outcome automation." }],
      [{ text: "Cryo storage tracked manually. No renewal alerts. No tracking of return vs. churn." }],
    ],
  },
  {
    tagName: "TFP",
    rows: [
      [{ text: "52% of market in awareness. Website brochure — not lead-gen. Competitors capturing early patients." }],
      [{ text: "No lead attribution. Marketing spend blind to channel performance, quality, or CPL." }],
      [{ text: "Manual intake bottleneck. 30–41 day delays. 3,084 patients unregistered." }],
      [{ text: "Form completion: 53–84% by clinic. No smart triaging or routing." }],
      [{ text: "Different workflows per clinic. Leads lost. No unified referral tracking." }],
      [{ text: "No self-serve scheduling. No waitlist forecast. Funded wait driving defection to Create Fertility." }],
      [{ text: "~10 min wasted per consult. Heartland uses Scribery." }],
      [{ text: "Education ROI ≈ 0 if unused. No cycle calendar. No financial tool live. No funded waitlist." }],
      [{ text: "~30% churn after failed outcome. Nursing capacity consumed by repetitive status calls." }],
      [{ text: "Otto Pulse not capturing critical post-failure moment. 30% churn preventable with structured support." }],
      [{ text: "30% permanent churn. Repeat cycle $5K-× 2-3 = major LTV loss. Re-entry rate 40% vs. 60% target." }],
    ],
  },
  {
    tagName: "Channel",
    rows: [
      [{ text: "No TFP resource hub for HCPs. No pre-referral content to share with patients." }],
      [{ text: "No HCP co-marketing or knowledge hub. Patients deciding without TFP-sourced info." }],
      [{ text: "No feedback loop. HCP doesn't know when patient seen or outcome → refers to competitor." }],
      [{ text: "Rocket Doctor & Tia Health gaps derail bookings. Contractors can't be directed." }],
      [{ text: "Rocket Doctor: rigid same-day booking. Tia Health: patient selects time, TFP has no direct relationship." }],
      [{ text: "No automated GP notification when consult booked. Referring HCP still in the dark." }],
      [{ text: "GP gets no post-consult feedback. No structured TFP → HCP communication." }],
      [{ text: "No pharmacy integration. Medication delivery inconsistent. No specialty pharmacy relationship." }],
      [{ text: "No lab-to-patient update pathway. Embryology call-back timing inconsistent." }],
      [{ text: "GP not notified of outcome. No TFP → HCP post-result loop." }],
      [{ text: "No long-term HCP engagement. High-value referrers not identified or nurtured." }],
    ],
  },
];

const lines: Record<string, Line[]> = {};
stages.forEach((stage, si) => {
  const stageLines: Line[] = [];
  let counter = 1;
  sourceRows.forEach(({ tagName, rows }) => {
    const tagId = TAG_BY_NAME[tagName];
    const sourceLines = rows[si] ?? [];
    sourceLines.forEach((sl) => {
      stageLines.push({
        id: uid(`${stage.id}-ln`, counter++),
        text: sl.text,
        tagIds: tagId ? [tagId] : [],
        exists: !sl.gap,
        valueTagIds: [stageValueTagId[stage.id]],
      });
    });
  });
  lines[stage.id] = stageLines;
});

// Additional "doesn't exist today" gap lines per stage. Appended after the
// source rows so existing data is untouched.
type ExtraGap = { text: string; tagName: "Patient" | "Clinic" | "TFP" | "Channel" };
const EXTRA_GAPS: ExtraGap[][] = [
  // Stage 1 — Awareness & Discovery
  [
    { text: "HCP resource hub: TFP-branded page referring physicians can share with patients before the referral is sent.", tagName: "Channel" },
    { text: "Pre-referral patient education pathway: condition-specific content (PCOS, MFI, unexplained) delivered before the patient contacts TFP.", tagName: "Patient" },
    { text: "Fertility preservation decision tool for oncology patients, egg freezing candidates, and social freezing inquiries.", tagName: "Patient" },
  ],
  // Stage 2 — Consideration & Comparison
  [
    { text: "Success rate calculator by patient profile: age, diagnosis, prior treatment.", tagName: "Patient" },
    { text: "Cost and coverage estimator: what is covered and what is out of pocket by province.", tagName: "Patient" },
    { text: "Competitor comparison tool (internal) for clinic staff to answer 'why TFP'.", tagName: "TFP" },
  ],
  // Stage 3 — Referral & Conversion
  [
    { text: "HCP referral portal: structured digital referral submission replacing fax, with status tracking for the referring physician.", tagName: "Channel" },
    { text: "Self-referral smart intake: triage questions that route the patient before they speak to a coordinator.", tagName: "Patient" },
    { text: "Cross-clinic patient lookup: check if this patient is already in the TFP network at another clinic.", tagName: "Clinic" },
  ],
  // Stage 4 — Intake & Onboarding
  [
    { text: "Smart form routing: show only questions relevant to the patient profile — no full 40-question form for a semen analysis patient.", tagName: "Patient" },
    { text: "REI consult waitlist with patient-facing position visibility.", tagName: "Patient" },
    { text: "Dedicated partner onboarding flow, separate from the primary patient.", tagName: "Patient" },
  ],
  // Stage 5 — Pre-Diagnostic Testing
  [
    { text: "Lab result delivery to the patient portal before the consult.", tagName: "Patient" },
    { text: "Automated requisition dispatch: requisition generated in EMR and pushed to patient portal without manual nurse upload.", tagName: "Clinic" },
    { text: "Result interpretation plain-language summary explaining what the result means.", tagName: "Patient" },
  ],
  // Stage 6 — Notify & Schedule
  [
    { text: "Online self-serve booking for first consult.", tagName: "Patient" },
    { text: "Automated GP notification when a consult is booked.", tagName: "Channel" },
    { text: "Pre-consult preparation checklist sent to patient automatically after booking.", tagName: "Patient" },
  ],
  // Stage 7 — Physician Consult
  [
    { text: "Pre-consult AI summary surfaced to physician before they enter the room: health history, prior labs, patient-stated concerns.", tagName: "Clinic" },
    { text: "Post-consult automated summary sent to the patient after the appointment.", tagName: "Patient" },
    { text: "FertiWise integrated into the consult flow so every patient gets a success probability discussion.", tagName: "TFP" },
  ],
  // Stage 8 — Care Planning & Readiness
  [
    { text: "Digital cycle calendar: patient sees their protocol day by day.", tagName: "Patient" },
    { text: "Funded waitlist visibility: patient sees their position on OFP or provincial funding queue.", tagName: "Patient" },
    { text: "Medication delivery integration with specialty pharmacy.", tagName: "Channel" },
    { text: "Financial planning tool: total cycle cost, payment plan options, and grant eligibility.", tagName: "Patient" },
  ],
  // Stage 9 — The Wait
  [
    { text: "Proactive fertilization and embryo development updates pushed to the patient portal, eliminating daily status calls to the clinic.", tagName: "Patient" },
    { text: "Emotional support pathway: automated check-in, mental health resource links, and peer support community.", tagName: "Patient" },
    { text: "Funded vs private cycle waitlist segmentation so patients know exactly where they stand.", tagName: "Clinic" },
  ],
  // Stage 10 — Outcome & Transition
  [
    { text: "Structured post-outcome pathway: whether positive or negative, a defined next step is automatically triggered.", tagName: "Patient" },
    { text: "Mental health referral automation triggered after a failed cycle.", tagName: "Patient" },
    { text: "OB handoff letter generated in Otto-Notes and sent automatically on positive outcome.", tagName: "Channel" },
    { text: "OttoPulse post-outcome NPS capturing the most critical patient feedback moment.", tagName: "TFP" },
  ],
  // Stage 11 — Continuity of Care
  [
    { text: "Cryo storage renewal reminders: automated annual notification before embryos are discarded.", tagName: "Patient" },
    { text: "Re-entry pathway: returning patient skips redundant intake steps and picks up where they left off.", tagName: "Patient" },
    { text: "Long-term HCP engagement: high-referral physicians identified and nurtured with outcome data.", tagName: "Channel" },
    { text: "Sibling cycle fast-track: streamlined re-entry for patients returning for a second child.", tagName: "Patient" },
  ],
];

stages.forEach((stage, si) => {
  const extras = EXTRA_GAPS[si] ?? [];
  let counter = (lines[stage.id]?.length ?? 0) + 1;
  extras.forEach((eg) => {
    const tagId = TAG_BY_NAME[eg.tagName];
    lines[stage.id].push({
      id: uid(`${stage.id}-gap`, counter++),
      text: eg.text,
      tagIds: tagId ? [tagId] : [],
      exists: false,
      valueTagIds: [stageValueTagId[stage.id]],
    });
  });
});

// Top-of-stage TFP impact statements for the five "money on fire" stages.
// Prepended so they render as the first line in each gap cell. Exported for
// the store migration to apply to already-stored docs.
export const FIRE_GAP_LINES: ReadonlyArray<{ stageIndex: number; text: string }> = [
  {
    stageIndex: 4, // Stage 5 — Pre-Diagnostic Testing
    text: "~30-day delay between referral and first diagnostic result. Every week of delay is a week the patient considers a competitor.",
  },
  {
    stageIndex: 5, // Stage 6 — Notify & Schedule
    text: "No self-serve booking means a coordinator call is required for every new patient. At 40+ new patients per week network-wide, that is 2,000+ manual booking calls per year.",
  },
  {
    stageIndex: 8, // Stage 9 — The Wait
    text: "30% of patients who experience a failed outcome do not return. At an average cycle value of $15,000-$25,000 CAD, each prevented churn event is worth $15K-$25K in recovered LTV.",
  },
  {
    stageIndex: 9, // Stage 10 — Outcome & Transition
    text: "No structured post-outcome pathway means TFP has no touchpoint at the most emotionally significant moment in the patient journey. This is the single highest-leverage retention intervention available.",
  },
  {
    stageIndex: 10, // Stage 11 — Continuity of Care
    text: "Re-entry rate is currently 40% against a 60% target. Closing that gap across the network represents the highest-ROI growth lever that does not require acquiring a single new patient.",
  },
];

const tfpTagId = TAG_BY_NAME["TFP"];
if (tfpTagId) {
  for (const fg of FIRE_GAP_LINES) {
    const stage = stages[fg.stageIndex];
    if (!stage) continue;
    lines[stage.id] = [
      {
        id: uid(`${stage.id}-fire`, 1),
        text: fg.text,
        tagIds: [tfpTagId],
        exists: false,
        onFire: true,
        valueTagIds: [stageValueTagId[stage.id]],
      },
      ...(lines[stage.id] ?? []),
    ];
  }
}

// Apply the Bloomic tag to any gap line whose text matches one of the
// Bloomic-owned capabilities (online booking, intake forms, triage, consents,
// cycle planning, patient portal, surveys/ratings, basic reminders). Exported
// so the store migration can apply the same set to already-stored docs.
export const BLOOMIC_LINE_TEXTS: ReadonlySet<string> = new Set([
  // Existing gap lines from sourceRows
  "No REI consult waitlist",
  "No waitlist position or ETA shown digitally.",
  "No online self-serve booking",
  "Medeo (selected clinics only)",
  "No waitlist for private, funded OFP, or regular coverage cycles",
  "No funded waitlist visibility — unsure of private vs. OFP wait.",
  "No waitlist segmented by funding type (private / OFP / coverage).",
  // EXTRA_GAPS lines
  "Self-referral smart intake: triage questions that route the patient before they speak to a coordinator.",
  "Smart form routing: show only questions relevant to the patient profile — no full 40-question form for a semen analysis patient.",
  "REI consult waitlist with patient-facing position visibility.",
  "Dedicated partner onboarding flow, separate from the primary patient.",
  "Lab result delivery to the patient portal before the consult.",
  "Automated requisition dispatch: requisition generated in EMR and pushed to patient portal without manual nurse upload.",
  "Online self-serve booking for first consult.",
  "Pre-consult preparation checklist sent to patient automatically after booking.",
  "Post-consult automated summary sent to the patient after the appointment.",
  "Digital cycle calendar: patient sees their protocol day by day.",
  "Funded waitlist visibility: patient sees their position on OFP or provincial funding queue.",
  "Proactive fertilization and embryo development updates pushed to the patient portal, eliminating daily status calls to the clinic.",
  "Funded vs private cycle waitlist segmentation so patients know exactly where they stand.",
  "OttoPulse post-outcome NPS capturing the most critical patient feedback moment.",
  "Re-entry pathway: returning patient skips redundant intake steps and picks up where they left off.",
  "Sibling cycle fast-track: streamlined re-entry for patients returning for a second child.",
]);

export const BLOOMIC_TAG_NAME = "Bloomic";
const bloomicTagId = TAG_BY_NAME[BLOOMIC_TAG_NAME];
if (bloomicTagId) {
  for (const stage of stages) {
    for (const line of lines[stage.id] ?? []) {
      if (line.exists) continue;
      if (!BLOOMIC_LINE_TEXTS.has(line.text.trim())) continue;
      if (!line.tagIds.includes(bloomicTagId)) line.tagIds.push(bloomicTagId);
    }
  }
}

// Additional lens-row commentary lines appended to existing stages. These are
// "exists: true" lens entries (Patient/Clinic/TFP/Channel) — not gaps —
// appended after the seed content. Exported so the store migration can apply
// the same set to already-stored docs (idempotent by exact text match).
export const ADDITIONAL_LENS_LINES: ReadonlyArray<{
  stageIndex: number;
  tagName: "Patient" | "Clinic" | "TFP" | "Channel";
  text: string;
}> = [
  // Stage 1 — Awareness & Discovery
  { stageIndex: 0, tagName: "TFP", text: "52% of market in awareness only. Website is a brochure, not a lead-generation tool. Competitors capturing early patients." },
  { stageIndex: 0, tagName: "TFP", text: "Marketing spend blind to channel performance, quality, and cost per lead." },
  // Stage 2 — Consideration & Comparison
  { stageIndex: 1, tagName: "TFP", text: "No lead attribution. Marketing blind to which channels drive quality patient inquiries." },
  // Stage 3 — Referral & Conversion
  { stageIndex: 2, tagName: "TFP", text: "30 to 41 day intake delays. 3,084 patients unregistered and stalled in the funnel." },
  { stageIndex: 2, tagName: "Channel", text: "No feedback loop to HCP. Referring physician never learns when patient was seen or what the outcome was. Drives referrals to competitors." },
  // Stage 4 — Intake & Onboarding
  { stageIndex: 3, tagName: "TFP", text: "Form completion rate varies 53 to 84% across clinics. No enterprise visibility into why." },
  { stageIndex: 3, tagName: "Clinic", text: "No REI visit type tracking. Consult mix is invisible to management." },
  { stageIndex: 3, tagName: "Clinic", text: "REI leave not coordinated across locations. Cancellations occur when no cover arranged." },
  { stageIndex: 3, tagName: "Clinic", text: "Each location runs its own intake model. No cross-site standard or training." },
  // Stage 5 — Pre-Diagnostic Testing
  { stageIndex: 4, tagName: "Clinic", text: "Admin manually bridges referral gaps by calling the patient, Rocket Doctor, and the referring HCP. Contractors cannot be directed." },
  { stageIndex: 4, tagName: "Channel", text: "Rocket Doctor uses rigid same-day booking. Tia Health lets the patient select the time but TFP has no direct relationship with the platform." },
  // Stage 6 — Notify & Schedule
  { stageIndex: 5, tagName: "TFP", text: "Funded wait times driving patient defection to Create Fertility." },
  { stageIndex: 5, tagName: "Clinic", text: "Consult scheduling fully manual. Wait times: 5 weeks to 3 months at RCC, 18 to 22 months for funded IVF at OFC." },
  { stageIndex: 5, tagName: "TFP", text: "No waitlist forecast. Capacity planning done manually or not at all." },
  // Stage 7 — Physician Consult
  { stageIndex: 6, tagName: "TFP", text: "Approximately 10 minutes wasted per consult on manual note handling. Heartland currently uses Scribery instead of Otto-Notes." },
  { stageIndex: 6, tagName: "Clinic", text: "FertiWise inconsistently shown to patients. Success probability discussion happens at physician discretion only." },
  // Stage 8 — Care Planning & Readiness
  { stageIndex: 7, tagName: "TFP", text: "Education investment returns near zero when materials go unused. No visibility into whether patients engage with EngagedMD content." },
  { stageIndex: 7, tagName: "Patient", text: "No visibility on cycle waitlist position or funding type. Patient does not know if they are on a private, OFP, or provincial coverage queue." },
  // Stage 9 — The Wait
  { stageIndex: 8, tagName: "TFP", text: "Nursing capacity consumed by repetitive status calls. No proactive communication infrastructure to reduce inbound volume." },
  { stageIndex: 8, tagName: "Clinic", text: "No waitlist segmented by funding type: private, OFP, and provincial coverage patients all in the same queue with no differentiation." },
  // Stage 10 — Outcome & Transition
  { stageIndex: 9, tagName: "TFP", text: "30% churn after failed outcome is preventable with structured support. Otto Pulse not capturing feedback at this critical moment." },
  // Stage 11 — Continuity of Care
  { stageIndex: 10, tagName: "TFP", text: "30% permanent churn. Repeat cycle value $5K to $15K multiplied by 2 to 3 cycles per patient represents major unrecovered LTV." },
  { stageIndex: 10, tagName: "TFP", text: "Re-entry rate currently 40% against a 60% target. Closing that gap is the highest-ROI growth lever that requires no new patient acquisition." },
  { stageIndex: 10, tagName: "Clinic", text: "No tracking of return versus churn. No way to measure re-entry rate or identify patients who have quietly left the network." },
  // Round 2 — additional lens lines
  // Stage 1
  { stageIndex: 0, tagName: "Clinic", text: "No inbound referral source tracking. Staff cannot identify which GP or channel is sending the most patients." },
  { stageIndex: 0, tagName: "Clinic", text: "No staff-facing FAQ or standard script for common inbound questions. Every coordinator answers differently." },
  // Stage 2
  { stageIndex: 1, tagName: "Clinic", text: "No standard response protocol for cost, success rate, or insurance questions. Clinic staff improvise every time." },
  // Stage 3
  { stageIndex: 2, tagName: "Clinic", text: "Fax triage is entirely manual. One coordinator can spend 2 to 3 hours per day processing incoming referral faxes." },
  { stageIndex: 2, tagName: "Clinic", text: "Duplicate patient detection does not exist. The same patient can be registered multiple times across clinics with no flag." },
  { stageIndex: 2, tagName: "TFP", text: "No prioritization logic on referrals. Urgent cases such as oncofertility and advanced maternal age sit in the same queue as standard referrals." },
  // Stage 4
  { stageIndex: 3, tagName: "Clinic", text: "No coordinator workload visibility. Supervisors cannot see how many active patients each coordinator is managing." },
  { stageIndex: 3, tagName: "Clinic", text: "No automated follow-up for incomplete forms. Staff manually chase every patient who did not finish." },
  { stageIndex: 3, tagName: "TFP", text: "No clinic-to-clinic patient transfer workflow. Moving a patient between TFP locations requires full manual re-entry." },
  // Stage 5
  { stageIndex: 4, tagName: "Clinic", text: "Lab results arrive by fax and are manually filed into the EMR. No automated routing or extraction." },
  { stageIndex: 4, tagName: "Clinic", text: "No standard protocol for pre-consult test ordering. Each physician orders differently with no network standard." },
  { stageIndex: 4, tagName: "TFP", text: "No tracking of which patients have completed pre-diagnostic workup. Coordinator has to check each chart manually." },
  // Stage 6
  { stageIndex: 5, tagName: "Clinic", text: "No automated recall system. Patients who cancel or do not book are not followed up systematically." },
  { stageIndex: 5, tagName: "Clinic", text: "No network-wide physician availability view. Scheduling staff cannot see a cross-location calendar." },
  { stageIndex: 5, tagName: "TFP", text: "Physician schedule changes communicated informally by email or Teams. No system-driven notification to affected patients." },
  // Stage 7
  { stageIndex: 6, tagName: "Clinic", text: "No post-consult task automation. Coordinator manually determines next steps from the physician's verbal handoff after each consult." },
  { stageIndex: 6, tagName: "Clinic", text: "Consult letters reviewed and sent manually by transcriptionists with no workflow tracking for letter status or send confirmation." },
  { stageIndex: 6, tagName: "TFP", text: "No visibility into consult-to-treatment conversion rate per physician. High and low converters are invisible to management." },
  // Stage 8
  { stageIndex: 7, tagName: "Clinic", text: "Medication protocol communicated to patients verbally or by email. No digital protocol delivery or patient acknowledgment tracking." },
  { stageIndex: 7, tagName: "Clinic", text: "Pharmacy coordination handled by individual nurses with no standardized workflow or preferred pharmacy relationship." },
  { stageIndex: 7, tagName: "TFP", text: "Cycle start dates coordinated manually across nursing, physician, and lab. No shared cycle planning calendar." },
  // Stage 9
  { stageIndex: 8, tagName: "Clinic", text: "No standard for how often nurses proactively contact patients during the two-week wait. Each nurse handles it differently." },
  { stageIndex: 8, tagName: "Clinic", text: "Embryology update calls made individually by embryologists with no logging. No record of what was communicated or when." },
  { stageIndex: 8, tagName: "TFP", text: "No dashboard showing how many patients are currently in the wait phase across the network. Capacity planning is entirely reactive." },
  // Stage 10
  { stageIndex: 9, tagName: "Clinic", text: "Positive outcome handoff to OB is manual. No standard referral letter and no tracking of whether the patient engaged with the OB." },
  { stageIndex: 9, tagName: "Clinic", text: "Failed outcome follow-up depends entirely on the individual physician or nurse. No standard protocol or timeline exists." },
  { stageIndex: 9, tagName: "TFP", text: "No measurement of time between outcome communication and next clinical action. Speed of follow-up is invisible to management." },
  // Stage 11
  { stageIndex: 10, tagName: "Clinic", text: "Cryo storage consent renewal tracked in spreadsheets or not at all. No automated alert before consent lapses." },
  { stageIndex: 10, tagName: "Clinic", text: "No standard re-entry workflow for returning patients. They restart intake from scratch as if they are a new referral." },
  { stageIndex: 10, tagName: "TFP", text: "No identification of high-value returning patients for priority scheduling. Re-entry is treated identically to a new referral." },
];

for (const al of ADDITIONAL_LENS_LINES) {
  const stage = stages[al.stageIndex];
  if (!stage) continue;
  const tagId = TAG_BY_NAME[al.tagName];
  let counter = (lines[stage.id]?.length ?? 0) + 1;
  lines[stage.id].push({
    id: uid(`${stage.id}-add`, counter++),
    text: al.text,
    tagIds: tagId ? [tagId] : [],
    exists: true,
    valueTagIds: [stageValueTagId[stage.id]],
  });
}

export const seedDoc: JourneyDoc = {
  title: "otto Journey Map",
  stages,
  tags,
  valueTags: valueTagSeed,
  lines,
};