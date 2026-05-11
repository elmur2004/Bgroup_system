"use server";

import { getRequiredSession } from "@/lib/crm/session";
import { createCompany, updateCompany } from "./actions";
import { redirect } from "next/navigation";
import type { CreateCompanyInput, UpdateCompanyInput } from "@/lib/crm/validations/company";

export async function createCompanyAction(data: CreateCompanyInput) {
  const session = await getRequiredSession();
  const company = await createCompany(session, data);
  return company;
}

export async function updateCompanyAction(id: string, data: UpdateCompanyInput) {
  const session = await getRequiredSession();
  const company = await updateCompany(session, id, data);
  return company;
}
