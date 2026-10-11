import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { manrope } from "@/app/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { restaurantConfig } from "@/config/restaurant";
import { type Locale, routing } from "@/i18n/routing";

export const metadata: Metadata = {
  title: {
    default: `${restaurantConfig.name} | ${restaurantConfig.tagline}`,
    template: `%s | ${restaurantConfig.name}`,
  },
  description: `${restaurantConfig.summary} | yoyaku-kitは、小規模飲食店向けの予約・テーブル管理システムです。An open-source restaurant reservation and table management system built with Next.js 16 and PostgreSQL for small restaurants in Japan.`,
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      lang={locale}
      className={`scroll-smooth ${manrope.variable} ${manrope.className}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
