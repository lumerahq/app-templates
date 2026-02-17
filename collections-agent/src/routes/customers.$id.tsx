import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Clock, Loader2, Mail, MessageSquare, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { createRun, pollRun } from '@lumerahq/ui/lib';
import { StatusBadge } from '../components/StatusBadge';
import {
  type ArInvoice,
  createActivity,
  createInvoice,
  deleteInvoice,
  formatAmount,
  getCustomer,
  listCustomerActivities,
  listCustomerInvoices,
  logAudit,
  updateCustomer,
  updateInvoice,
} from '../lib/queries';

export const Route = createFileRoute('/customers/$id')({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
  });

  const { data: invoices } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: () => listCustomerInvoices(id),
  });

  const { data: activities } = useQuery({
    queryKey: ['customer-activities', id],
    queryFn: () => listCustomerActivities(id),
  });

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<ArInvoice | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [confirmDeleteInvId, setConfirmDeleteInvId] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-invoices', id] });
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['aging-buckets'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const draftEmailMutation = useMutation({
    mutationFn: async () => {
      const run = await createRun({
        automationId: 'collections-agent:draft_collection_email',
        inputs: { customer_id: id },
      });
      return pollRun(run.id);
    },
    onSuccess: () => {
      toast.success('Collection email drafted');
      logAudit('email_drafted', 'customer', id, `Drafted collection email for ${customer?.name}`);
      queryClient.invalidateQueries({ queryKey: ['customer-activities', id] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: () => toast.error('Failed to draft email'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateCustomer(id, { status: status as Customer['status'] }),
    onSuccess: (_data, status) => {
      toast.success('Status updated');
      logAudit('status_changed', 'customer', id, `Changed ${customer?.name} status to ${status}`);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      createActivity({
        customer: id,
        activity_type: 'note',
        subject: 'Note',
        content: noteContent,
        contact_date: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      toast.success('Note added');
      logAudit('note_added', 'customer', id, `Added note for ${customer?.name}`);
      setNoteContent('');
      setShowNoteForm(false);
      queryClient.invalidateQueries({ queryKey: ['customer-activities', id] });
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteInvMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      toast.success('Invoice deleted');
      logAudit('invoice_deleted', 'invoice', confirmDeleteInvId!, `Deleted invoice from ${customer?.name}`);
      setConfirmDeleteInvId(null);
      invalidateAll();
    },
    onError: () => toast.error('Failed to delete invoice'),
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!customer) {
    return <div className="py-8 text-center text-muted-foreground">Customer not found.</div>;
  }

  const allInvoices = invoices?.items || [];
  const openInvoices = allInvoices.filter((i) => i.status === 'open');
  const totalOpen = openInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const activityItems = activities?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/customers' })}
          className="rounded-md border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {customer.contact_name && `${customer.contact_name} · `}
            {customer.email || 'No email'}
            {customer.phone && ` · ${customer.phone}`}
          </p>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative group">
          <button
            type="button"
            onClick={() => draftEmailMutation.mutate()}
            disabled={draftEmailMutation.isPending || openInvoices.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {draftEmailMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            {draftEmailMutation.isPending ? 'Drafting...' : 'Draft Collection Email'}
          </button>
          {openInvoices.length === 0 && (
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 rounded-md bg-popover border px-3 py-1.5 text-xs text-muted-foreground shadow-md whitespace-nowrap">
              Add an open invoice first to draft a collection email
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowNoteForm(!showNoteForm)}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <MessageSquare className="size-4" />
          Add Note
        </button>
        <select
          value={customer.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="contacted">Contacted</option>
          <option value="promised">Promised</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Note Form */}
      {showNoteForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Add Note</h3>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
            placeholder="Log a call, note, or update..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addNoteMutation.mutate()}
              disabled={!noteContent.trim() || addNoteMutation.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNoteForm(false); setNoteContent(''); }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Invoice Form */}
      {(creatingInvoice || editingInvoice) && (
        <InvoiceForm
          customerId={id}
          customerName={customer.name}
          invoice={editingInvoice ?? undefined}
          onClose={() => { setCreatingInvoice(false); setEditingInvoice(null); }}
          onSaved={() => {
            setCreatingInvoice(false);
            setEditingInvoice(null);
            invalidateAll();
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoices */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Invoices</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {openInvoices.length} open · {formatAmount(totalOpen)} outstanding
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setCreatingInvoice(true); setEditingInvoice(null); }}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3.5" />
              Add
            </button>
          </div>

          {allInvoices.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Invoice #</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Due Date</th>
                  <th className="px-4 py-2 font-medium text-right">Overdue</th>
                  <th className="px-4 py-2 font-medium w-20" />
                </tr>
              </thead>
              <tbody>
                {allInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatAmount(inv.amount)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{inv.due_date?.split('T')[0] || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      {inv.status === 'paid' ? (
                        <span className="text-green-600 text-xs font-medium">Paid</span>
                      ) : inv.status === 'written_off' ? (
                        <span className="text-slate-400 text-xs font-medium">Written Off</span>
                      ) : inv.days_overdue > 0 ? (
                        <span className={inv.days_overdue > 60 ? 'text-red-600 font-medium' : inv.days_overdue > 30 ? 'text-amber-600' : 'text-muted-foreground'}>
                          {inv.days_overdue}d
                        </span>
                      ) : (
                        <span className="text-green-600">Current</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        {confirmDeleteInvId === inv.id ? (
                          <>
                            <button type="button" onClick={() => deleteInvMutation.mutate(inv.id!)} disabled={deleteInvMutation.isPending} className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                              {deleteInvMutation.isPending ? '...' : 'Delete'}
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteInvId(null)} className="rounded px-2 py-1 text-xs border hover:bg-muted transition-colors">
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setEditingInvoice(inv); setCreatingInvoice(false); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit">
                              <Pencil className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteInvId(inv.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No invoices. Click "Add" to create one.
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Activity Log</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activityItems.length} activit{activityItems.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>

          {activityItems.length > 0 ? (
            <div className="divide-y max-h-[600px] overflow-auto">
              {activityItems.map((a) => (
                <div key={a.id} className="p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <ActivityIcon type={a.activity_type} />
                    <span className="text-sm font-medium">{a.subject || activityLabel(a.activity_type)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {a.contact_date?.split('T')[0] || a.created?.split(' ')[0] || ''}
                    </span>
                  </div>
                  {a.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap ml-6">
                      {a.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No activities yet. Draft a collection email to get started.
            </div>
          )}
        </div>
      </div>

      {/* Customer Notes */}
      {customer.notes && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold text-sm text-muted-foreground mb-1">Notes</h2>
          <p className="text-sm">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}

// --- Invoice Form ---

function InvoiceForm({ customerId, customerName, invoice, onClose, onSaved }: {
  customerId: string;
  customerName: string;
  invoice?: ArInvoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? '');
  const [amount, setAmount] = useState(invoice?.amount?.toString() ?? '');
  const [dueDate, setDueDate] = useState(invoice?.due_date?.split('T')[0] ?? '');
  const [daysOverdue, setDaysOverdue] = useState(invoice?.days_overdue?.toString() ?? '0');
  const [status, setStatus] = useState(invoice?.status ?? 'open');

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        customer: customerId,
        invoice_number: invoiceNumber,
        amount: Number.parseFloat(amount),
        due_date: dueDate,
        days_overdue: Number.parseInt(daysOverdue) || 0,
        status,
      };
      return invoice?.id
        ? updateInvoice(invoice.id, data)
        : createInvoice(data);
    },
    onSuccess: () => {
      const action = invoice ? 'updated' : 'created';
      toast.success(`Invoice ${action}`);
      logAudit(
        `invoice_${action}`,
        'invoice',
        invoice?.id ?? '',
        `${action === 'created' ? 'Created' : 'Updated'} invoice ${invoiceNumber} for ${customerName}`,
      );
      onSaved();
    },
    onError: () => toast.error('Failed to save invoice'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{invoice ? 'Edit Invoice' : 'New Invoice'}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Invoice # *</label>
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="INV-2025-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Amount *</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="10000.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Days Overdue</label>
          <input type="number" value={daysOverdue} onChange={(e) => setDaysOverdue(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ArInvoice['status'])} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="open">Open</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="written_off">Written Off</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!invoiceNumber.trim() || !amount || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : invoice ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Helpers ---

function ActivityIcon({ type }: { type: string }) {
  const cls = 'size-4 shrink-0';
  switch (type) {
    case 'email_draft':
    case 'email_sent':
      return <Mail className={`${cls} text-blue-500`} />;
    case 'call':
      return <Phone className={`${cls} text-green-500`} />;
    case 'promise_to_pay':
      return <Clock className={`${cls} text-amber-500`} />;
    default:
      return <MessageSquare className={`${cls} text-slate-400`} />;
  }
}

function activityLabel(type: string): string {
  const labels: Record<string, string> = {
    email_draft: 'Email Draft',
    email_sent: 'Email Sent',
    call: 'Phone Call',
    note: 'Note',
    promise_to_pay: 'Promise to Pay',
  };
  return labels[type] || type;
}

type Customer = import('../lib/queries').Customer;
