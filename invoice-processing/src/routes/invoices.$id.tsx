import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import { ArrowLeft, CheckCircle, ExternalLink, Loader2, Save, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getDownloadUrl } from '@lumerahq/ui/lib';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { getInvoice, updateInvoice } from '../lib/queries';

export const Route = createFileRoute('/invoices/$id')({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' ? 1000 : false;
    },
  });

  const [form, setForm] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    total_amount: '',
    currency: 'USD',
    description: '',
    notes: '',
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setForm({
        vendor_name: invoice.vendor_name || '',
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date?.split('T')[0] || '',
        due_date: invoice.due_date?.split('T')[0] || '',
        total_amount: invoice.total_amount != null ? String(invoice.total_amount) : '',
        currency: invoice.currency || 'USD',
        description: invoice.description || '',
        notes: invoice.notes || '',
      });

      if (invoice.document?.object_key) {
        getDownloadUrl(invoice.document.object_key).then(setPreviewUrl).catch(() => setPreviewUrl(null));
      }
    }
  }, [invoice]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateInvoice(id, {
        vendor_name: form.vendor_name,
        invoice_number: form.invoice_number,
        invoice_date: form.invoice_date || undefined,
        due_date: form.due_date || undefined,
        total_amount: form.total_amount ? Number(form.total_amount) : undefined,
        currency: form.currency,
        description: form.description,
        notes: form.notes,
      }),
    onSuccess: () => {
      toast.success('Changes saved');
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: () => toast.error('Failed to save changes'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'approved' | 'rejected') => updateInvoice(id, { status }),
    onSuccess: (_data, status) => {
      toast.success(status === 'approved' ? 'Invoice approved' : 'Invoice rejected');
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const editable = invoice?.status === 'draft' || invoice?.status === 'review';

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!invoice) {
    return <div className="py-8 text-center text-muted-foreground">Invoice not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/invoices' })}
          className="rounded-md border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {invoice.vendor_name || 'Untitled Invoice'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {invoice.invoice_number || 'No invoice number'}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />

        {invoice.status === 'review' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => statusMutation.mutate('approved')}
              disabled={statusMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="size-4" />
              Approve
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Document Preview */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Document</h2>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="size-3" />
                Open
              </a>
            )}
          </div>
          {previewUrl ? (
            <div className="rounded-lg overflow-hidden border doc-viewer-wrap" style={{ height: '80vh' }}>
              <style>{`
                .doc-viewer-wrap #react-doc-viewer { background: transparent; }
                .doc-viewer-wrap #pdf-renderer { overflow: auto; }
              `}</style>
              <DocViewer
                documents={[{ uri: previewUrl, fileName: invoice.document?.original_name || 'document' }]}
                pluginRenderers={DocViewerRenderers}
                prefetchMethod="GET"
                config={{
                  header: { disableHeader: true },
                  pdfVerticalScrollByDefault: true,
                  pdfZoom: { defaultZoom: 1, zoomJump: 0.2 },
                }}
                style={{ height: '100%' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm rounded-lg border border-dashed">
              No document uploaded
            </div>
          )}
        </div>

        {/* Right: Form Fields or Processing State */}
        <div className="space-y-4">
          {invoice.status === 'processing' ? (
            <div className="rounded-xl border bg-card p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Loader2 className="size-10 text-blue-500 animate-spin" />
              <h2 className="font-semibold text-lg mt-4">Extracting Invoice Data</h2>
              <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                AI is reading your document and extracting structured data. This usually takes a few seconds.
              </p>
              <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
                <div className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                Processing...
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <h2 className="font-semibold">Invoice Details</h2>

                <Field label="Vendor Name" value={form.vendor_name} editable={editable} onChange={(v) => setForm((f) => ({ ...f, vendor_name: v }))} />
                <Field label="Invoice Number" value={form.invoice_number} editable={editable} onChange={(v) => setForm((f) => ({ ...f, invoice_number: v }))} />

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Invoice Date" type="date" value={form.invoice_date} editable={editable} onChange={(v) => setForm((f) => ({ ...f, invoice_date: v }))} />
                  <Field label="Due Date" type="date" value={form.due_date} editable={editable} onChange={(v) => setForm((f) => ({ ...f, due_date: v }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Total Amount" type="number" value={form.total_amount} editable={editable} onChange={(v) => setForm((f) => ({ ...f, total_amount: v }))} />
                  <Field label="Currency" value={form.currency} editable={editable} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} />
                </div>

                <Field label="Description" value={form.description} editable={editable} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
                <Field label="Notes" value={form.notes} editable={editable} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />

                {editable && (
                  <button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save className="size-4" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>

              {/* Extracted Data */}
              {invoice.extracted_data && (
                <details className="rounded-xl border bg-card p-4">
                  <summary className="font-semibold cursor-pointer">Extracted Data (Raw)</summary>
                  <pre className="mt-3 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64">
                    {JSON.stringify(invoice.extracted_data, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  editable,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!editable}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
}
