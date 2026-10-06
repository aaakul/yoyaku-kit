import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { Footer } from "@/components/restaurant/footer";
import { Header } from "@/components/restaurant/header";
import { getNewsItem, getNewsList, getRestaurant } from "@/lib/db/queries";

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const restaurant = await getRestaurant();
  if (!restaurant) return [];
  const newsList = await getNewsList(restaurant.id, true);
  return newsList.map((item) => ({ id: item.id }));
}

async function getCachedNewsItem(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("news");
  return getNewsItem(id);
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getCachedNewsItem(id);

  if (!item || !item.isPublished) {
    return {
      title: "お知らせ",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: item.title,
    description: item.content.slice(0, 120),
  };
}

function NewsDetailSkeleton() {
  return (
    <article className="animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
      <div className="mt-4 h-8 w-3/4 rounded bg-muted sm:h-9" />
      <div className="my-8 h-px w-full bg-border" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/6 rounded bg-muted" />
      </div>
    </article>
  );
}

async function NewsDetailContent({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const item = await getCachedNewsItem(id);

  if (!item || !item.isPublished) {
    notFound();
  }

  return (
    <article>
      <div className="flex items-center gap-3">
        <time className="font-mono text-xs text-muted-foreground">{item.publishedAt}</time>
        <span className="inline-block rounded-xs border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-primary">
          {item.category}
        </span>
      </div>

      <h1 className="mt-4 font-serif text-2xl font-bold tracking-wide text-foreground sm:text-3xl">
        {item.title}
      </h1>

      <div className="my-8 h-px w-full bg-border" />

      <div className="prose prose-stone dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed text-stone-700 dark:text-stone-300 space-y-4">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="leading-relaxed whitespace-pre-wrap">{children}</p>,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:opacity-80"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-3">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-3">{children}</ol>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-3">
                {children}
              </blockquote>
            ),
          }}
        >
          {item.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}

export default function NewsDetailPage({ params }: NewsDetailPageProps) {
  return (
    <div className="flex min-h-screen flex-col washi-bg text-foreground selection:bg-primary selection:text-primary-foreground">
      <Header />
      <main className="flex-1 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-6">
            <Link
              href="/#news"
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium inline-flex items-center gap-1"
            >
              ← お知らせ一覧に戻る
            </Link>
          </div>

          <Suspense fallback={<NewsDetailSkeleton />}>
            <NewsDetailContent params={params} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
