import Image from "next/image";
import Link from "next/link";
import { restaurantConfig } from "@/config/restaurant";

export function Hero() {
  const { hero } = restaurantConfig;

  return (
    <section className="relative flex min-h-[75vh] w-full items-center justify-center overflow-hidden bg-stone-900 text-white">
      <div className="absolute inset-0 z-0">
        <Image
          src={hero.backgroundImage}
          alt={hero.title}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-bold tracking-widest text-stone-100 sm:text-5xl md:text-6xl animate-fade-up">
          {hero.title}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl font-serif text-base leading-relaxed text-stone-300 sm:text-lg animate-fade-up [animation-delay:150ms]">
          {hero.subtitle}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-up [animation-delay:300ms]">
          <Link
            href="#reservation"
            className="w-full rounded bg-primary px-8 py-3.5 text-center font-serif text-sm font-semibold tracking-widest text-primary-foreground shadow-md transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            ご予約・アクセス
          </Link>
          <Link
            href="#menu"
            className="w-full rounded border border-stone-400/40 bg-stone-900/60 px-8 py-3.5 text-center font-serif text-sm font-semibold tracking-widest text-stone-200 backdrop-blur-xs transition hover:bg-stone-800 hover:text-white sm:w-auto"
          >
            お品書きを見る
          </Link>
        </div>
      </div>
    </section>
  );
}
