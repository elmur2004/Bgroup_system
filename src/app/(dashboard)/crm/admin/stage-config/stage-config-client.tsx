"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { updateStageConfig } from "../actions";

type StageConfigItem = {
  id: string;
  stage: string;
  entityId: string | null;
  probabilityPct: number;
  slaHours: number | null;
  displayOrder: number;
  entity: {
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
  } | null;
};

export function StageConfigClient({ configs }: { configs: StageConfigItem[] }) {
  const { t, locale } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProb, setEditProb] = useState("");
  const [editSla, setEditSla] = useState("");
  const [saving, setSaving] = useState(false);

  const stageLabels = t.stages as Record<string, string>;

  function startEdit(config: StageConfigItem) {
    setEditingId(config.id);
    setEditProb(String(config.probabilityPct));
    setEditSla(config.slaHours != null ? String(config.slaHours) : "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSave(config: StageConfigItem) {
    setSaving(true);
    try {
      await updateStageConfig(config.id, {
        probabilityPct: Number(editProb),
        slaHours: editSla ? Number(editSla) : null,
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.nav.stageConfig}</h1>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t.kpis.stage}</TableHead>
                  <TableHead>{t.forms.entity}</TableHead>
                  <TableHead>
                    {locale === "ar" ? "نسبة الاحتمال %" : "Probability %"}
                  </TableHead>
                  <TableHead>
                    {locale === "ar" ? "SLA (ساعات)" : "SLA (Hours)"}
                  </TableHead>
                  <TableHead>{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="text-muted-foreground">
                      {config.displayOrder}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Badge variant="outline">
                        {stageLabels[config.stage] ?? config.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.entity ? (
                        <span className="text-sm">
                          {locale === "ar"
                            ? config.entity.nameAr
                            : config.entity.nameEn}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {locale === "ar" ? "افتراضي" : "Default"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === config.id ? (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={editProb}
                          onChange={(e) => setEditProb(e.target.value)}
                          className="w-24"
                          autoFocus
                        />
                      ) : (
                        <span className="ltr-nums">{config.probabilityPct}%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === config.id ? (
                        <Input
                          type="number"
                          min={0}
                          value={editSla}
                          onChange={(e) => setEditSla(e.target.value)}
                          className="w-24"
                          placeholder="-"
                        />
                      ) : (
                        <span className="ltr-nums">
                          {config.slaHours != null ? config.slaHours : "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === config.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(config)}
                            disabled={saving}
                          >
                            {t.common.save}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            {t.common.cancel}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(config)}
                        >
                          {t.common.edit}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
