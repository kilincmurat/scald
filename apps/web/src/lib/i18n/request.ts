export const locales = ['tr', 'en', 'el', 'ro', 'mk'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'tr';

export const localeNames: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  el: 'Ελληνικά',
  ro: 'Română',
  mk: 'Македонски',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  tr: 'ltr',
  en: 'ltr',
  el: 'ltr',
  ro: 'ltr',
  mk: 'ltr',
};
