import { DashboardShell } from '@/components/layout/DashboardShell';
import '@/app/globals.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
