import { cn } from '@lumerahq/ui/lib';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && <div className="rounded-lg bg-muted p-2.5 text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}
