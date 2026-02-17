import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getDownloadUrl } from '@lumerahq/ui/lib';
import { StatusBadge } from '../components/StatusBadge';
import { formatAmount, getPayrollRun, listJournalEntries, updatePayrollRun } from '../lib/queries';

export const Route = createFileRoute('/payroll-runs/$id')({
  component: PayrollRunDetailPage,
});

function PayrollRunDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: run, isLoading } = useQuery({
    queryKey: ['payroll-run', id],
    queryFn: () => getPayrollRun(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' ? 1000 : false;
    },
  });

  const { data: entries } = useQuery({
    queryKey: ['journal-entries', id],
    queryFn: () => listJournalEntries(id),
    enabled: run?.status !== 'processing' && run?.status !== 'draft',
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (run?.document?.object_key) {
      getDownloadUrl(run.document.object_key).then(setPreviewUrl).catch(() => setPreviewUrl(null));
    }
  }, [run]);

  const statusMutation = useMutation({
    mutationFn: (status: 'posted' | 'rejected') => updatePayrollRun(id, { status }),
    onSuccess: (_data, status) => {
      toast.success(status === 'posted' ? 'Journal entry posted' : 'Payroll run rejected');
      queryClient.invalidateQueries({ queryKey: ['payroll-run', id] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!run) {
    return <div className="py-8 text-center text-muted-foreground">Payroll run not found.</div>;
  }

  const isImage = run.document?.content_type?.startsWith('image/');
  const journalItems = entries?.items || [];
  const totalDebits = journalItems.reduce((sum, e) => sum + (e.debit_amount || 0), 0);
  const totalCredits = journalItems.reduce((sum, e) => sum + (e.credit_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/payroll-runs' })}
          className="rounded-md border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {formatPeriod(run.pay_period_start, run.pay_period_end)}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Pay date: {run.pay_date?.split('T')[0] || 'Not set'}
          </p>
        </div>
        <StatusBadge status={run.status} />

        {run.status === 'review' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => statusMutation.mutate('posted')}
              disabled={statusMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="size-4" />
              Post
            </button>
            <button
              type="button"
              onClick={() => statusMutation.mutate('rejected')}
              disabled={statusMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <XCircle className="size-4" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Processing state */}
      {run.status === 'processing' && (
        <div className="rounded-xl border bg-card p-8 flex flex-col items-center justify-center text-center">
          <Loader2 className="size-10 text-blue-500 animate-spin" />
          <h2 className="font-semibold text-lg mt-4">Extracting Payroll Data</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs">
            AI is reading your payroll report and generating journal entry lines. This usually takes a few seconds.
          </p>
          <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
            <div className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
            Processing...
          </div>
        </div>
      )}

      {/* Document + Journal Entries */}
      {run.status !== 'processing' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Document */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold mb-3">Document</h2>
            {previewUrl ? (
              isImage ? (
                <img src={previewUrl} alt="Payroll report" className="w-full rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center h-48 rounded-lg border border-dashed gap-3">
                  <p className="text-muted-foreground text-sm">{run.document?.original_name || 'Document'}</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <ExternalLink className="size-4" />
                    Open Document
                  </a>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm rounded-lg border border-dashed">
                No document uploaded
              </div>
            )}

            {run.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{run.notes}</p>
              </div>
            )}
          </div>

          {/* Right: Journal Entries Table */}
          <div className="lg:col-span-2 rounded-xl border bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Journal Entries</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {journalItems.length} line{journalItems.length !== 1 ? 's' : ''}
              </p>
            </div>

            {journalItems.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Account</th>
                    <th className="px-4 py-2 font-medium">Department</th>
                    <th className="px-4 py-2 font-medium text-right">Debit</th>
                    <th className="px-4 py-2 font-medium text-right">Credit</th>
                    <th className="px-4 py-2 font-medium">Memo</th>
                  </tr>
                </thead>
                <tbody>
                  {journalItems.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-muted-foreground mr-1.5">{entry.account_code}</span>
                        {entry.account_name}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{entry.department || '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {entry.debit_amount ? formatAmount(entry.debit_amount) : ''}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {entry.credit_amount ? formatAmount(entry.credit_amount) : ''}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{entry.memo || ''}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-4 py-2" colSpan={2}>Total</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatAmount(totalDebits)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatAmount(totalCredits)}</td>
                    <td className="px-4 py-2">
                      {Math.abs(totalDebits - totalCredits) > 0.01 && (
                        <span className="text-red-600 text-xs">Out of balance</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No journal entries yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extracted Data */}
      {run.extracted_data && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="font-semibold cursor-pointer">Extracted Data (Raw)</summary>
          <pre className="mt-3 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64">
            {JSON.stringify(run.extracted_data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function formatPeriod(start?: string, end?: string): string {
  if (!start && !end) return 'Payroll Run';
  const s = start?.split('T')[0] || '?';
  const e = end?.split('T')[0] || '?';
  return `${s} to ${e}`;
}
