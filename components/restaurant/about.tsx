import Image from "next/image";
import { restaurantConfig } from "@/config/restaurant";

export function About() {
  const { about } = restaurantConfig;
  const [mainFeature, ...subFeatures] = about.features;

  return (
    <section
      id="about"
      className="scroll-mt-16 py-24 text-stone-900 transition-colors dark:text-stone-100"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <h2 className="font-serif text-2xl font-bold tracking-widest text-stone-900 dark:text-stone-100 sm:text-3xl">
            {about.heading}
          </h2>
          <div className="mx-auto my-3 h-px w-10 bg-primary/60" />
          <p className="font-serif text-base tracking-wide text-stone-700 dark:text-stone-300">
            {about.subheading}
          </p>

          <div className="mt-6 space-y-2 text-center font-serif text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {about.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="mt-16 space-y-14">
          {mainFeature && (
            <div className="animate-fade-up [animation-delay:150ms]">
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-md bg-stone-200/50 shadow-xs dark:bg-stone-900/50">
                {mainFeature.image && (
                  <Image
                    src={mainFeature.image}
                    alt={mainFeature.title}
                    fill
                    quality={70}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 976px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-950/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                  <h3 className="font-serif text-xl font-bold tracking-wider text-stone-100 sm:text-2xl">
                    {mainFeature.title}
                  </h3>
                  <p className="mt-2 max-w-xl font-serif text-xs leading-relaxed text-stone-200 sm:text-sm">
                    {mainFeature.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-14">
            {subFeatures.map((feature, idx) => (
              <div
                key={feature.title}
                className="group flex flex-col animate-fade-up"
                style={{ animationDelay: `${(idx + 2) * 150}ms` }}
              >
                {feature.image && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-stone-200/50 dark:bg-stone-900/50">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      quality={70}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="pt-5">
                  <h3 className="font-serif text-lg font-bold tracking-wider text-stone-900 dark:text-stone-100">
                    {feature.title}
                  </h3>
                  <p className="mt-2 font-serif text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
