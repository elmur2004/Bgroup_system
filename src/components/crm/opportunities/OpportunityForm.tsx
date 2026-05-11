"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n";
import { createOpportunitySchema, type CreateOpportunityInput } from "@/lib/crm/validations/opportunity";
import { createOpportunity } from "@/app/(dashboard)/crm/opportunities/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/i18n";

type Entity = { id: string; code: string; nameEn: string; nameAr: string };
type LeadSource = { id: string; code: string; labelEn: string; labelAr: string };
type Company = { id: string; nameEn: string; nameAr: string | null };
type Product = { id: string; code: string; nameEn: string; nameAr: string; entityId: string; basePrice: number; currency: string };

export function OpportunityForm({
  entities,
  leadSources,
  companies,
  products,
  userEntityId,
  locale,
}: {
  entities: Entity[];
  leadSources: LeadSource[];
  companies: Company[];
  products: Product[];
  userEntityId: string | null;
  locale: Locale;
}) {
  const { t } = useLocale();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOpportunityInput>({
    resolver: zodResolver(createOpportunitySchema),
    defaultValues: {
      entityId: userEntityId || "",
      currency: "EGP",
      priority: "COLD",
      dealType: "ONE_TIME",
      nextAction: "FOLLOW_UP",
      nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
  });

  const selectedEntityId = watch("entityId");
  const selectedCurrency = watch("currency");
  const estimatedValue = watch("estimatedValue");

  async function onSubmit(data: CreateOpportunityInput) {
    try {
      const opp = await createOpportunity(data);
      toast.success(locale === "ar" ? "تم إنشاء الفرصة بنجاح" : "Opportunity created successfully");
      router.push(`/opportunities/${opp.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create opportunity");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Company & Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.nav.companies}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t.forms.selectCompany} *</Label>
            <Select onValueChange={(v: any) => setValue("companyId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t.forms.selectCompany} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {locale === "ar" && c.nameAr ? c.nameAr : c.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.companyId && (
              <p className="text-sm text-destructive mt-1">{errors.companyId.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.nav.opportunities}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t.forms.entity} *</Label>
              <Select
                value={selectedEntityId}
                onValueChange={(v: any) => setValue("entityId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.forms.selectEntity} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {locale === "ar" ? e.nameAr : e.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.entityId && (
                <p className="text-sm text-destructive mt-1">{errors.entityId.message}</p>
              )}
            </div>

            <div>
              <Label>{t.forms.priority}</Label>
              <Select
                defaultValue="COLD"
                onValueChange={(v: any) => setValue("priority", v as "HOT" | "WARM" | "COLD")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOT">{t.priorities.HOT}</SelectItem>
                  <SelectItem value="WARM">{t.priorities.WARM}</SelectItem>
                  <SelectItem value="COLD">{t.priorities.COLD}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.forms.estimatedValue} *</Label>
              <Input
                type="number"
                {...register("estimatedValue", { valueAsNumber: true })}
                className="ltr-nums"
                dir="ltr"
              />
              {errors.estimatedValue && (
                <p className="text-sm text-destructive mt-1">{errors.estimatedValue.message}</p>
              )}
            </div>

            <div>
              <Label>{t.forms.currency}</Label>
              <Select
                defaultValue="EGP"
                onValueChange={(v: any) => setValue("currency", v as "EGP" | "USD" | "SAR" | "AED" | "QAR")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["EGP", "USD", "SAR", "AED", "QAR"] as const).map((c) => (
                    <SelectItem key={c} value={c}>
                      {t.currencyNames[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.forms.dealType}</Label>
              <Select
                defaultValue="ONE_TIME"
                onValueChange={(v: any) => setValue("dealType", v as CreateOpportunityInput["dealType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ONE_TIME", "MONTHLY", "ANNUAL", "SAAS", "MIXED", "RETAINER"] as const).map((dt) => (
                    <SelectItem key={dt} value={dt}>
                      {t.dealTypes[dt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.forms.leadSource}</Label>
              <Select onValueChange={(v: any) => setValue("leadSource", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.forms.leadSource} />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((ls) => (
                    <SelectItem key={ls.code} value={ls.code}>
                      {locale === "ar" ? ls.labelAr : ls.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.forms.expectedCloseDate}</Label>
              <Input
                type="date"
                {...register("expectedCloseDate")}
                className="ltr-nums"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <Label>{t.common.description}</Label>
            <Textarea {...register("description")} rows={3} />
          </div>

          <div>
            <Label>{t.forms.techRequirements}</Label>
            <Textarea {...register("techRequirements")} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Next Action (Required) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.forms.nextAction} *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.forms.nextActionRequired}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t.forms.nextAction} *</Label>
              <Select
                defaultValue="FOLLOW_UP"
                onValueChange={(v: any) => setValue("nextAction", v as CreateOpportunityInput["nextAction"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(t.nextActions) as Array<keyof typeof t.nextActions>).map((na) => (
                    <SelectItem key={na} value={na}>
                      {t.nextActions[na]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.forms.nextActionDate} *</Label>
              <Input
                type="date"
                {...register("nextActionDate")}
                className="ltr-nums"
                dir="ltr"
              />
              {errors.nextActionDate && (
                <p className="text-sm text-destructive mt-1">{errors.nextActionDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>{t.forms.nextActionText}</Label>
            <Input {...register("nextActionText")} />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-w-32">
          {isSubmitting ? t.common.loading : t.common.create}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
