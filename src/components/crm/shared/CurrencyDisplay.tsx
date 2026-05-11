"use client";

import { useLocale } from "@/lib/i18n";
import type { CrmCurrency } from "@/types";

export function CurrencyDisplay({
  amount,
  currency,
  egpAmount,
  showEGP = true,
  className = "",
}: {
  amount: number;
  currency: CrmCurrency;
  egpAmount?: number;
  showEGP?: boolean;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const symbol = t.currencies[currency];
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  const egpFormatted = egpAmount
    ? new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(egpAmount)
    : null;

  return (
    <span className={`ltr-nums ${className}`}>
      {formatted} {symbol}
      {showEGP && currency !== "EGP" && egpFormatted && (
        <span className="text-muted-foreground text-sm ms-1">
          ({egpFormatted} {t.currencies.EGP})
        </span>
      )}
    </span>
  );
}
