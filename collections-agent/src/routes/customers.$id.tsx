import { createRun, pollRun } from '@lumerahq/ui/lib';
import type { EmailResult } from '../components/EmailPreviewModal';
import type { RiskResult } from '../components/RiskAssessmentModal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { RiskAssessmentModal } from '../components/RiskAssessmentModal';
import { StatusBadge } from '../components/StatusBadge';
import {
  createActivity,
  createInvoice,
  deleteInvoice,
  formatAmount,
  formatDate,
  getCustomer,
  listCustomerActivities,
  listCustomerInvoices,
  listCustomerPayments,
  updateInvoice,
  type Invoice,
} from '../lib/queries';

export const Route = createFileRoute('/customers/$id')({
  component: CustomerDetailPage,
});

type Tab = 'invoices' | 'activities' | 'payments';

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('invoices');
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
  });

  async function runAutomation(automationName: string, inputs: Record<string, unknown> = {}) {
    setRunningAction(automationName);
    if (automationName === 'ca_assess_risk') {
      setRiskResult(null);
      setShowRiskModal(true);
    } else if (automationName === 'ca_draft_email') {
      setEmailResult(null);
      setShowEmailModal(true);
    }
    try {
      const run = await createRun({
        automationId: `collections-agent:${automationName}`,
        inputs: { customer_id: id, ...inputs },
      });
      const pollResult = await pollRun(run.id);
      if (pollResult.status === 'succeeded') {
        if (automationName === 'ca_assess_risk') {
          const [updatedCustomer, activities] = await Promise.all([
            getCustomer(id),
            listCustomerActivities(id),
          ]);
          const latest = activities.items?.[0];
          setRiskResult({
            risk_score: updatedCustomer.risk_score ?? 0,
            risk_level: updatedCustomer.risk_level ?? 'medium',
            next_action: updatedCustomer.next_action ?? '',
            reasoning: latest?.content ?? '',
          });
        } else if (automationName === 'ca_draft_email') {
          const activities = await listCustomerActivities(id);
          const emailActivity = activities.items?.find((a) => a.activity_type === 'email');
          if (emailActivity) {
            setEmailResult({
              subject: emailActivity.subject,
              body: emailActivity.content,
              customer_email: customer?.email ?? '',
            });
          }
        } else if (automationName === 'ca_record_payment') {
          setShowPaymentModal(false);
          toast.success('Payment recorded');
        }
        queryClient.invalidateQueries({ queryKey: ['customer', id] });
        queryClient.invalidateQueries({ queryKey: ['customer-invoices', id] });
        queryClient.invalidateQueries({ queryKey: ['customer-activities', id] });
        queryClient.invalidateQueries({ queryKey: ['customer-payments', id] });
      } else {
        setShowRiskModal(false);
        setShowEmailModal(false);
        toast.error(`Failed: ${pollResult.error || 'Unknown error'}`);
      }
    } catch {
      setShowRiskModal(false);
      setShowEmailModal(false);
      toast.error('Failed to run automation');
    } finally {
      setRunningAction(null);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-muted-foreground">Customer not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={customer.status} />
            {customer.risk_level && <StatusBadge status={customer.risk_level} />}
            <span className="text-muted-foreground text-sm">Outstanding: {formatAmount(customer.total_outstanding)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => runAutomation('ca_assess_risk')}
            disabled={runningAction !== null}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {runningAction === 'ca_assess_risk' ? 'Running...' : 'Assess Risk'}
          </button>
          <button
            type="button"
            onClick={() => runAutomation('ca_draft_email')}
            disabled={runningAction !== null}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {runningAction === 'ca_draft_email' ? 'Running...' : 'Draft Email'}
          </button>
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Record Payment
          </button>
        </div>
      </div>

      {/* Customer info */}
      <div className="rounded-xl border bg-card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{customer.email || '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{customer.phone || '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contact</p>
            <p className="font-medium">{customer.contact_name || '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Terms</p>
            <p className="font-medium">{customer.payment_terms || '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Risk Score</p>
            <p className="font-medium">{customer.risk_score ?? '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Paid</p>
            <p className="font-medium">{formatAmount(customer.total_paid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Next Follow-up</p>
            <p className="font-medium">{formatDate(customer.next_follow_up)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Contact</p>
            <p className="font-medium">{formatDate(customer.last_contact_date)}</p>
          </div>
        </div>
        {customer.next_action && (
          <div className="mt-4 pt-4 border-t text-sm">
            <p className="text-muted-foreground">Next Action</p>
            <p className="font-medium">{customer.next_action}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['invoices', 'activities', 'payments'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <InvoicesTab
          customerId={id}
          onAdd={() => { setEditingInvoice(null); setShowInvoiceModal(true); }}
          onEdit={(inv) => { setEditingInvoice(inv); setShowInvoiceModal(true); }}
        />
      )}
      {tab === 'activities' && (
        <ActivitiesTab customerId={id} onAddNote={() => setShowNoteModal(true)} />
      )}
      {tab === 'payments' && <PaymentsTab customerId={id} />}

      {/* Modals */}
      {showRiskModal && <RiskAssessmentModal result={riskResult} onClose={() => setShowRiskModal(false)} />}
      {showEmailModal && <EmailPreviewModal result={emailResult} onClose={() => setShowEmailModal(false)} />}
      {showPaymentModal && (
        <PaymentModal
          customerId={id}
          onSubmit={(data) => runAutomation('ca_record_payment', data)}
          onClose={() => setShowPaymentModal(false)}
          isRunning={runningAction === 'ca_record_payment'}
        />
      )}
      {showNoteModal && (
        <NoteModal
          customerId={id}
          customerName={customer.name}
          onClose={() => setShowNoteModal(false)}
          onSaved={() => {
            setShowNoteModal(false);
            queryClient.invalidateQueries({ queryKey: ['customer-activities', id] });
          }}
        />
      )}
      {showInvoiceModal && (
        <InvoiceModal
          customerId={id}
          customerName={customer.name}
          invoice={editingInvoice}
          onClose={() => { setShowInvoiceModal(false); setEditingInvoice(null); }}
          onSaved={() => {
            setShowInvoiceModal(false);
            setEditingInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['customer-invoices', id] });
            queryClient.invalidateQueries({ queryKey: ['customer', id] });
          }}
        />
      )}
    </div>
  );
}

// --- Invoices Tab ---

function InvoicesTab({ customerId, onAdd, onEdit }: {
  customerId: string;
  onAdd: () => void;
  onEdit: (invoice: Invoice) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['customer-invoices', customerId],
    queryFn: () => listCustomerInvoices(customerId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      queryClient.invalidateQueries({ queryKey: ['customer-invoices', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    },
    onError: () => toast.error('Failed to delete invoice'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Add Invoice
        </button>
      </div>
      <div className="rounded-xl border bg-card">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium">Days Overdue</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{inv.invoice_number || '--'}</td>
                  <td className="px-4 py-3 tabular-nums">{formatAmount(inv.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {inv.days_overdue > 0 ? (
                      <span className={inv.days_overdue > 90 ? 'text-red-600 font-medium' : inv.days_overdue > 30 ? 'text-amber-600' : ''}>
                        {inv.days_overdue}
                      </span>
                    ) : '--'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatAmount(inv.balance_remaining)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => onEdit(inv)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this invoice?')) deleteMutation.mutate(inv.id!);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-red-600 hover:bg-muted transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Activities Tab ---

function ActivitiesTab({ customerId, onAddNote }: { customerId: string; onAddNote: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-activities', customerId],
    queryFn: () => listCustomerActivities(customerId),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAddNote}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Add Note
        </button>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-muted-foreground">Loading...</div>
        ) : data?.items && data.items.length > 0 ? (
          data.items.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={a.activity_type} />
                <span className="text-sm font-medium">{a.subject}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(a.created)}
                </span>
              </div>
              {a.content && <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>}
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground">No activities yet.</div>
        )}
      </div>
    </div>
  );
}

// --- Payments Tab ---

function PaymentsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-payments', customerId],
    queryFn: () => listCustomerPayments(customerId),
  });

  return (
    <div className="rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Reference</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
          ) : data?.items && data.items.length > 0 ? (
            data.items.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.payment_date)}</td>
                <td className="px-4 py-3 tabular-nums font-medium">{formatAmount(p.amount)}</td>
                <td className="px-4 py-3 capitalize">{p.method || '--'}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.reference || '--'}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No payments yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Invoice Modal ---

function InvoiceModal({ customerId, customerName, invoice, onClose, onSaved }: {
  customerId: string;
  customerName: string;
  invoice: Invoice | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = invoice !== null;
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? '');
  const [amount, setAmount] = useState(invoice?.amount?.toString() ?? '');
  const [dueDate, setDueDate] = useState(invoice?.due_date?.split('T')[0] ?? '');
  const [status, setStatus] = useState(invoice?.status ?? 'open');
  const [paidAmount, setPaidAmount] = useState(invoice?.paid_amount?.toString() ?? '0');
  const [notes, setNotes] = useState(invoice?.notes ?? '');

  const mutation = useMutation({
    mutationFn: () => {
      const amt = Number(amount);
      const paid = Number(paidAmount);
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const data = {
        customer_id: customerId,
        customer_name: customerName,
        invoice_number: invoiceNumber,
        amount: amt,
        due_date: dueDate,
        days_overdue: Math.max(0, diffDays),
        status,
        paid_amount: paid,
        balance_remaining: amt - paid,
        notes,
      };
      if (isEdit) {
        return updateInvoice(invoice.id!, data);
      }
      return createInvoice(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created');
      onSaved();
    },
    onError: () => toast.error(isEdit ? 'Failed to update invoice' : 'Failed to create invoice'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Invoice' : 'Add Invoice'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Invoice # *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="INV-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Amount *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Invoice['status'])}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="written_off">Written Off</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Paid Amount</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                step="0.01"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!invoiceNumber.trim() || !amount || !dueDate || mutation.isPending}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Payment Modal ---

function PaymentModal({ customerId, onSubmit, onClose, isRunning }: {
  customerId: string;
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isRunning: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('ach');
  const [reference, setReference] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  const { data: invoicesData } = useQuery({
    queryKey: ['customer-invoices', customerId],
    queryFn: () => listCustomerInvoices(customerId),
  });

  const openInvoices = invoicesData?.items?.filter((inv) => inv.status === 'open' || inv.status === 'partial') ?? [];

  // Compute settlement preview: simulate oldest-first application across target invoices
  const targetInvoices = selectedInvoiceIds.length > 0
    ? openInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id!))
    : openInvoices;
  const paymentAmount = Number(amount) || 0;

  const settlement: { id: string; invoice_number: string; balance: number; applied: number; remaining: number }[] = [];
  let remaining = paymentAmount;
  for (const inv of targetInvoices) {
    const balance = inv.balance_remaining ?? 0;
    if (balance <= 0) continue;
    const applied = Math.min(remaining, balance);
    settlement.push({
      id: inv.id!,
      invoice_number: inv.invoice_number || 'No #',
      balance,
      applied,
      remaining: balance - applied,
    });
    remaining -= applied;
    if (remaining <= 0) break;
  }
  const totalApplied = paymentAmount - Math.max(remaining, 0);

  function toggleInvoice(invoiceId: string) {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId],
    );
  }

  function handleSelectAll() {
    if (selectedInvoiceIds.length === openInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(openInvoices.map((inv) => inv.id!));
    }
  }

  function fillFromSelected() {
    const total = openInvoices
      .filter((inv) => selectedInvoiceIds.includes(inv.id!))
      .reduce((sum, inv) => sum + (inv.balance_remaining ?? 0), 0);
    setAmount(total.toFixed(2));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Record Payment</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Invoice selection */}
        {openInvoices.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-muted-foreground">Apply to invoices</label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedInvoiceIds.length === openInvoices.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
              {openInvoices.map((inv) => (
                <label key={inv.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedInvoiceIds.includes(inv.id!)}
                    onChange={() => toggleInvoice(inv.id!)}
                    className="rounded border-muted-foreground/30"
                  />
                  <span className="font-medium min-w-0 truncate">{inv.invoice_number || 'No #'}</span>
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {formatAmount(inv.balance_remaining)} due
                  </span>
                </label>
              ))}
            </div>
            {selectedInvoiceIds.length > 0 && (
              <button
                type="button"
                onClick={fillFromSelected}
                className="text-xs text-primary hover:underline"
              >
                Fill amount from selected ({formatAmount(
                  openInvoices
                    .filter((inv) => selectedInvoiceIds.includes(inv.id!))
                    .reduce((sum, inv) => sum + (inv.balance_remaining ?? 0), 0),
                )})
              </button>
            )}
            {selectedInvoiceIds.length === 0 && (
              <p className="text-xs text-muted-foreground">No invoices selected — payment will be applied to all open invoices, oldest first.</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Amount *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="ach">ACH</option>
                <option value="wire">Wire</option>
                <option value="check">Check</option>
                <option value="credit_card">Credit Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Ref #"
              />
            </div>
          </div>
        </div>

        {/* Settlement preview */}
        {paymentAmount > 0 && settlement.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">Settlement preview</label>
            <div className="rounded-lg border text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-1.5 font-medium">Invoice</th>
                    <th className="px-3 py-1.5 font-medium">Due</th>
                    <th className="px-3 py-1.5 font-medium">Applied</th>
                    <th className="px-3 py-1.5 font-medium">After</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-medium">{s.invoice_number}</td>
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{formatAmount(s.balance)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-green-600 font-medium">
                        {s.applied > 0 ? `- ${formatAmount(s.applied)}` : '--'}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">
                        {s.remaining <= 0
                          ? <span className="text-green-600 font-medium">Paid</span>
                          : <span className="text-muted-foreground">{formatAmount(s.remaining)}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {remaining > 0 && (
              <p className="text-xs text-amber-600">
                {formatAmount(remaining)} will remain unapplied (exceeds selected invoice balances).
              </p>
            )}
            {remaining <= 0 && totalApplied > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatAmount(totalApplied)} will be applied across {settlement.filter((s) => s.applied > 0).length} invoice(s).
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSubmit({
              amount: paymentAmount,
              payment_date: paymentDate,
              method,
              reference,
              ...(selectedInvoiceIds.length > 0 ? { invoice_ids: selectedInvoiceIds.join(',') } : {}),
            })}
            disabled={!amount || paymentAmount <= 0 || isRunning}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRunning ? 'Recording...' : 'Record Payment'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Note Modal ---

function NoteModal({ customerId, customerName, onClose, onSaved }: {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createActivity({
        customer_id: customerId,
        customer_name: customerName,
        activity_type: 'note',
        subject,
        content,
      }),
    onSuccess: () => {
      toast.success('Note added');
      onSaved();
    },
    onError: () => toast.error('Failed to add note'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Note</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Brief summary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Details</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Add details..."
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!subject.trim() || mutation.isPending}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Add Note'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
