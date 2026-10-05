import Link from "next/link";
import { restaurantConfig } from "@/config/restaurant";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

export function Footer() {
  const social = restaurantConfig.contact.social;

  return (
    <footer className="border-t border-stone-800 bg-stone-950 py-12 text-stone-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
          <div className="text-center md:text-left">
            <span className="font-serif text-xl font-bold tracking-widest text-stone-100">
              {restaurantConfig.name}
            </span>
            <p className="mt-3 text-xs text-stone-400">
              {restaurantConfig.contact.postalCode} {restaurantConfig.contact.address}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              TEL: {restaurantConfig.contact.phoneDisplay}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 text-xs md:items-end">
            <div className="flex flex-wrap justify-center gap-6 text-stone-300">
              <Link href="#about" className="transition hover:text-white">
                当店について
              </Link>
              <Link href="#menu" className="transition hover:text-white">
                お品書き
              </Link>
              <Link href="#access" className="transition hover:text-white">
                アクセス・営業時間
              </Link>
              <Link href="#news" className="transition hover:text-white">
                お知らせ
              </Link>
              <Link href="/sign-in" className="text-stone-400 transition hover:text-stone-200">
                店舗管理
              </Link>
            </div>

            {social && (
              <div className="flex items-center gap-4 text-stone-400">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="transition hover:text-white"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="transition hover:text-white"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            <p className="text-[11px] text-stone-400">
              © {restaurantConfig.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
