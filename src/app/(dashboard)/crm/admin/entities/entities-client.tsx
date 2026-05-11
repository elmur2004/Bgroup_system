"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateEntity } from "../actions";

type EntityItem = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  color: string;
  active: boolean;
};

export function EntitiesClient({ entities }: { entities: EntityItem[] }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EntityItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [color, setColor] = useState("#3b82f6");

  function openEdit(entity: EntityItem) {
    setEditing(entity);
    setNameEn(entity.nameEn);
    setNameAr(entity.nameAr);
    setColor(entity.color);
    setOpen(true);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateEntity(editing.id, { nameEn, nameAr, color });
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(entity: EntityItem) {
    await updateEntity(entity.id, { active: !entity.active });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.nav.entities}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((entity) => (
          <Card key={entity.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: entity.color }}
                  />
                  <span>{locale === "ar" ? entity.nameAr : entity.nameEn}</span>
                </CardTitle>
                <Badge variant="outline" className="font-mono">
                  {entity.code}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>EN: {entity.nameEn}</p>
                <p dir="rtl">AR: {entity.nameAr}</p>
                <p>
                  {locale === "ar" ? "اللون" : "Color"}:{" "}
                  <span
                    className="inline-block h-3 w-8 rounded align-middle"
                    style={{ backgroundColor: entity.color }}
                  />
                  <span className="ms-2 font-mono text-xs">{entity.color}</span>
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {entity.active ? (
                  <Badge variant="default" className="bg-emerald-600">
                    {t.common.active}
                  </Badge>
                ) : (
                  <Badge variant="secondary">{t.common.inactive}</Badge>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(entity)}
                  >
                    {t.common.edit}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(entity)}
                  >
                    {entity.active ? t.common.inactive : t.common.active}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t.common.edit} {t.nav.entities}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t.common.name} (EN)
              </label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Name (English)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t.common.name} (AR)
              </label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="الاسم بالعربية"
                dir="rtl"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {locale === "ar" ? "اللون" : "Color"}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saving || !nameEn || !nameAr}>
                {t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
