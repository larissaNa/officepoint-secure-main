import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusMetricCardProps {
  title: string;
  count: number;
  percentage: number;
  variant: 'waiting' | 'working' | 'exiting' | 'finished' | 'absent';
}

const variantStyles = {
  waiting: {
    bg: 'bg-status-waiting/10',
    border: 'border-status-waiting/30',
    text: 'text-status-waiting',
    progress: 'bg-status-waiting',
  },
  working: {
    bg: 'bg-status-working/10',
    border: 'border-status-working/30',
    text: 'text-status-working',
    progress: 'bg-status-working',
  },
  exiting: {
    bg: 'bg-status-pending-exit/10',
    border: 'border-status-pending-exit/30',
    text: 'text-status-pending-exit',
    progress: 'bg-status-pending-exit',
  },
  finished: {
    bg: 'bg-status-finished/10',
    border: 'border-status-finished/30',
    text: 'text-status-finished',
    progress: 'bg-status-finished',
  },
  absent: {
    bg: 'bg-status-absent/10',
    border: 'border-status-absent/30',
    text: 'text-status-absent',
    progress: 'bg-status-absent',
  },
};

export function StatusMetricCard({ title, count, percentage, variant }: StatusMetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('border', styles.bg, styles.border)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className={cn('text-2xl font-bold', styles.text)}>{count}</span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{percentage}% do total</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-500', styles.progress)}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
