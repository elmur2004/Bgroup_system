"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateFxRate } from "../actions";

type FxRateItem = {
  id: string;
  currency: string;
  toEGP: unknown;
  updatedAt: string;
};

export function FxRatesClient({ rates }: { rates: FxRateItem[] }) {
  const { t, locale } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [saving, setSaving] = useState(false);

  const currencyNames = t.currencyNames as Record<string, string>;
  const currencySymbols = t.currencies as Record<string, string>;

  function startEdit(rate: FxRateItem) {
    setEditingId(rate.id);
    setEditRate(String(Number(rate.toEGP)));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRate("");
  }

  async function handleSave(rate: FxRateItem) {
    setSaving(true);
    try {
      await updateFxRate(rate.currency, Number(editRate));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.nav.fxRates}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar"
              ? "تحذير: تغييرات الأسعار لا تطبق بأثر رجعي على الفرص الحالية"
              : "Warning: Rate changes are non-retroactive and will not update existing opportunities"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "ar" ? "العملة" : "CrmCurrency"}</TableHead>
                  <TableHead>{locale === "ar" ? "الرمز" : "Symbol"}</TableHead>
                  <TableHead>
                    {locale === "ar" ? "السعر مقابل ج.م" : "Rate to EGP"}
                  </TableHead>
                  <TableHead>
                    {locale === "ar" ? "آخر تحديث" : "Last Updated"}
                  </TableHead>
                  <TableHead>{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      {currencyNames[rate.currency] ?? rate.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {currencySymbols[rate.currency] ?? rate.currency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === rate.id ? (
                        <Input
                          type="number"
                          step="0.0001"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-32"
                          autoFocus
                        />
                      ) : (
                        <span className="ltr-nums font-mono">
                          {Number(rate.toEGP).toLocaleString(undefined, {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(rate.updatedAt).toLocaleDateString(
                        locale === "ar" ? "ar-EG" : "en-US",
                        { dateStyle: "medium" }
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === rate.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(rate)}
                            disabled={saving || !editRate}
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
                          onClick={() => startEdit(rate)}
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
