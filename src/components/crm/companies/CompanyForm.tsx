"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n";
import {
  createCompanySchema,
  type CreateCompanyInput,
} from "@/lib/crm/validations/company";
import { createCompanyAction, updateCompanyAction } from "@/app/(dashboard)/crm/companies/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type CompanyFormProps = {
  initialData?: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    brandName: string | null;
    industry: string | null;
    website: string | null;
    phone: string | null;
    address: string | null;
    country: string;
    city: string | null;
    category: string | null;
    notes: string | null;
  };
};

const CATEGORIES = [
  { value: "A_PLUS", label: "A+" },
  { value: "A", label: "A" },
  { value: "B_PLUS", label: "B+" },
  { value: "B", label: "B" },
  { value: "C_PLUS", label: "C+" },
  { value: "C", label: "C" },
] as const;

export function CompanyForm({ initialData }: CompanyFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      nameEn: initialData?.nameEn ?? "",
      nameAr: initialData?.nameAr ?? "",
      brandName: initialData?.brandName ?? "",
      industry: initialData?.industry ?? "",
      website: initialData?.website ?? "",
      phone: initialData?.phone ?? "",
      address: initialData?.address ?? "",
      country: initialData?.country ?? "EG",
      city: initialData?.city ?? "",
      category: (initialData?.category as CreateCompanyInput["category"]) ?? undefined,
      notes: initialData?.notes ?? "",
    },
  });

  const selectedCategory = watch("category");

  function onSubmit(data: CreateCompanyInput) {
    startTransition(async () => {
      try {
        if (isEdit && initialData) {
          await updateCompanyAction(initialData.id, data);
          toast.success(t.activityLog.updated);
          router.push(`/crm/companies/${initialData.id}`);
        } else {
          const company = await createCompanyAction(data);
          toast.success(t.activityLog.created);
          router.push(`/crm/companies/${company.id}`);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? `${t.common.edit} - ${initialData.nameEn}` : t.forms.createNew}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nameEn">
                {t.forms.companyNameEn} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nameEn"
                {...register("nameEn")}
                dir="ltr"
                placeholder="Company Name"
              />
              {errors.nameEn && (
                <p className="text-sm text-destructive">{errors.nameEn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameAr">{t.forms.companyNameAr}</Label>
              <Input
                id="nameAr"
                {...register("nameAr")}
                dir="rtl"
                placeholder="اسم الشركة"
              />
            </div>
          </div>

          {/* Brand & Industry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">{t.forms.brandName}</Label>
              <Input id="brandName" {...register("brandName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">{t.forms.industry}</Label>
              <Input id="industry" {...register("industry")} />
            </div>
          </div>

          {/* Website & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">{t.common.website}</Label>
              <Input
                id="website"
                {...register("website")}
                dir="ltr"
                type="url"
                placeholder="https://"
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t.common.phone}</Label>
              <Input
                id="phone"
                {...register("phone")}
                dir="ltr"
                type="tel"
                placeholder="+20..."
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">{t.common.address}</Label>
            <Input id="address" {...register("address")} />
          </div>

          {/* Country, City, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">{t.common.country}</Label>
              <Input id="country" {...register("country")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t.common.city}</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label>{t.forms.category}</Label>
              <Select
                value={selectedCategory ?? ""}
                onValueChange={(value) =>
                  setValue(
                    "category",
                    value as CreateCompanyInput["category"],
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.forms.category} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t.common.notes}</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              rows={4}
              placeholder={t.common.notes}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isEdit ? t.common.save : t.common.create}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              {t.common.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
