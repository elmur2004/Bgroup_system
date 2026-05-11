import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getEntities, getLeadSources } from "../actions";
import { db } from "@/lib/db";
import { OpportunityForm } from "@/components/crm/opportunities/OpportunityForm";

export default async function NewOpportunityPage() {
  const session = await getRequiredSession();
  const { t, locale } = await getServerT();

  const [entities, leadSources, companies, products] = await Promise.all([
    getEntities(),
    getLeadSources(),
    db.crmCompany.findMany({
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: "asc" },
      take: 100,
    }),
    db.crmProduct.findMany({
      where: { active: true },
      select: { id: true, code: true, nameEn: true, nameAr: true, entityId: true, basePrice: true, currency: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t.common.newOpportunity}</h1>
      <OpportunityForm
        entities={JSON.parse(JSON.stringify(entities))}
        leadSources={JSON.parse(JSON.stringify(leadSources))}
        companies={JSON.parse(JSON.stringify(companies))}
        products={JSON.parse(JSON.stringify(products))}
        userEntityId={session.entityId}
        locale={locale}
      />
    </div>
  );
}
