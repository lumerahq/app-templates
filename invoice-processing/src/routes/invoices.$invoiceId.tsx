import { pbGet, pbUpdate, createRun, pollRun, getDownloadUrl } from '@lumerahq/ui/lib';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Bot, Check, Clock, Download, FileText, Send, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AuditEntry, Invoice, Vendor } from '../lib/queries';
import { getAuditLog, logAction } from '../lib/queries';

export const Route = createFileRoute('/invoices/$invoiceId')({
  component: InvoiceDetailPage,
});

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  coded: 'bg-indigo-100 text-indigo-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  posted: 'bg-emerald-100 text-emerald-800',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// --- Document Preview Panel ---
function DocumentPreview({ doc }: { doc: { object_key: string; original_name: string; content_type: string } }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['file-url', doc.object_key],
    queryFn: () => getDownloadUrl(doc.object_key),
    staleTime: 10 * 60 * 1000, // presigned URLs last ~15 min
  });

  const isImage = doc.content_type?.startsWith('image/');
  const isPdf = doc.content_type === 'application/pdf';

  const handleDownload = () => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.original_name;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="rounded-xl border bg-card flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{doc.original_name}</span>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!url}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          title="Download"
        >
          <Download className="size-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 bg-muted/30">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
          </div>
        )}
        {url && isPdf && (
          <iframe src={url} className="w-full h-full min-h-[600px]" title="Invoice document" />
        )}
        {url && isImage && (
          <div className="flex items-center justify-center p-4 h-full">
            <img src={url} alt="Invoice document" className="max-w-full max-h-full object-contain rounded" />
          </div>
        )}
        {url && !isPdf && !isImage && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center min-h-[200px]">
            <FileText className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Preview not available for this file type
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="text-sm text-primary hover:underline"
            >
              Download to view
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const queryClient = useQueryClient();
  const [aiRunning, setAiRunning] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => pbGet<Invoice>('invoices', invoiceId),
  });

  const vendorQuery = useQuery({
    queryKey: ['vendor', invoiceQuery.data?.vendor],
    queryFn: () => pbGet<Vendor>('vendors', invoiceQuery.data!.vendor),
    enabled: !!invoiceQuery.data?.vendor,
  });

  const auditQuery = useQuery({
    queryKey: ['audit-log', invoiceId],
    queryFn: () => getAuditLog(invoiceId),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, extra }: { status: string; extra?: Record<string, unknown> }) => {
      return pbUpdate('invoices', invoiceId, { status, ...extra });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
    },
  });

  const handleApprove = () => {
    statusMutation.mutate(
      { status: 'approved', extra: { approved_by: 'current_user', approved_at: new Date().toISOString() } },
      {
        onSuccess: () => {
          toast.success('Invoice approved');
          logAction(invoiceId, 'approved', 'Invoice approved');
          queryClient.invalidateQueries({ queryKey: ['audit-log', invoiceId] });
        },
      }
    );
  };

  const handleReject = () => {
    statusMutation.mutate(
      { status: 'rejected' },
      {
        onSuccess: () => {
          toast.success('Invoice rejected');
          logAction(invoiceId, 'rejected', 'Invoice rejected');
          queryClient.invalidateQueries({ queryKey: ['audit-log', invoiceId] });
        },
      }
    );
  };

  const handlePost = () => {
    statusMutation.mutate(
      { status: 'posted' },
      {
        onSuccess: () => {
          toast.success('Invoice posted');
          logAction(invoiceId, 'posted', 'Invoice posted to ERP');
          queryClient.invalidateQueries({ queryKey: ['audit-log', invoiceId] });
        },
      }
    );
  };

  const handleRunAI = async () => {
    setAiRunning(true);
    try {
      const run = await createRun({
        automationId: '{{projectName}}:classify_and_code',
        inputs: { invoice_id: invoiceId },
      });
      toast.info('AI coding started...');
      const result = await pollRun(run.id);
      if (result.status === 'succeeded') {
        toast.success('AI coding complete');
        logAction(invoiceId, 'ai_coded', 'AI classification completed');
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
        queryClient.invalidateQueries({ queryKey: ['audit-log', invoiceId] });
      } else {
        toast.error(`AI coding failed: ${result.error || 'Unknown error'}`);
        logAction(invoiceId, 'ai_failed', `AI coding failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error(`Failed to start AI coding: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAiRunning(false);
    }
  };

  const invoice = invoiceQuery.data;
  const vendor = vendorQuery.data;

  if (invoiceQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Link to="/invoices" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="size-4" /> Back to invoices
        </Link>
        <p className="text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const status = invoice.status;
  const canRunAI = ['received', 'processing'].includes(status);
  const canApprove = ['coded', 'pending_approval'].includes(status);
  const canReject = ['coded', 'pending_approval'].includes(status);
  const canPost = status === 'approved';

  // source_document is a FileDescriptor object when populated
  const doc = invoice.source_document as unknown as
    | { object_key: string; original_name: string; content_type: string }
    | null
    | undefined;
  const hasDocument = doc && typeof doc === 'object' && doc.object_key;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link to="/invoices" className="text-sm text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="size-4" /> Back to invoices
          </Link>
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <p className="text-muted-foreground">{vendor?.name || 'Unknown Vendor'}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'}`}
        >
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Main content: document preview (left) + details (right) */}
      <div className={`grid gap-6 ${hasDocument ? 'lg:grid-cols-[1fr_1fr]' : ''}`}>
        {/* Left: Document preview */}
        {hasDocument && <DocumentPreview doc={doc} />}

        {/* Right: Invoice details + GL Coding */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Invoice Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-semibold text-lg">{formatCurrency(invoice.amount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Invoice Date</dt>
                <dd>{invoice.date || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Due Date</dt>
                <dd>{invoice.due_date || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vendor</dt>
                <dd>{vendor?.name || '—'}</dd>
              </div>
            </dl>
            {invoice.description && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{invoice.description}</p>
              </div>
            )}
          </div>

          {/* GL Coding */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold">GL Coding</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">GL Code</dt>
                <dd className="font-medium">{invoice.gl_code || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Department</dt>
                <dd>{invoice.department || '—'}</dd>
              </div>
            </dl>

            {/* Confidence bar */}
            {invoice.coding_confidence > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  AI Confidence: <span className="font-medium text-foreground">{invoice.coding_confidence}%</span>
                </p>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      invoice.coding_confidence >= 90
                        ? 'bg-green-500'
                        : invoice.coding_confidence >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${invoice.coding_confidence}%` }}
                  />
                </div>
              </div>
            )}

            {/* AI notes */}
            {invoice.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {canRunAI && (
              <button
                type="button"
                onClick={handleRunAI}
                disabled={aiRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Bot className="size-4" />
                {aiRunning ? 'Running...' : 'Run AI Coding'}
              </button>
            )}
            {canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={statusMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="size-4" /> Approve
              </button>
            )}
            {canReject && (
              <button
                type="button"
                onClick={handleReject}
                disabled={statusMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <X className="size-4" /> Reject
              </button>
            )}
            {canPost && (
              <button
                type="button"
                onClick={handlePost}
                disabled={statusMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="size-4" /> Post to ERP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Activity Log</h2>
        {auditQuery.isLoading ? (
          <div className="h-16 bg-muted animate-pulse rounded" />
        ) : (auditQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {(auditQuery.data ?? []).map((entry: AuditEntry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <Clock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{entry.action.replace(/_/g, ' ')}</span>
                  {entry.details && (
                    <span className="text-muted-foreground"> — {entry.details}</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.created ? new Date(entry.created).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
