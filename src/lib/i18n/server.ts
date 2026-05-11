import { cookies, headers } from "next/headers";
import { dictionaries, type Dictionary, type Locale } from "./dictionaries";

const COOKIE_NAME = "bgroup-locale";
const DEFAULT_LOCALE: Locale = "ar";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (cookie?.value === "en" || cookie?.value === "ar") {
    return cookie.value;
  }

  const headerStore = await headers();
  const acceptLang = headerStore.get("accept-language") ?? "";
  if (acceptLang.startsWith("en")) return "en";

  return DEFAULT_LOCALE;
}

export async function getServerT(): Promise<{
  t: Dictionary;
  locale: Locale;
  dir: "rtl" | "ltr";
}> {
  const locale = await getServerLocale();
  return {
    t: dictionaries[locale],
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
  };
}
