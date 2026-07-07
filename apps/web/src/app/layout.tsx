import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { AccessibilityWidget } from '@/components/a11y/AccessibilityWidget';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
});

export async function generateMetadata() {
  const t = await getTranslations('metadata');
  return {
    title: { template: `%s | ${t('appName')}`, default: t('appName') },
    description: t('description'),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <a href="#main-content" className="a11y-skip-link">
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <AccessibilityWidget />
      </body>
    </html>
  );
}
