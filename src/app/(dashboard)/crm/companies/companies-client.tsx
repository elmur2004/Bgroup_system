"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/crm/shared/EmptyState";
import { Plus, Search, Building2, ChevronLeft, ChevronRight } from "lucide-react";

type CompaniesData = {
  companies: Array<{
    id: string;
    nameEn: string;
    nameAr: string | null;
    brandName: string | null;
    industry: string | null;
    category: string | null;
    city: string | null;
    phone: string | null;
    _count: { contacts: number; opportunities: number };
    assignedTo: { id: string; fullName: string } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function CompaniesClient({
  data,
  initialSearch,
  currentPage,
}: {
  data: CompaniesData;
  initialSearch: string;
  currentPage: number;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("search", value);
      params.set("page", "1");
      router.push(`/crm/companies?${params.toString()}`);
    });
  }

  function handlePageChange(page: number) {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", page.toString());
      router.push(`/crm/companies?${params.toString()}`);
    });
  }

  const categoryColors: Record<string, string> = {
    A_PLUS: "bg-emerald-100 text-emerald-800",
    A: "bg-green-100 text-green-800",
    B_PLUS: "bg-blue-100 text-blue-800",
    B: "bg-sky-100 text-sky-800",
    C_PLUS: "bg-amber-100 text-amber-800",
    C: "bg-orange-100 text-orange-800",
  };

  const categoryLabels: Record<string, string> = {
    A_PLUS: "A+",
    A: "A",
    B_PLUS: "B+",
    B: "B",
    C_PLUS: "C+",
    C: "C",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.nav.companies}</h1>
        <Link href="/crm/companies/new">
          <Button>
            <Plus className="h-4 w-4 me-2" />
            {t.forms.createNew}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.common.search}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Table */}
      {data.companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
          title={t.common.noResults}
          action={
            <Link href="/crm/companies/new">
              <Button variant="outline">{t.forms.createNew}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.forms.companyName}</TableHead>
                  <TableHead>{t.forms.industry}</TableHead>
                  <TableHead>{t.forms.category}</TableHead>
                  <TableHead>{t.common.city}</TableHead>
                  <TableHead className="text-center">{t.nav.contacts}</TableHead>
                  <TableHead className="text-center">{t.nav.opportunities}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.companies.map((company) => (
                  <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/companies/${company.id}`}
                        className="font-medium hover:underline"
                      >
                        {locale === "ar" && company.nameAr
                          ? company.nameAr
                          : company.nameEn}
                      </Link>
                      {company.brandName && (
                        <p className="text-xs text-muted-foreground">{company.brandName}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.industry ?? "—"}
                    </TableCell>
                    <TableCell>
                      {company.category ? (
                        <Badge
                          variant="secondary"
                          className={categoryColors[company.category] ?? ""}
                        >
                          {categoryLabels[company.category] ?? company.category}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.city ?? "—"}
                    </TableCell>
                    <TableCell className="text-center ltr-nums">
                      {company._count.contacts}
                    </TableCell>
                    <TableCell className="text-center ltr-nums">
                      {company._count.opportunities}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="ltr-nums">
                  {(currentPage - 1) * data.pageSize + 1}–
                  {Math.min(currentPage * data.pageSize, data.total)}
                </span>
                {" / "}
                <span className="ltr-nums">{data.total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-0 ltr:hidden" />
                  <ChevronLeft className="h-4 w-4 ltr:rotate-0 rtl:hidden" />
                  {t.common.previous}
                </Button>
                <span className="text-sm ltr-nums">
                  {currentPage} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= data.totalPages || isPending}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  {t.common.next}
                  <ChevronLeft className="h-4 w-4 rtl:rotate-0 ltr:hidden" />
                  <ChevronRight className="h-4 w-4 ltr:rotate-0 rtl:hidden" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
