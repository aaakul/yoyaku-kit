import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Footer } from "@/components/restaurant/footer";
import { Header } from "@/components/restaurant/header";
import { getNewsItem } from "@/lib/db/queries";

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsItem(id);

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

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const item = await getNewsItem(id);

  if (!item || !item.isPublished) {
    notFound();
  }

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
                  p: ({ children }) => (
                    <p className="leading-relaxed whitespace-pre-wrap">{children}</p>
                  ),
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
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 space-y-1 my-3">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 space-y-1 my-3">{children}</ol>
                  ),
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
