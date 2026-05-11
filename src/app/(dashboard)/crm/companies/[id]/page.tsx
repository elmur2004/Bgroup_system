import { getRequiredSession } from "@/lib/crm/session";
import { getCompany } from "../actions";
import { notFound } from "next/navigation";
import { CompanyDetailClient } from "./company-detail-client";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([
    getRequiredSession(),
    params,
  ]);

  const company = await getCompany(session, id);
  if (!company) notFound();

  return <CompanyDetailClient company={company} />;
}
