import { Sidebar } from '@/components/layout/Sidebar';
import '@/app/globals.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar locale={locale} />
      <div className="flex flex-1 flex-col pl-64">
        {children}
      </div>
    </div>
  );
}
