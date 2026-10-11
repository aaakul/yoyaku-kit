import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reserve" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: getPathname({ href: "/reserve", locale: locale as Locale }),
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, getPathname({ href: "/reserve", locale: loc })]),
      ),
    },
  };
}

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
