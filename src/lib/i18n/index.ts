export { dictionaries, type Dictionary, type Locale } from "./dictionaries";
export { LocaleProvider, useLocale } from "./LocaleContext";
// Note: server.ts exports (getServerLocale, getServerT) must be imported directly
// from "@/lib/i18n/server" to avoid bundling next/headers into client components.
