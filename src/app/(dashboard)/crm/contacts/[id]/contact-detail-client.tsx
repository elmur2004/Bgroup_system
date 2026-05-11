"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import type { CrmOpportunityStage } from "@/types";

type ContactDetail = {
  id: string;
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
  linkedIn: string | null;
  notes: string | null;
  createdAt: Date;
  company: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    industry: string | null;
    phone: string | null;
    city: string | null;
    category: string | null;
  };
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
};

export function ContactDetailClient({ contact }: { contact: ContactDetail }) {
  const { t, locale } = useLocale();

  const companyName =
    locale === "ar" && contact.company.nameAr
      ? contact.company.nameAr
      : contact.company.nameEn;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{contact.fullName}</h1>
            {contact.isPrimary && (
              <Badge variant="default">{t.forms.isPrimary}</Badge>
            )}
          </div>
          {contact.role && (
            <p className="text-muted-foreground">{contact.role}</p>
          )}
        </div>
        <Link href={`/contacts/${contact.id}/edit`}>
          <Button variant="outline">
            {t.common.edit}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {t.forms.contactName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm ltr-nums" dir="ltr">
                    {contact.phone}
                  </span>
                </div>
              )}
              {contact.whatsapp && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm ltr-nums" dir="ltr">
                    {contact.whatsapp}
                  </span>
                </div>
              )}
              {contact.linkedIn && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={contact.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {t.forms.linkedin}
                  </a>
                </div>
              )}
              {contact.notes && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-1">{t.common.notes}</p>
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {t.forms.companyName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/companies/${contact.company.id}`}
                className="font-medium text-primary hover:underline"
              >
                {companyName}
              </Link>
              {contact.company.industry && (
                <p className="text-sm text-muted-foreground mt-1">
                  {contact.company.industry}
                </p>
              )}
              {contact.company.city && (
                <p className="text-sm text-muted-foreground">
                  {contact.company.city}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Opportunities */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.nav.opportunities}</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.opportunities.length === 0 ? (
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contact.opportunities.map((opp) => (
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
                              name={
                                locale === "ar"
                                  ? opp.entity.nameAr
                                  : opp.entity.nameEn
                              }
                              color={opp.entity.color}
                            />
                          </TableCell>
                          <TableCell className="ltr-nums">
                            {Number(opp.estimatedValueEGP).toLocaleString()}{" "}
                            <span className="text-xs text-muted-foreground">
                              EGP
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
