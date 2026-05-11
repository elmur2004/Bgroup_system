import type { CrmOpportunityStage } from "@/generated/prisma";

/**
 * Display labels per the CRM reference spec (Arabic 8-stage pipeline).
 *
 * The Prisma enum carries the canonical English value; the UI looks up the
 * label here based on the user's locale. The 8 stages used in the spec map
 * onto specific enum values (the remaining enum values are still legal —
 * just not part of the spec pipeline).
 */
export const STAGE_LABEL_AR: Record<CrmOpportunityStage, string> = {
  NEW: "عميل جديد",
  CONTACTED: "في انتظار مكالمة",
  DISCOVERY: "في انتظار ديمو",
  QUALIFIED: "في انتظار اتخاذ قرار",
  TECH_MEETING: "في انتظار مقابلة في المكتب",
  PROPOSAL_SENT: "تم إرسال عرض",
  NEGOTIATION: "تفاوض",
  VERBAL_YES: "موافقة شفهية",
  POSTPONED: "مؤجل",
  WON: "تم التعاقد",
  LOST: "غير مهتم",
};

export const STAGE_LABEL_EN: Record<CrmOpportunityStage, string> = {
  NEW: "New",
  CONTACTED: "Waiting for call",
  DISCOVERY: "Waiting for demo",
  QUALIFIED: "Waiting for decision",
  TECH_MEETING: "Waiting for office meeting",
  PROPOSAL_SENT: "Proposal sent",
  NEGOTIATION: "Negotiation",
  VERBAL_YES: "Verbal yes",
  POSTPONED: "Postponed",
  WON: "Signed contract",
  LOST: "Not interested",
};

/** The 8 stages the sales-board dashboard renders by default. */
export const SPEC_STAGES: CrmOpportunityStage[] = [
  "NEW",
  "CONTACTED",
  "DISCOVERY",
  "TECH_MEETING",
  "QUALIFIED",
  "WON",
  "LOST",
  "POSTPONED",
];

/** Categorical bucket — useful for color-coding charts. */
export function stageBucket(stage: CrmOpportunityStage): "active" | "won" | "lost" | "paused" {
  if (stage === "WON") return "won";
  if (stage === "LOST") return "lost";
  if (stage === "POSTPONED") return "paused";
  return "active";
}
