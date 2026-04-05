'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { Globe, Bell, User, ChevronDown } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { useState } from 'react';
import { clsx } from 'clsx';

interface HeaderProps {
  locale: string;
  title: string;
  subtitle?: string;
}

export function Header({ locale, title, subtitle }: HeaderProps) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setLangOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Globe className="h-4 w-4" />
            <span className="font-medium">{localeNames[locale as Locale]}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {locales.map((l) => (
                <button
                  key={l}
                  onClick={() => handleLocaleChange(l)}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition',
                    l === locale
                      ? 'bg-emerald-50 font-medium text-emerald-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span className="text-xs uppercase tracking-wider text-slate-400">{l}</span>
                  <span>{localeNames[l]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification */}
        <button className="relative rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
            <User className="h-3.5 w-3.5 text-emerald-700" />
          </div>
          <span className="font-medium">Admin</span>
        </button>
      </div>
    </header>
  );
}
