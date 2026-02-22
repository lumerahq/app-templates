const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  promised: 'bg-purple-100 text-purple-700',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
  open: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  written_off: 'bg-slate-100 text-slate-700',
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  // Audit log
  customer: 'bg-purple-100 text-purple-700',
  invoice: 'bg-blue-100 text-blue-700',
  create: 'bg-green-100 text-green-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  // Activity types
  email: 'bg-blue-100 text-blue-700',
  call: 'bg-amber-100 text-amber-700',
  note: 'bg-slate-100 text-slate-700',
  promise: 'bg-purple-100 text-purple-700',
  escalation: 'bg-red-100 text-red-700',
  payment: 'bg-green-100 text-green-700',
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
