import { z } from "zod";

export const createCompanySchema = z.object({
  nameEn: z.string().min(1, "Company name is required"),
  nameAr: z.string().optional(),
  brandName: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  category: z
    .enum(["A_PLUS", "A", "B_PLUS", "B", "C_PLUS", "C"])
    .optional(),
  notes: z.string().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
