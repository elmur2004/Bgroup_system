import { notFound } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
import { getOpportunity } from "../actions";
import { OpportunityDetailClient } from "@/components/crm/opportunities/OpportunityDetailClient";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale } = await getServerT();
  const opp = await getOpportunity(id);

  if (!opp) notFound();

  return (
    <OpportunityDetailClient
      opportunity={JSON.parse(JSON.stringify(opp))}
      locale={locale}
    />
  );
}
