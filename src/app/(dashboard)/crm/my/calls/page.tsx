import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getCalls } from "../../calls/actions";
import { CallTable } from "@/components/crm/calls/CallTable";
import type { CrmCallType, CrmCallOutcome } from "@/generated/prisma";

export default async function MyCallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession();
  const { t, locale } = await getServerT();
  const params = await searchParams;

  // Force scope to current user's calls regardless of role
  const repSession = { ...session, role: "REP" as const };

  const { calls, total, page, totalPages } = await getCalls(repSession, {
    dateFrom: params.dateFrom as string | undefined,
    dateTo: params.dateTo as string | undefined,
    outcome: params.outcome as string | undefined,
    callType: params.callType as string | undefined,
    search: params.search as string | undefined,
    page: params.page ? Number(params.page) : 1,
  });

  const callTypeOptions: CrmCallType[] = [
    "INITIAL_OUTREACH",
    "FOLLOW_UP",
    "DISCOVERY",
    "TECHNICAL",
    "PROPOSAL_WALKTHRU",
    "NEGOTIATION",
    "CLOSING",
    "CHECK_IN",
    "SUPPORT",
  ];

  const outcomeOptions: CrmCallOutcome[] = [
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.nav.myCalls}</h1>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            {locale === "ar" ? "من تاريخ" : "From Date"}
          </label>
          <input
            type="date"
            name="dateFrom"
            defaultValue={(params.dateFrom as string) || ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            {locale === "ar" ? "إلى تاريخ" : "To Date"}
          </label>
          <input
            type="date"
            name="dateTo"
            defaultValue={(params.dateTo as string) || ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            {t.forms.callType}
          </label>
          <select
            name="callType"
            defaultValue={(params.callType as string) || ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">{t.common.all}</option>
            {callTypeOptions.map((ct) => (
              <option key={ct} value={ct}>
                {t.callTypes[ct]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            {t.forms.callOutcome}
          </label>
          <select
            name="outcome"
            defaultValue={(params.outcome as string) || ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">{t.common.all}</option>
            {outcomeOptions.map((o) => (
              <option key={o} value={o}>
                {t.callOutcomes[o]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-8 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t.common.filter}
        </button>
      </form>

      <CallTable
        calls={JSON.parse(JSON.stringify(calls))}
        total={total}
        page={page}
        totalPages={totalPages}
        locale={locale}
      />
    </div>
  );
}
