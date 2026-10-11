import { useFormatter, useTranslations } from "next-intl";
import { restaurantConfig } from "@/config/restaurant";

export interface MenuItem {
  name: string;
  description?: string | null;
  price: number;
  badge?: string | null;
}

export interface MenuSection {
  title: string;
  subtitle?: string | null;
  items: MenuItem[];
}

export interface MenuProps {
  note?: string | null;
  sections?: MenuSection[];
}

export function Menu({ note, sections }: MenuProps = {}) {
  const t = useTranslations("home");
  const format = useFormatter();
  const displayNote = note ?? t("menu_tax_note");

  let displaySections: MenuSection[] = sections && sections.length > 0 ? sections : [];
  if (displaySections.length === 0) {
    try {
      const raw = t.raw("menu_sections");
      if (Array.isArray(raw)) {
        displaySections = raw as MenuSection[];
      }
    } catch {
      // Fallback to static config if raw key not found
    }
  }
  if (displaySections.length === 0) {
    displaySections = restaurantConfig.menu.sections;
  }

  return (
    <section
      id="menu"
      className="scroll-mt-16 py-20 text-stone-900 transition-colors dark:text-stone-100"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-widest text-stone-900 dark:text-stone-100 sm:text-3xl">
            {t("menu_title")}
          </h2>
          <div className="mx-auto my-3 h-px w-10 bg-primary/60" />
          <p className="whitespace-pre-line text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {displayNote}
          </p>
        </div>

        <div className="mt-16 space-y-16">
          {displaySections.map((section) => (
            <div key={section.title} className="border-t border-border pt-10 animate-fade-up">
              <div className="mb-8 text-center sm:text-left">
                <h3 className="font-serif text-xl font-bold tracking-wider text-stone-900 dark:text-stone-100 sm:text-2xl">
                  {section.title}
                </h3>
                {section.subtitle && (
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {section.subtitle}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-12 md:gap-y-8">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col justify-between border-b border-border/60 pb-4"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-semibold tracking-wide text-stone-900 dark:text-stone-100">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="rounded-xs bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        ¥{format.number(item.price)}
                      </div>
                    </div>

                    {item.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
