import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  target?: string;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
  icon: React.ComponentType<{ className?: string }>;
}

const colorMap = {
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
};

export function StatCard({
  title,
  value,
  unit,
  trend,
  trendLabel,
  target,
  color = 'green',
  icon: Icon,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {unit && <span className="text-sm text-slate-400">{unit}</span>}
          </div>
        </div>
        <div className={clsx('rounded-lg p-2.5', colors.bg)}>
          <Icon className={clsx('h-5 w-5', colors.icon)} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
            {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
            {trend === 'stable' && <Minus className="h-3.5 w-3.5 text-slate-400" />}
            {trendLabel && (
              <span
                className={clsx(
                  'text-xs font-medium',
                  trend === 'up' && 'text-emerald-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'stable' && 'text-slate-500'
                )}
              >
                {trendLabel}
              </span>
            )}
          </div>
        )}
        {target && (
          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', colors.badge)}>
            Hedef: {target}
          </span>
        )}
      </div>
    </div>
  );
}
