import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'total' | 'working' | 'finished' | 'waiting';
}

const variantStyles = {
  total: 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
  working: 'bg-gradient-to-br from-status-working to-status-working/80 text-status-working-foreground',
  finished: 'bg-gradient-to-br from-kpi-finished to-kpi-finished/80 text-primary-foreground',
  waiting: 'bg-gradient-to-br from-status-waiting to-status-waiting/80 text-status-waiting-foreground',
};

export function KPICard({ title, value, icon: Icon, variant }: KPICardProps) {
  return (
    <Card className={cn('overflow-hidden border-0 shadow-lg animate-slide-up', variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="mt-2 text-4xl font-bold">{value}</p>
          </div>
          <div className="rounded-full bg-white/20 p-3">
            <Icon className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
