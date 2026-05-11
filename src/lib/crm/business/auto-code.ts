import { db } from "@/lib/db";

export async function generateOpportunityCode(): Promise<string> {
  return db.$transaction(async (tx) => {
    const last = await tx.crmOpportunity.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });

    if (!last) return "OPP-0001";

    const num = parseInt(last.code.replace("OPP-", ""), 10);
    return `OPP-${String(num + 1).padStart(4, "0")}`;
  });
}

export async function generateCallCode(): Promise<string> {
  return db.$transaction(async (tx) => {
    const last = await tx.crmCall.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });

    if (!last) return "CL-0001";

    const num = parseInt(last.code.replace("CL-", ""), 10);
    return `CL-${String(num + 1).padStart(4, "0")}`;
  });
}
