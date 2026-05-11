import { z } from "zod";

export const createProductSchema = z.object({
  code: z.string().min(1, "Product code is required"),
  entityId: z.string().min(1, "Entity is required"),
  category: z.string().min(1, "Category is required"),
  nameEn: z.string().min(1, "Name (English) is required"),
  nameAr: z.string().min(1, "Name (Arabic) is required"),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  basePrice: z.number().positive("Price must be positive"),
  currency: z.enum(["EGP", "USD", "SAR", "AED", "QAR"]).default("EGP"),
  dealType: z
    .enum(["ONE_TIME", "MONTHLY", "ANNUAL", "SAAS", "MIXED", "RETAINER"])
    .default("ONE_TIME"),
});

export const updateProductSchema = createProductSchema.partial().omit({
  code: true,
  entityId: true,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
