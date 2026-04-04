import { useTranslations } from 'next-intl';

/**
 * WCAG 2.4.1 - Bypass Blocks
 * Allows keyboard users to skip repetitive navigation.
 */
export function SkipToMain() {
  const t = useTranslations('accessibility');

  return (
    <a
      href="#main-content"
      className={[
        'fixed left-4 top-4 z-[9999] -translate-y-full',
        'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
        'shadow-md transition-transform',
        'focus:translate-y-0',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      ].join(' ')}
    >
      {t('skipToMain')}
    </a>
  );
}
