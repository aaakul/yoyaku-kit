import Link from "next/link";
import { restaurantConfig } from "@/config/restaurant";

export interface NewsArticleItem {
  id: string;
  category: string;
  title: string;
  publishedAt: string;
  content?: string | null;
}

export interface NewsProps {
  newsList?: NewsArticleItem[];
}

export function News({ newsList }: NewsProps) {
  const displayNews: NewsArticleItem[] =
    newsList && newsList.length > 0
      ? newsList
      : restaurantConfig.news.map((n) => ({
          id: n.id,
          category: n.category,
          title: n.title,
          publishedAt: n.date,
          content: n.content,
        }));

  return (
    <section
      id="news"
      className="scroll-mt-16 py-20 text-stone-900 transition-colors dark:text-stone-100"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-widest text-stone-900 dark:text-stone-100 sm:text-3xl">
            お知らせ
          </h2>
          <div className="mx-auto my-3 h-px w-10 bg-primary/60" />
        </div>

        <div className="mt-12 divide-y divide-border border-y border-border animate-fade-up">
          {displayNews.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="group block py-5 transition hover:bg-accent/40"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <time className="font-mono text-xs text-muted-foreground sm:w-28 shrink-0">
                  {item.publishedAt}
                </time>
                <div className="shrink-0">
                  <span className="inline-block rounded-xs border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-primary">
                    {item.category}
                  </span>
                </div>
                <h3 className="font-serif text-sm font-semibold tracking-wide text-foreground group-hover:text-primary sm:text-base transition-colors">
                  {item.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
