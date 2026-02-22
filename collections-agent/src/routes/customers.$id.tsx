import { createRun, pollRun } from '@lumerahq/ui/lib';
import type { EmailResult } from '../components/EmailPreviewModal';
import type { RiskResult } from '../components/RiskAssessmentModal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { RiskAssessmentModal } from '../components/RiskAssessmentModal';
import { StatusBadge } from '../components/StatusBadge';
import {
  createActivity,
  formatAmount,
  formatDate,
  getCustomer,
  listCustomerActivities,
  listCustomerInvoices,
  listCustomerPayments,
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

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
          // Read updated customer record for risk data + latest activity for reasoning
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
          // Read the email activity the automation just created
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
          setShowPaymentForm(false);
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
            onClick={() => setShowPaymentForm(true)}
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

      {/* Payment Form */}
      {showPaymentForm && (
        <PaymentForm
          onSubmit={(data) => runAutomation('ca_record_payment', data)}
          onClose={() => setShowPaymentForm(false)}
          isRunning={runningAction === 'ca_record_payment'}
        />
      )}

      {/* Note Form */}
      {showNoteForm && (
        <NoteForm
          customerId={id}
          customerName={customer.name}
          onClose={() => setShowNoteForm(false)}
          onSaved={() => {
            setShowNoteForm(false);
            queryClient.invalidateQueries({ queryKey: ['customer-activities', id] });
          }}
        />
      )}

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

      {tab === 'invoices' && <InvoicesTab customerId={id} />}
      {tab === 'activities' && (
        <ActivitiesTab customerId={id} onAddNote={() => setShowNoteForm(true)} />
      )}
      {tab === 'payments' && <PaymentsTab customerId={id} />}

      {/* Modals */}
      {showRiskModal && <RiskAssessmentModal result={riskResult} onClose={() => setShowRiskModal(false)} />}
      {showEmailModal && <EmailPreviewModal result={emailResult} onClose={() => setShowEmailModal(false)} />}
    </div>
  );
}

// --- Invoices Tab ---

function InvoicesTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-invoices', customerId],
    queryFn: () => listCustomerInvoices(customerId),
  });

  return (
    <div className="rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Invoice #</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Due Date</th>
            <th className="px-4 py-3 font-medium text-right">Days Overdue</th>
            <th className="px-4 py-3 font-medium text-right">Balance</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
          ) : data?.items && data.items.length > 0 ? (
            data.items.map((inv) => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{inv.invoice_number || '--'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatAmount(inv.amount)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.due_date)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {inv.days_overdue > 0 ? (
                    <span className={inv.days_overdue > 90 ? 'text-red-600 font-medium' : inv.days_overdue > 30 ? 'text-amber-600' : ''}>
                      {inv.days_overdue}
                    </span>
                  ) : '--'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatAmount(inv.balance_remaining)}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No invoices.</td></tr>
          )}
        </tbody>
      </table>
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
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
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
            <th className="px-4 py-3 font-medium text-right">Amount</th>
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
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatAmount(p.amount)}</td>
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

// --- Payment Form ---

function PaymentForm({ onSubmit, onClose, isRunning }: {
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isRunning: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('ach');
  const [reference, setReference] = useState('');

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Record Payment</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit({ amount: Number(amount), payment_date: paymentDate, method, reference })}
          disabled={!amount || Number(amount) <= 0 || isRunning}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isRunning ? 'Recording...' : 'Record'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Note Form ---

function NoteForm({ customerId, customerName, onClose, onSaved }: {
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
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Add Note</h3>
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
            rows={3}
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
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Add Note'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
