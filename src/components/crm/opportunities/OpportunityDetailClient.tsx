"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StageBadge } from "@/components/crm/shared/StageBadge";
import { PriorityBadge } from "@/components/crm/shared/PriorityBadge";
import { EntityBadge } from "@/components/crm/shared/EntityBadge";
import { CurrencyDisplay } from "@/components/crm/shared/CurrencyDisplay";
import { DateDisplay } from "@/components/crm/shared/DateDisplay";
import { StageProgressBar } from "./StageProgressBar";
import { StageChangeModal } from "./StageChangeModal";
import { addNote } from "@/app/(dashboard)/crm/opportunities/actions";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  ExternalLink,
  MessageCircle,
  Calendar,
  User,
  FileText,
  Edit,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function OpportunityDetailClient({
  opportunity: opp,
  locale,
}: {
  opportunity: Record<string, unknown>;
  locale: Locale;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const entity = opp.entity as { code: string; nameEn: string; nameAr: string; color: string };
  const company = opp.company as { nameEn: string; nameAr: string | null; phone: string | null };
  const owner = opp.owner as { fullName: string; fullNameAr: string | null };
  const contact = opp.primaryContact as { fullName: string; phone: string | null; email: string | null; whatsapp: string | null } | null;
  const stageChanges = (opp.stageChanges || []) as Array<{ id: string; fromStage: string | null; toStage: string; changedAt: string; durationDays: number | null }>;
  const activityLogs = (opp.activityLogs || []) as Array<{ id: string; action: string; metadata: Record<string, unknown> | null; createdAt: string; actor: { fullName: string } }>;
  const calls = (opp.calls || []) as Array<{ id: string; code: string; callType: string; outcome: string; callAt: string; notes: string | null; caller: { fullName: string } }>;
  const notes = (opp.notes || []) as Array<{ id: string; content: string; createdAt: string; author: { fullName: string } }>;

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await addNote(opp.id as string, noteText);
      setNoteText("");
      toast.success(locale === "ar" ? "تم إضافة الملاحظة" : "Note added");
      router.refresh();
    } catch {
      toast.error("Failed to add note");
    }
    setAddingNote(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">
              {company.nameEn}
            </h1>
            <EntityBadge code={entity.code} color={entity.color} />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground ps-12">
            <span className="ltr-nums">{opp.code as string}</span>
            <PriorityBadge priority={opp.priority as import("@/types").CrmPriority} />
            <span>{t.dealTypes[opp.dealType as keyof typeof t.dealTypes]}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/opportunities/${opp.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 me-2" />
              {t.common.edit}
            </Button>
          </Link>
          <Button onClick={() => setStageModalOpen(true)}>
            {t.forms.selectStage}
          </Button>
        </div>
      </div>

      {/* Stage Progress */}
      <StageProgressBar currentStage={opp.stage as string} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.forms.estimatedValue}</p>
            <p className="text-xl font-bold">
              <CurrencyDisplay
                amount={Number(opp.estimatedValue)}
                currency={opp.currency as import("@/types").CrmCurrency}
                egpAmount={Number(opp.estimatedValueEGP)}
              />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.kpis.weighted}</p>
            <p className="text-xl font-bold ltr-nums">
              <CurrencyDisplay amount={Number(opp.weightedValueEGP)} currency="EGP" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.kpis.stage}</p>
            <StageBadge
              stage={opp.stage as import("@/types").CrmOpportunityStage}
              probabilityPct={opp.probabilityPct as number}
              showProbability
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.forms.expectedCloseDate}</p>
            {opp.expectedCloseDate ? (
              <DateDisplay date={opp.expectedCloseDate as string} className="text-lg font-semibold" />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t.tabs.overview}</TabsTrigger>
          <TabsTrigger value="activity">{t.tabs.activity}</TabsTrigger>
          <TabsTrigger value="calls">{t.tabs.calls}</TabsTrigger>
          <TabsTrigger value="documents">{t.tabs.documents}</TabsTrigger>
          <TabsTrigger value="notes">{t.tabs.notes}</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.nav.contacts}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{contact.fullName}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="ltr-nums" dir="ltr">{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span dir="ltr">{contact.email}</span>
                      </div>
                    )}
                    {contact.whatsapp && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="ltr-nums" dir="ltr">{contact.whatsapp}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </CardContent>
            </Card>

            {/* Deal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.nav.opportunities}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.forms.owner}</span>
                  <span>{locale === "ar" ? owner.fullNameAr || owner.fullName : owner.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.forms.leadSource}</span>
                  <span>{opp.leadSource ? String(opp.leadSource) : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.forms.nextAction}</span>
                  <span>
                    {opp.nextAction
                      ? String(t.nextActions[opp.nextAction as keyof typeof t.nextActions] || opp.nextAction)
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.forms.nextActionDate}</span>
                  <span>
                    {opp.nextActionDate ? (
                      <DateDisplay date={opp.nextActionDate as string} />
                    ) : "-"}
                  </span>
                </div>
                {Boolean(opp.proposalUrl) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.forms.proposalUrl}</span>
                    <a href={opp.proposalUrl as string} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {locale === "ar" ? "عرض" : "View"}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {Boolean(opp.description) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.common.description}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{opp.description as string}</p>
              </CardContent>
            </Card>
          )}

          {/* Stage History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{locale === "ar" ? "سجل المراحل" : "Stage History"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stageChanges.map((sc) => (
                  <div key={sc.id} className="flex items-center gap-3 text-sm">
                    <DateDisplay date={sc.changedAt} showTime className="text-muted-foreground w-36 shrink-0" />
                    {sc.fromStage && (
                      <>
                        <StageBadge stage={sc.fromStage as import("@/types").CrmOpportunityStage} />
                        <span className="text-muted-foreground">&rarr;</span>
                      </>
                    )}
                    <StageBadge stage={sc.toStage as import("@/types").CrmOpportunityStage} />
                    {sc.durationDays !== null && sc.durationDays > 0 && (
                      <span className="text-xs text-muted-foreground ltr-nums">
                        ({sc.durationDays}d)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm border-b pb-3 last:border-0">
                    <DateDisplay date={log.createdAt} showTime className="text-muted-foreground w-36 shrink-0" />
                    <div>
                      <span className="font-medium">{log.actor.fullName}</span>
                      <span className="text-muted-foreground mx-1">—</span>
                      <span>{t.activityLog[log.action as keyof typeof t.activityLog] || log.action}</span>
                      {Boolean(log.metadata && (log.metadata as Record<string, unknown>).from) && (
                        <span className="ms-1">
                          {t.activityLog.from} {t.stages[(log.metadata as Record<string, string>).from as keyof typeof t.stages]} {t.activityLog.to} {t.stages[(log.metadata as Record<string, string>).to as keyof typeof t.stages]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t.common.noResults}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {calls.map((call) => (
                  <div key={call.id} className="border-b pb-3 last:border-0 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{call.caller.fullName}</span>
                        <Badge variant="secondary">{t.callTypes[call.callType as keyof typeof t.callTypes]}</Badge>
                        <Badge variant="outline">{t.callOutcomes[call.outcome as keyof typeof t.callOutcomes]}</Badge>
                      </div>
                      <DateDisplay date={call.callAt} showTime className="text-muted-foreground" />
                    </div>
                    {call.notes && <p className="text-muted-foreground ps-6">{call.notes}</p>}
                  </div>
                ))}
                {calls.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t.common.noResults}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {Boolean(opp.proposalUrl) && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <a href={opp.proposalUrl as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {t.attachmentKinds.PROPOSAL}
                    </a>
                  </div>
                )}
                {Boolean(opp.contractUrl) && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <a href={opp.contractUrl as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {t.attachmentKinds.CONTRACT}
                    </a>
                  </div>
                )}
                {!opp.proposalUrl && !opp.contractUrl && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t.common.noResults}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea
                placeholder={locale === "ar" ? "أضف ملاحظة..." : "Add a note..."}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={addingNote || !noteText.trim()}
                size="sm"
              >
                {addingNote ? t.common.loading : t.common.save}
              </Button>
            </CardContent>
          </Card>

          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{note.author.fullName}</span>
                  <DateDisplay date={note.createdAt} showTime className="text-xs text-muted-foreground" />
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <TaskList
            entityType="CRM_OPPORTUNITY"
            entityId={opp.id as string}
            showBuckets={false}
            createDefaults={{
              entityType: "CRM_OPPORTUNITY",
              entityId: opp.id as string,
              module: "crm",
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Stage Change Modal */}
      <StageChangeModal
        open={stageModalOpen}
        onOpenChange={setStageModalOpen}
        opportunityId={opp.id as string}
        currentStage={opp.stage as string}
        locale={locale}
      />
    </div>
  );
}
