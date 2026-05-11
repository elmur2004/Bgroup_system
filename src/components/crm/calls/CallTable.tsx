"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { DateDisplay } from "@/components/crm/shared/DateDisplay";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CrmCallType, CrmCallOutcome } from "@/generated/prisma";
import type { Locale } from "@/lib/i18n";

type CallRow = {
  id: string;
  code: string;
  callAt: string;
  callType: CrmCallType;
  outcome: CrmCallOutcome;
  durationMins: number;
  contactName: string | null;
  notes: string | null;
  caller: {
    id: string;
    fullName: string;
    fullNameAr: string | null;
  };
  company: {
    id: string;
    nameEn: string;
    nameAr: string | null;
  } | null;
  opportunity: {
    id: string;
    code: string;
    title: string;
  } | null;
};

const OUTCOME_COLORS: Record<CrmCallOutcome, string> = {
  POSITIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  NEUTRAL: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  NEGATIVE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  NO_ANSWER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  VOICEMAIL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  WRONG_NUMBER: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  MEETING_BOOKED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROPOSAL_REQUEST: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  WON: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  LOST: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  RESCHEDULE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  NOT_INTERESTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function CallTable({
  calls,
  total,
  page,
  totalPages,
  locale: initialLocale,
}: {
  calls: CallRow[];
  total: number;
  page: number;
  totalPages: number;
  locale: Locale;
}) {
  const { t, locale } = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentLocale = locale || initialLocale;

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>{t.common.noResults}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t.common.total}: {total}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.common.date}</TableHead>
            <TableHead>
              {currentLocale === "ar" ? "المتصل" : "Caller"}
            </TableHead>
            <TableHead>{t.forms.companyName}</TableHead>
            <TableHead>{t.forms.contactName}</TableHead>
            <TableHead>{t.forms.callType}</TableHead>
            <TableHead>{t.forms.callOutcome}</TableHead>
            <TableHead>{t.forms.duration}</TableHead>
            <TableHead>
              {currentLocale === "ar" ? "كود الفرصة" : "Opp Code"}
            </TableHead>
            <TableHead>{t.common.notes}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <>
              <TableRow
                key={call.id}
                className="cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === call.id ? null : call.id)
                }
              >
                <TableCell>
                  <DateDisplay date={call.callAt} showTime />
                </TableCell>
                <TableCell>
                  {currentLocale === "ar" && call.caller.fullNameAr
                    ? call.caller.fullNameAr
                    : call.caller.fullName}
                </TableCell>
                <TableCell>
                  {call.company
                    ? currentLocale === "ar" && call.company.nameAr
                      ? call.company.nameAr
                      : call.company.nameEn
                    : "-"}
                </TableCell>
                <TableCell>{call.contactName || "-"}</TableCell>
                <TableCell>
                  <span className="text-xs">
                    {t.callTypes[call.callType]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs font-normal ${OUTCOME_COLORS[call.outcome]}`}
                  >
                    {t.callOutcomes[call.outcome]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="ltr-nums">
                    {call.durationMins}
                    {currentLocale === "ar" ? " د" : " min"}
                  </span>
                </TableCell>
                <TableCell>
                  {call.opportunity ? (
                    <span className="font-mono text-xs text-primary">
                      {call.opportunity.code}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {call.notes ? (
                    <span className="truncate block max-w-[200px]">
                      {call.notes.length > 50
                        ? call.notes.substring(0, 50) + "..."
                        : call.notes}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
              {expandedId === call.id && call.notes && (
                <TableRow key={`${call.id}-notes`}>
                  <TableCell colSpan={9}>
                    <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                      {call.notes}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          {page > 1 && (
            <a
              href={`?page=${page - 1}`}
              className="rounded-lg border border-input px-3 py-1 text-sm hover:bg-muted"
            >
              {t.common.previous}
            </a>
          )}
          <span className="text-sm text-muted-foreground ltr-nums">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`?page=${page + 1}`}
              className="rounded-lg border border-input px-3 py-1 text-sm hover:bg-muted"
            >
              {t.common.next}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
