"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityBadge } from "@/components/crm/shared/EntityBadge";
import { StageBadge } from "@/components/crm/shared/StageBadge";
import { EmptyState } from "@/components/crm/shared/EmptyState";
import {
  Building2,
  Globe,
  MapPin,
  Phone,
  Plus,
  User,
} from "lucide-react";
import type { CrmOpportunityStage } from "@/types";

type CompanyDetail = {
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
  createdAt: Date;
  assignedTo: { id: string; fullName: string; fullNameAr: string | null } | null;
  contacts: Array<{
    id: string;
    fullName: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    isPrimary: boolean;
    linkedIn: string | null;
  }>;
  opportunities: Array<{
    id: string;
    code: string;
    title: string;
    stage: CrmOpportunityStage;
    estimatedValue: unknown;
    currency: string;
    estimatedValueEGP: unknown;
    owner: { id: string; fullName: string };
    entity: { id: string; code: string; nameEn: string; nameAr: string; color: string };
  }>;
  companyNotes: Array<{
    id: string;
    content: string;
    createdAt: Date;
    author: { id: string; fullName: string };
  }>;
};

const categoryLabels: Record<string, string> = {
  A_PLUS: "A+",
  A: "A",
  B_PLUS: "B+",
  B: "B",
  C_PLUS: "C+",
  C: "C",
};

export function CompanyDetailClient({ company }: { company: CompanyDetail }) {
  const { t, locale } = useLocale();

  const displayName =
    locale === "ar" && company.nameAr ? company.nameAr : company.nameEn;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {company.category && (
              <Badge variant="secondary">
                {categoryLabels[company.category] ?? company.category}
              </Badge>
            )}
          </div>
          {company.brandName && (
            <p className="text-muted-foreground">{company.brandName}</p>
          )}
        </div>
        <Link href={`/companies/${company.id}/edit`}>
          <Button variant="outline">
            {t.common.edit}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" dir={locale === "ar" ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="overview">{t.tabs.overview}</TabsTrigger>
          <TabsTrigger value="contacts">{t.nav.contacts}</TabsTrigger>
          <TabsTrigger value="opportunities">{t.nav.opportunities}</TabsTrigger>
          <TabsTrigger value="notes">{t.tabs.notes}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t.forms.companyName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t.forms.companyNameEn}
                  </dt>
                  <dd className="mt-1">{company.nameEn}</dd>
                </div>
                {company.nameAr && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      {t.forms.companyNameAr}
                    </dt>
                    <dd className="mt-1">{company.nameAr}</dd>
                  </div>
                )}
                {company.industry && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      {t.forms.industry}
                    </dt>
                    <dd className="mt-1">{company.industry}</dd>
                  </div>
                )}
                {company.website && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      <Globe className="inline h-4 w-4 me-1" />
                      {t.common.website}
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {company.website}
                      </a>
                    </dd>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      <Phone className="inline h-4 w-4 me-1" />
                      {t.common.phone}
                    </dt>
                    <dd className="mt-1 ltr-nums" dir="ltr">
                      {company.phone}
                    </dd>
                  </div>
                )}
                {company.address && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      <MapPin className="inline h-4 w-4 me-1" />
                      {t.common.address}
                    </dt>
                    <dd className="mt-1">{company.address}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t.common.country}
                  </dt>
                  <dd className="mt-1">{company.country}</dd>
                </div>
                {company.city && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      {t.common.city}
                    </dt>
                    <dd className="mt-1">{company.city}</dd>
                  </div>
                )}
                {company.assignedTo && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      {t.forms.assignedTo}
                    </dt>
                    <dd className="mt-1">
                      {locale === "ar" && company.assignedTo.fullNameAr
                        ? company.assignedTo.fullNameAr
                        : company.assignedTo.fullName}
                    </dd>
                  </div>
                )}
              </dl>
              {company.notes && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    {t.common.notes}
                  </dt>
                  <dd className="whitespace-pre-wrap text-sm">{company.notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.nav.contacts}</h2>
            <Link href={`/contacts/new?companyId=${company.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 me-2" />
                {t.forms.createNew}
              </Button>
            </Link>
          </div>
          {company.contacts.length === 0 ? (
            <EmptyState
              icon={<User className="h-8 w-8 text-muted-foreground" />}
              title={t.common.noResults}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.forms.contactName}</TableHead>
                    <TableHead>{t.forms.contactRole}</TableHead>
                    <TableHead>{t.common.email}</TableHead>
                    <TableHead>{t.common.phone}</TableHead>
                    <TableHead>{t.forms.isPrimary}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-medium hover:underline"
                        >
                          {contact.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.role ?? "—"}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="ltr-nums" dir="ltr">
                        {contact.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        {contact.isPrimary && (
                          <Badge variant="default">{t.forms.isPrimary}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.nav.opportunities}</h2>
            <Link href={`/opportunities/new?companyId=${company.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 me-2" />
                {t.common.newOpportunity}
              </Button>
            </Link>
          </div>
          {company.opportunities.length === 0 ? (
            <EmptyState title={t.common.noResults} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead>{t.kpis.stage}</TableHead>
                    <TableHead>{t.forms.entity}</TableHead>
                    <TableHead>{t.common.value}</TableHead>
                    <TableHead>{t.forms.owner}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell>
                        <Link
                          href={`/opportunities/${opp.id}`}
                          className="font-medium hover:underline"
                        >
                          <span className="text-xs text-muted-foreground me-2 ltr-nums">
                            {opp.code}
                          </span>
                          {opp.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StageBadge stage={opp.stage} />
                      </TableCell>
                      <TableCell>
                        <EntityBadge
                          code={opp.entity.code}
                          name={locale === "ar" ? opp.entity.nameAr : opp.entity.nameEn}
                          color={opp.entity.color}
                        />
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {Number(opp.estimatedValueEGP).toLocaleString()}{" "}
                        <span className="text-xs text-muted-foreground">EGP</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {opp.owner.fullName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <h2 className="text-lg font-semibold">{t.tabs.notes}</h2>
          {company.companyNotes.length === 0 ? (
            <EmptyState title={t.common.noResults} />
          ) : (
            <div className="space-y-3">
              {company.companyNotes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{note.author.fullName}</span>
                      <span className="text-xs text-muted-foreground ltr-nums">
                        {new Date(note.createdAt).toLocaleDateString(
                          locale === "ar" ? "ar-EG" : "en-US"
                        )}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
