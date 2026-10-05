import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-background text-foreground">
      <div className="max-w-md space-y-6 p-4 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          404 - ページが見つかりません
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          お探しのページは移動または削除されたか、一時的にアクセスできない可能性があります。
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
