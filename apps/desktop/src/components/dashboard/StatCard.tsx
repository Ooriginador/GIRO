import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight, LucideIcon } from 'lucide-react';
import { FC } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'blue';
}

export const StatCard: FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    destructive: 'bg-red-500/10 text-red-500',
    blue: 'bg-blue-500/10 text-blue-500',
  };

  const trendLabel = trend
    ? `${trend.isPositive ? 'Aumento' : 'Redução'} de ${trend.value}% em relação a ontem`
    : '';

  return (
    <Card
      className="overflow-hidden border-none bg-card/50 backdrop-blur-sm shadow-md transition-all hover:shadow-lg hover:translate-y-[-2px]"
      role="article"
      aria-label={`${title}: ${value}${description ? `, ${description}` : ''}${
        trendLabel ? `. ${trendLabel}` : ''
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2.5 ${variantStyles[variant]}`} aria-hidden="true">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>

        {trend ? (
          <div className="flex items-center gap-1.5 mt-2 transition-all animate-in slide-in-from-left-1 duration-500">
            <div
              className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                trend.isPositive ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600'
              }`}
              role="status"
              aria-label={trendLabel}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
              )}
              {trend.value}%
            </div>
            <span className="text-[11px] text-muted-foreground font-medium" aria-hidden="true">
              vs ontem
            </span>
          </div>
        ) : (
          description && (
            <p className="text-[11px] text-muted-foreground mt-2 font-medium line-clamp-1">
              {description}
            </p>
          )
        )}
      </CardContent>
      {/* Decorative gradient corner */}
      <div
        className={`absolute bottom-0 right-0 h-12 w-12 opacity-[0.03] transition-opacity group-hover:opacity-[0.06] pointer-events-none translate-x-4 translate-y-4 rounded-full ${
          variant === 'default'
            ? 'bg-primary'
            : variant === 'success'
            ? 'bg-green-500'
            : variant === 'warning'
            ? 'bg-yellow-500'
            : variant === 'destructive'
            ? 'bg-red-500'
            : 'bg-blue-500'
        }`}
        aria-hidden="true"
      />
    </Card>
  );
};
