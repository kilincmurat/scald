import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Inter } from 'next/font/google'
import { locales, type Locale } from '@/lib/i18n/config'
import { Sidebar } from '@/components/layout/Sidebar'

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'greek'],
  variable: '--font-inter'
})

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LocaleLayoutProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: { template: `%s | ${t('appName')}`, default: t('appName') },
    description: t('description')
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <div className="flex min-h-screen">
            <Sidebar locale={locale} />
            <div className="flex flex-1 flex-col pl-64">
              {children}
            </div>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
