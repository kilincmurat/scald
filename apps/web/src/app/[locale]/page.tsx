import { getTranslations } from 'next-intl/server';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">{t('appName')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('description')}</p>
      </div>
    </main>
  );
}
