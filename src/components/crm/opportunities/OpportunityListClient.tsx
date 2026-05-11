"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StageBadge } from "@/components/crm/shared/StageBadge";
import { PriorityBadge } from "@/components/crm/shared/PriorityBadge";
import { EntityBadge } from "@/components/crm/shared/EntityBadge";
import { CurrencyDisplay } from "@/components/crm/shared/CurrencyDisplay";
import { DateDisplay } from "@/components/crm/shared/DateDisplay";
import { EmptyState } from "@/components/crm/shared/EmptyState";
import { Plus, Search, Kanban as KanbanIcon, List } from "lucide-react";
import { OpportunityKanban } from "@/components/crm/opportunities/OpportunityKanban";
import type { Locale } from "@/lib/i18n";

type Opportunity = {
  id: string;
  code: string;
  title: string;
  stage: string;
  priority: string;
  estimatedValue: number;
  currency: string;
  estimatedValueEGP: number;
  weightedValueEGP: number;
  probabilityPct: number;
  nextAction: string | null;
  nextActionDate: string | null;
  expectedCloseDate: string | null;
  updatedAt: string;
  company: { id: string; nameEn: string; nameAr: string | null };
  owner: { id: string; fullName: string; fullNameAr: string | null };
  entity: { id: string; code: string; nameEn: string; nameAr: string; color: string };
};

type Entity = { id: string; code: string; nameEn: string; nameAr: string; color: string };

export function OpportunityListClient({
  opportunities,
  total,
  entities,
  locale,
}: {
  opportunities: Opportunity[];
  total: number;
  entities: Entity[];
  locale: Locale;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [view, setView] = useState<"table" | "kanban">("table");

  function applySearch() {
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    router.push(`/crm/opportunities?${params.toString()}`);
  }

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`/crm/opportunities?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.common.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="ps-9"
            />
          </div>
          <Select
            value={searchParams.get("entityId") || "all"}
            onValueChange={(v: any) => setFilter("entityId", v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t.forms.entity} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {locale === "ar" ? e.nameAr : e.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get("priority") || "all"}
            onValueChange={(v: any) => setFilter("priority", v)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t.forms.priority} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="HOT">{t.priorities.HOT}</SelectItem>
              <SelectItem value="WARM">{t.priorities.WARM}</SelectItem>
              <SelectItem value="COLD">{t.priorities.COLD}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="flex border rounded-lg">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-e-none"
              onClick={() => setView("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-s-none"
              onClick={() => setView("kanban")}
            >
              <KanbanIcon className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/crm/opportunities/new">
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {t.common.newOpportunity}
            </Button>
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {opportunities.length === 0 ? (
        <EmptyState
          title={t.common.noResults}
          action={
            <Link href="/crm/opportunities/new">
              <Button>
                <Plus className="h-4 w-4 me-2" />
                {t.common.newOpportunity}
              </Button>
            </Link>
          }
        />
      ) : view === "kanban" ? (
        <OpportunityKanban opportunities={opportunities} locale={locale} />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.forms.entity}</TableHead>
                <TableHead>{t.kpis.stage}</TableHead>
                <TableHead>{t.forms.priority}</TableHead>
                <TableHead className="text-end">{t.kpis.weighted}</TableHead>
                <TableHead>{t.forms.nextAction}</TableHead>
                <TableHead>{t.forms.owner}</TableHead>
                <TableHead>{t.forms.expectedCloseDate}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow
                  key={opp.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/crm/opportunities/${opp.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{opp.company.nameEn}</p>
                      <p className="text-xs text-muted-foreground ltr-nums">{opp.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <EntityBadge code={opp.entity.code} color={opp.entity.color} />
                  </TableCell>
                  <TableCell>
                    <StageBadge
                      stage={opp.stage as import("@/types").CrmOpportunityStage}
                      probabilityPct={opp.probabilityPct}
                      showProbability
                    />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={opp.priority as import("@/types").CrmPriority} />
                  </TableCell>
                  <TableCell className="text-end">
                    <CurrencyDisplay
                      amount={Number(opp.weightedValueEGP)}
                      currency="EGP"
                      className="font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    {opp.nextAction && (
                      <div>
                        <p className="text-sm">{t.nextActions[opp.nextAction as keyof typeof t.nextActions]}</p>
                        {opp.nextActionDate && (
                          <DateDisplay
                            date={opp.nextActionDate}
                            className="text-xs text-muted-foreground"
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {locale === "ar" ? opp.owner.fullNameAr || opp.owner.fullName : opp.owner.fullName}
                  </TableCell>
                  <TableCell>
                    {opp.expectedCloseDate && (
                      <DateDisplay date={opp.expectedCloseDate} className="text-sm" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination info */}
      <div className="text-sm text-muted-foreground">
        {t.common.total}: {total}
      </div>
    </div>
  );
}
