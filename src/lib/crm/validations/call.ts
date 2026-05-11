import { z } from "zod";

export const createCallSchema = z.object({
  opportunityId: z.string().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
  callType: z.enum([
    "INITIAL_OUTREACH",
    "FOLLOW_UP",
    "DISCOVERY",
    "TECHNICAL",
    "PROPOSAL_WALKTHRU",
    "NEGOTIATION",
    "CLOSING",
    "CHECK_IN",
    "SUPPORT",
  ]),
  outcome: z.enum([
    "POSITIVE",
    "NEUTRAL",
    "NEGATIVE",
    "NO_ANSWER",
    "VOICEMAIL",
    "WRONG_NUMBER",
    "MEETING_BOOKED",
    "PROPOSAL_REQUEST",
    "WON",
    "LOST",
    "RESCHEDULE",
    "NOT_INTERESTED",
  ]),
  durationMins: z.number().int().min(0).default(0),
  callAt: z.string().optional(),
  nextActionText: z.string().optional(),
  nextActionDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCallInput = z.infer<typeof createCallSchema>;
