import type { CrmCurrency } from "@/generated/prisma";

export type FxRateMap = Record<CrmCurrency, number>;

export function convertToEGP(
  amount: number,
  currency: CrmCurrency,
  fxRates: FxRateMap
): number {
  const rate = fxRates[currency] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

export function displayCurrency(
  amount: number,
  currency: CrmCurrency,
  locale: "ar" | "en"
): string {
  const symbols: Record<CrmCurrency, string> = {
    EGP: locale === "ar" ? "ج.م" : "EGP",
    USD: "$",
    SAR: locale === "ar" ? "ر.س" : "SAR",
    AED: locale === "ar" ? "د.إ" : "AED",
    QAR: locale === "ar" ? "ر.ق" : "QAR",
  };

  const formatted = new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
  ).format(amount);

  return `${formatted} ${symbols[currency]}`;
}
