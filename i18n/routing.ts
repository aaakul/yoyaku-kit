import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "en", "zh-Hans", "zh-Hant"],
  defaultLocale: "ja",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
