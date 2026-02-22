import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getDownloadUrl } from '@lumerahq/ui/lib';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import {
  type Comment,
  type GlAccount,
  type LineItem,
  createComment,
  createLineItem,
  deleteLineItem,
  formatAmount,
  formatDate,
  getInvoice,
  listComments,
  listGlAccounts,
  listLineItems,
  updateInvoice,
  updateLineItem,
} from '../lib/queries';

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

  const { data: lineItems } = useQuery({
    queryKey: ['line-items', id],
    queryFn: () => listLineItems(id),
    enabled: !!invoice && invoice.status !== 'processing',
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => listComments(id),
    enabled: !!invoice,
  });

  const { data: glAccountsData } = useQuery({
    queryKey: ['gl-accounts'],
    queryFn: listGlAccounts,
  });
  const glAccounts = glAccountsData?.items ?? [];

  const [form, setForm] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    total_amount: '',
    currency: 'USD',
    description: '',
    notes: '',
    gl_code: '',
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formInitId, setFormInitId] = useState<string | null>(null);
  const [approvePrompt, setApprovePrompt] = useState(false);
  const [rejectPrompt, setRejectPrompt] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [commentText, setCommentText] = useState('');

  // Initialize form when invoice first loads or its id/status changes
  useEffect(() => {
    if (!invoice) return;
    // Only init the form once per invoice load, or when status changes (e.g. processing → review)
    const key = `${invoice.id}:${invoice.status}`;
    if (key === formInitId) return;
    setFormInitId(key);
    setForm({
      vendor_name: invoice.vendor_name || '',
      invoice_number: invoice.invoice_number || '',
      invoice_date: invoice.invoice_date?.split('T')[0] || '',
      due_date: invoice.due_date?.split('T')[0] || '',
      total_amount: invoice.total_amount != null ? String(invoice.total_amount) : '',
      currency: invoice.currency || 'USD',
      description: invoice.description || '',
      notes: invoice.notes || '',
      gl_code: invoice.gl_code || '',
    });
  }, [invoice, formInitId]);

  // Fetch preview URL only when the document key changes (stable across refetches)
  const documentKey = invoice?.document?.object_key;
  useEffect(() => {
    if (documentKey) {
      getDownloadUrl(documentKey).then(setPreviewUrl).catch(() => setPreviewUrl(null));
    }
  }, [documentKey]);

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
        gl_code: form.gl_code,
      }),
    onSuccess: () => {
      toast.success('Changes saved');
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: () => toast.error('Failed to save changes'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: 'approved' | 'rejected'; note: string }) => {
      // Create the comment first
      if (note.trim()) {
        await createComment({
          invoice_id: id,
          content: note.trim(),
          comment_type: status === 'approved' ? 'approval' : 'rejection',
          author_name: '',
          author_email: '',
        });
      }
      return updateInvoice(id, { status });
    },
    onSuccess: (_data, { status }) => {
      toast.success(status === 'approved' ? 'Invoice approved' : 'Invoice rejected');
      setApprovePrompt(false);
      setRejectPrompt(false);
      setActionNote('');
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const addCommentMutation = useMutation({
    mutationFn: () =>
      createComment({
        invoice_id: id,
        content: commentText.trim(),
        comment_type: 'comment',
        author_name: '',
        author_email: '',
      }),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
    },
    onError: () => toast.error('Failed to add comment'),
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
      {/* Header */}
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

        {invoice.status === 'review' && !approvePrompt && !rejectPrompt && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setApprovePrompt(true); setRejectPrompt(false); setActionNote(''); }}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="size-4" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => { setRejectPrompt(true); setApprovePrompt(false); setActionNote(''); }}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <XCircle className="size-4" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Approve/Reject Prompt */}
      {approvePrompt && (
        <ActionPrompt
          title="Approve Invoice"
          placeholder="Add a note (optional)"
          required={false}
          confirmLabel="Confirm Approval"
          confirmColor="bg-green-600 hover:bg-green-700"
          value={actionNote}
          onChange={setActionNote}
          onConfirm={() => statusMutation.mutate({ status: 'approved', note: actionNote })}
          onCancel={() => { setApprovePrompt(false); setActionNote(''); }}
          isPending={statusMutation.isPending}
        />
      )}
      {rejectPrompt && (
        <ActionPrompt
          title="Reject Invoice"
          placeholder="Reason for rejection"
          required
          confirmLabel="Confirm Rejection"
          confirmColor="bg-red-600 hover:bg-red-700"
          value={actionNote}
          onChange={setActionNote}
          onConfirm={() => statusMutation.mutate({ status: 'rejected', note: actionNote })}
          onCancel={() => { setRejectPrompt(false); setActionNote(''); }}
          isPending={statusMutation.isPending}
        />
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Document Preview */}
        <DocumentPreview previewUrl={previewUrl} fileName={invoice.document?.original_name || 'document'} />

        {/* Right: Form + Line Items + Comments */}
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
              {/* Invoice Details Form */}
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

                {/* GL Code Dropdown */}
                <label className="block">
                  <span className="block text-sm font-medium text-muted-foreground mb-1">GL Code</span>
                  <select
                    value={form.gl_code}
                    onChange={(e) => setForm((f) => ({ ...f, gl_code: e.target.value }))}
                    disabled={!editable}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">— Select GL Code —</option>
                    {glAccounts.map((gl) => (
                      <option key={gl.id} value={gl.code}>
                        {gl.code} — {gl.name}
                      </option>
                    ))}
                  </select>
                </label>

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

              {/* Line Items */}
              <LineItemsSection
                invoiceId={id}
                lineItems={lineItems ?? []}
                glAccounts={glAccounts}
                editable={editable}
                headerTotal={form.total_amount ? Number(form.total_amount) : null}
                currency={form.currency}
              />

              {/* Extracted Data (Raw) */}
              {invoice.extracted_data && (
                <details className="rounded-xl border bg-card p-4">
                  <summary className="font-semibold cursor-pointer">Extracted Data (Raw)</summary>
                  <pre className="mt-3 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64">
                    {JSON.stringify(invoice.extracted_data, null, 2)}
                  </pre>
                </details>
              )}

              {/* Activity Timeline */}
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <h2 className="font-semibold">Activity</h2>

                {comments && comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <CommentEntry key={c.id} comment={c} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}

                {/* Add Comment */}
                <div className="flex gap-2 pt-2 border-t">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && commentText.trim()) addCommentMutation.mutate();
                    }}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => addCommentMutation.mutate()}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Action Prompt ---

function ActionPrompt({
  title, placeholder, required, confirmLabel, confirmColor, value, onChange, onConfirm, onCancel, isPending,
}: {
  title: string;
  placeholder: string;
  required: boolean;
  confirmLabel: string;
  confirmColor: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending || (required && !value.trim())}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${confirmColor}`}
        >
          {isPending ? 'Processing...' : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Document Preview (memoized to prevent re-renders on form changes) ---

const DocumentPreview = memo(function DocumentPreview({
  previewUrl,
  fileName,
}: {
  previewUrl: string | null;
  fileName: string;
}) {
  const documents = useMemo(
    () => (previewUrl ? [{ uri: previewUrl, fileName }] : []),
    [previewUrl, fileName],
  );

  return (
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
            documents={documents}
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
  );
});

// --- Line Items Section ---

function LineItemsSection({
  invoiceId, lineItems, glAccounts, editable, headerTotal, currency,
}: {
  invoiceId: string;
  lineItems: LineItem[];
  glAccounts: GlAccount[];
  editable: boolean;
  headerTotal: number | null;
  currency: string;
}) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => createLineItem({ invoice_id: invoiceId, description: '', quantity: 1, unit_price: 0, amount: 0, gl_code: '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['line-items', invoiceId] }),
    onError: () => toast.error('Failed to add line item'),
  });

  const updateMut = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<LineItem> }) => updateLineItem(itemId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['line-items', invoiceId] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteLineItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-items', invoiceId] });
      toast.success('Line item removed');
    },
    onError: () => toast.error('Failed to remove line item'),
  });

  const lineTotal = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const mismatch = headerTotal != null && lineItems.length > 0 && Math.abs(lineTotal - headerTotal) > 0.01;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Line Items ({lineItems.length})</h2>
        {editable && (
          <button
            type="button"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted transition-colors"
          >
            <Plus className="size-3" />
            Add
          </button>
        )}
      </div>

      {lineItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground text-xs">
                <th className="pb-2 pr-2 font-medium">Description</th>
                <th className="pb-2 px-2 font-medium w-16 text-right">Qty</th>
                <th className="pb-2 px-2 font-medium w-24 text-right">Unit Price</th>
                <th className="pb-2 px-2 font-medium w-24 text-right">Amount</th>
                <th className="pb-2 px-2 font-medium w-32">GL Code</th>
                {editable && <th className="pb-2 pl-2 w-8" />}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <LineItemRow
                  key={li.id}
                  item={li}
                  glAccounts={glAccounts}
                  editable={editable}
                  onUpdate={(data) => updateMut.mutate({ itemId: li.id!, data })}
                  onDelete={() => deleteMut.mutate(li.id!)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td className="pt-2 pr-2">Total</td>
                <td className="pt-2 px-2" />
                <td className="pt-2 px-2" />
                <td className="pt-2 px-2 text-right tabular-nums">
                  {formatAmount(lineTotal, currency)}
                </td>
                <td className="pt-2 px-2" />
                {editable && <td className="pt-2 pl-2" />}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No line items</p>
      )}

      {mismatch && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
          Line items total ({formatAmount(lineTotal, currency)}) doesn't match header amount ({formatAmount(headerTotal, currency)})
        </p>
      )}
    </div>
  );
}

function LineItemRow({
  item, glAccounts, editable, onUpdate, onDelete,
}: {
  item: LineItem;
  glAccounts: GlAccount[];
  editable: boolean;
  onUpdate: (data: Partial<LineItem>) => void;
  onDelete: () => void;
}) {
  const [desc, setDesc] = useState(item.description || '');
  const [qty, setQty] = useState(String(item.quantity ?? ''));
  const [unitPrice, setUnitPrice] = useState(String(item.unit_price ?? ''));
  const [amount, setAmount] = useState(String(item.amount ?? ''));
  const [glCode, setGlCode] = useState(item.gl_code || '');

  const handleBlur = () => {
    const changes: Partial<LineItem> = {};
    if (desc !== (item.description || '')) changes.description = desc;
    if (qty !== String(item.quantity ?? '')) changes.quantity = Number(qty) || 0;
    if (unitPrice !== String(item.unit_price ?? '')) changes.unit_price = Number(unitPrice) || 0;
    if (amount !== String(item.amount ?? '')) changes.amount = Number(amount) || 0;
    if (glCode !== (item.gl_code || '')) changes.gl_code = glCode;
    if (Object.keys(changes).length > 0) onUpdate(changes);
  };

  const cellClass = 'px-2 py-1.5';
  const inputClass = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <tr className="border-b last:border-0">
      <td className={cellClass}>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={handleBlur} disabled={!editable} className={inputClass} />
      </td>
      <td className={cellClass}>
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} onBlur={handleBlur} disabled={!editable} className={`${inputClass} text-right`} />
      </td>
      <td className={cellClass}>
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} onBlur={handleBlur} disabled={!editable} step="0.01" className={`${inputClass} text-right`} />
      </td>
      <td className={cellClass}>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={handleBlur} disabled={!editable} step="0.01" className={`${inputClass} text-right`} />
      </td>
      <td className={cellClass}>
        <select value={glCode} onChange={(e) => { setGlCode(e.target.value); }} onBlur={handleBlur} disabled={!editable} className={inputClass}>
          <option value="">—</option>
          {glAccounts.map((gl) => (
            <option key={gl.id} value={gl.code}>{gl.code}</option>
          ))}
        </select>
      </td>
      {editable && (
        <td className="pl-2 py-1.5">
          <button type="button" onClick={onDelete} className="rounded p-1 hover:bg-red-100 text-red-500 transition-colors">
            <Trash2 className="size-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
}

// --- Comment Entry ---

const COMMENT_ICONS: Record<string, { icon: typeof MessageSquare; color: string }> = {
  system: { icon: RefreshCw, color: 'text-blue-600 bg-blue-50' },
  approval: { icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  rejection: { icon: XCircle, color: 'text-red-600 bg-red-50' },
  comment: { icon: MessageSquare, color: 'text-slate-600 bg-slate-50' },
};

function CommentEntry({ comment }: { comment: Comment }) {
  const config = COMMENT_ICONS[comment.comment_type] || COMMENT_ICONS.comment;
  const Icon = config.icon;

  return (
    <div className="flex gap-3">
      <div className={`p-1.5 rounded-lg shrink-0 ${config.color}`}>
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{comment.content}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {comment.author_name || 'System'} &middot; {formatDate(comment.created)}
        </p>
      </div>
    </div>
  );
}

// --- Field Component ---

function Field({
  label, value, editable, onChange, type = 'text',
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-muted-foreground mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!editable}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </label>
  );
}
