"use client";

import { useLocale } from "@/lib/i18n";

export function DateDisplay({
  date,
  showTime = false,
  className = "",
}: {
  date: Date | string;
  showTime?: boolean;
  className?: string;
}) {
  const { locale } = useLocale();
  const d = typeof date === "string" ? new Date(date) : date;

  const formatted = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(showTime && { hour: "2-digit", minute: "2-digit" }),
    }
  ).format(d);

  return <span className={`ltr-nums ${className}`}>{formatted}</span>;
}

export function RelativeDate({
  date,
  className = "",
}: {
  date: Date | string;
  className?: string;
}) {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const { locale } = useLocale();

  let text: string;
  if (diffDays === 0) {
    text = locale === "ar" ? "اليوم" : "Today";
  } else if (diffDays === 1) {
    text = locale === "ar" ? "أمس" : "Yesterday";
  } else if (diffDays < 7) {
    text = locale === "ar" ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
  } else {
    return <DateDisplay date={d} className={className} />;
  }

  return <span className={className}>{text}</span>;
}
