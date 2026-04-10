import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  Sparkles,
  FileBarChart2,
  FileSearch,
  CalendarDays,
} from 'lucide-react';
import { clsx } from 'clsx';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const reportTemplates = [
  { id: 1, nameKey: 'template1Name', descKey: 'template1Desc', icon: FileBarChart2, color: 'text-emerald-600 bg-emerald-50', pages: '24–32', format: 'PDF / DOCX' },
  { id: 2, nameKey: 'template2Name', descKey: 'template2Desc', icon: CalendarDays, color: 'text-blue-600 bg-blue-50', pages: '12–16', format: 'PDF' },
  { id: 3, nameKey: 'template3Name', descKey: 'template3Desc', icon: FileSearch, color: 'text-purple-600 bg-purple-50', pages: '48–60', format: 'PDF / DOCX / PPTX' },
];

const recentReports = [
  { nameKey: 'report1Name', dateKey: 'report1Date', status: 'ready', size: '4.2 MB', type: 'PDF' },
  { nameKey: 'report2Name', dateKey: 'report2Date', status: 'ready', size: '1.8 MB', type: 'PDF' },
  { nameKey: 'report3Name', dateKey: 'report3Date', status: 'ready', size: '8.6 MB', type: 'DOCX' },
  { nameKey: 'report4Name', dateKey: 'report4Date', status: 'draft', size: '1.5 MB', type: 'PDF' },
];

export default async function AiRtPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'aiRt' });

  return (
    <main id="main-content" className="flex-1">
      <Header locale={locale} title={t('title')} subtitle={t('subtitle')} />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('totalReports')}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">18</p>
            <p className="mt-0.5 text-xs text-slate-400">{t('since2022')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('thisYear')}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">4</p>
            <p className="mt-0.5 text-xs text-emerald-600">{t('readyDraftCount')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('supportedLanguages')}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">5</p>
            <p className="mt-0.5 text-xs text-slate-400">TR · EN · EL · RO · MK</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t('avgGenerationTime')}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">~45</p>
            <p className="mt-0.5 text-xs text-slate-400">{t('seconds')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Report Templates */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">{t('reportTemplates')}</h2>

            {reportTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className={clsx('rounded-xl p-3 shrink-0', template.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {t(template.nameKey as any)}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {t(template.descKey as any)}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span>{template.pages} {t('pageCount')}</span>
                        <span>·</span>
                        <span>{template.format}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                    <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('createWithAi')}
                    </button>
                    <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                      <Eye className="h-3.5 w-3.5" />
                      {t('preview')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Reports */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">{t('recentReports')}</h2>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <ul className="divide-y divide-slate-50">
                {recentReports.map((report, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {t(report.nameKey as any)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {t(report.dateKey as any)} · {report.size} · {report.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'ready' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          {t('draft')}
                        </span>
                      )}
                      <button className="rounded p-1 text-slate-400 hover:text-slate-600 transition">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Report Settings Panel */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-900 mb-3">{t('reportSettings')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                    {t('period')}
                  </label>
                  <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option>2024</option>
                    <option>2023</option>
                    <option>2022</option>
                    <option>Q1 2025</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                    {t('language')}
                  </label>
                  <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                    <option value="el">Ελληνικά</option>
                    <option value="ro">Română</option>
                    <option value="mk">Македонски</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{t('includeChartsLabel')}</span>
                  <div className="h-4 w-8 rounded-full bg-emerald-500 relative cursor-pointer">
                    <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{t('includeRecommendationsLabel')}</span>
                  <div className="h-4 w-8 rounded-full bg-emerald-500 relative cursor-pointer">
                    <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
