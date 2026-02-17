import { cn } from '@lumerahq/ui/lib';

const statusConfig: Record<string, { className: string; label: string }> = {
  draft: { className: 'bg-slate-100 text-slate-700', label: 'Draft' },
  processing: { className: 'bg-blue-100 text-blue-700', label: 'Processing' },
  review: { className: 'bg-amber-100 text-amber-700', label: 'Review' },
  posted: { className: 'bg-green-100 text-green-700', label: 'Posted' },
  rejected: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { className: 'bg-slate-100 text-slate-700', label: status };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
