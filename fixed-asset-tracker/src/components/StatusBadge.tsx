import { cn } from '@lumerahq/ui/lib';

const statusConfig: Record<string, { className: string; label: string }> = {
  active: { className: 'bg-green-100 text-green-700', label: 'Active' },
  fully_depreciated: { className: 'bg-amber-100 text-amber-700', label: 'Fully Depreciated' },
  disposed: { className: 'bg-slate-100 text-slate-700', label: 'Disposed' },
  pending: { className: 'bg-blue-100 text-blue-700', label: 'Pending' },
  posted: { className: 'bg-green-100 text-green-700', label: 'Posted' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { className: 'bg-slate-100 text-slate-700', label: status };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
