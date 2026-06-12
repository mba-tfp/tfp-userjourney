export type CellLine = { text: string; gap?: boolean };
export type Cell = { lines: CellLine[] };
export type Stage = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  value?: "capacity" | "revenue" | "cost";
};
export type Lens = { id: string; name: string };
export type JourneyDoc = {
  title: string;
  stages: Stage[];
  lenses: Lens[];
  // cells[lensId][stageId] = Cell
  cells: Record<string, Record<string, Cell>>;
};

const uid = (p: string, i: number) => `${p}-${i}`;

const stageDefs: Omit<Stage, "id">[] = [
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

const stages: Stage[] = stageDefs.map((s, i) => ({ ...s, id: uid("s", i + 1) }));

const lensDefs = [
  "Sentiment",
  "What Exists Today",
  "Patient",
  "Clinic",
  "TFP",
  "Channel",
];
const lenses: Lens[] = lensDefs.map((n, i) => ({ id: uid("l", i + 1), name: n }));

// 6 lenses x 11 stages cell content. Each entry is array of lines; gap=true → red.
const rows: CellLine[][][] = [
  // Sentiment
  [
    [{ text: "😊 Hopeful" }],
    [{ text: "🤨 Evaluating" }],
    [{ text: "😿 Frustrated" }],
    [{ text: "😰 Overwhelmed" }],
    [{ text: "🙏 Uncertain" }],
    [{ text: "😌 Reassured" }],
    [{ text: "😟 Hopeful/Anxious" }],
    [{ text: "😀 Committed" }],
    [{ text: "😖 Most Vulnerable" }],
    [{ text: "❤️ Relief / Grief" }],
    [{ text: "🔁 Navigating Next" }],
  ],
  // What Exists Today
  [
    [{ text: "Clinic website" }, { text: "Blog & social" }, { text: "Paid ads" }],
    [{ text: "GA4 analytics (limited)" }],
    [{ text: "Otto Onboard (form foundation)" }, { text: "Felix fax routing (partial)" }],
    [
      { text: "Otto Onboard ✓" },
      { text: "Otto Engage — SMS/email reminders ✓" },
      { text: "✗ No REI consult waitlist", gap: true },
    ],
    [{ text: "Otto Engage (task reminders) ✓" }, { text: "Otto Pulse (partial rollout)" }],
    [
      { text: "Medeo (selected clinics only)", gap: true },
      { text: "✗ No online self-serve booking", gap: true },
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
      { text: "✗ Nothing. Complete gap.", gap: true },
      { text: "✗ No waitlist for private, funded OFP, or regular coverage cycles", gap: true },
    ],
    [{ text: "Otto Pulse NPS (live — gradual rollout)" }, { text: "EngageMD consent (live)" }],
    [{ text: "✗ Nothing. Stage completely uncovered.", gap: true }],
  ],
  // Patient
  [
    [{ text: "No digital resource. Overwhelmed — unclear what to do beyond treatment." }],
    [{ text: "Research on Google, Reddit, TikTok. Fears and myths unaddressed. No pre-TFP guidance." }],
    [{ text: "Unclear why questions are asked. Form too long — drops off. Calls clinic: 'do I need this?'" }],
    [
      { text: "No REI waitlist visibility — calls clinic repeatedly for status." },
      { text: "✗ No waitlist position or ETA shown digitally.", gap: true },
    ],
    [{ text: "Sent back to GP. Unclear next step. Feels dismissed by the system." }],
    [{ text: "Doesn't know wait time or how to prepare. Emotionally high-stakes, information gap." }],
    [{ text: "20 min repeating history already submitted. FertiWISE rarely offered. No post-consult summary." }],
    [{ text: "No cycle calendar or financial tool. Education materials sent but not used. No funded waitlist clarity. No visibility on cycle waitlist position or funding type" }],
    [
      { text: "Calls clinic daily on fertilisation results. Turns to forums. Feels alone." },
      { text: "✗ No funded waitlist visibility — unsure of private vs. OFP wait.", gap: true },
    ],
    [{ text: "No structured support after bad news. Emotional low point — no outreach from TFP." }],
    [{ text: "No renewal reminders. Unsure when to return. Likely goes elsewhere or gives up." }],
  ],
  // Clinic
  [
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
      { text: "✗ No waitlist segmented by funding type (private / OFP / coverage).", gap: true },
    ],
    [{ text: "No systematic emotional support pathway. No mental health resources. No post-outcome automation." }],
    [{ text: "Cryo storage tracked manually. No renewal alerts. No tracking of return vs. churn." }],
  ],
  // TFP
  [
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
  // Channel
  [
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
];

const cells: JourneyDoc["cells"] = {};
lenses.forEach((lens, li) => {
  cells[lens.id] = {};
  stages.forEach((stage, si) => {
    cells[lens.id][stage.id] = { lines: rows[li][si] ?? [{ text: "" }] };
  });
});

export const seedDoc: JourneyDoc = {
  title: "otto Multi-lenses Journey",
  stages,
  lenses,
  cells,
};

export const newId = (p: string) =>
  `${p}-${Math.random().toString(36).slice(2, 8)}`;