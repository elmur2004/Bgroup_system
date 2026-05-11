import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getOpportunities, getEntities } from "./actions";
import { OpportunityListClient } from "@/components/crm/opportunities/OpportunityListClient";
import type { CrmOpportunityStage } from "@/generated/prisma";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession();
  const { t, locale } = await getServerT();
  const params = await searchParams;

  const stage = params.stage
    ? (Array.isArray(params.stage) ? params.stage : [params.stage]) as CrmOpportunityStage[]
    : undefined;

  const { data, total } = await getOpportunities({
    search: params.search as string | undefined,
    stage,
    entityId: params.entityId as string | undefined,
    priority: params.priority as string | undefined,
    page: params.page ? Number(params.page) : 1,
  });

  const entities = await getEntities();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.nav.opportunities}</h1>
      </div>
      <OpportunityListClient
        opportunities={JSON.parse(JSON.stringify(data))}
        total={total}
        entities={JSON.parse(JSON.stringify(entities))}
        locale={locale}
      />
    </div>
  );
}
