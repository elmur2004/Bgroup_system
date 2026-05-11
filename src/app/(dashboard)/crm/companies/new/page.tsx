import { getRequiredSession } from "@/lib/crm/session";
import { CompanyForm } from "@/components/crm/companies/CompanyForm";

export default async function NewCompanyPage() {
  await getRequiredSession();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <CompanyForm />
    </div>
  );
}
