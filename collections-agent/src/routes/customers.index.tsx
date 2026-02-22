import { createRun, pollRun } from '@lumerahq/ui/lib';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import type { EmailResult } from '../components/EmailPreviewModal';
import { RiskAssessmentModal } from '../components/RiskAssessmentModal';
import type { RiskResult } from '../components/RiskAssessmentModal';
import { StatusBadge } from '../components/StatusBadge';
import {
  type Customer,
  createCustomer,
  deleteCustomer,
  formatAmount,
  formatDate,
  getCustomer,
  listCustomerActivities,
  listCustomers,
  updateCustomer,
} from '../lib/queries';

export const Route = createFileRoute('/customers/')({
  component: CustomersPage,
});

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Promised', value: 'promised' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Resolved', value: 'resolved' },
];

const riskTabs = [
  { label: 'All', value: '' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const sortOptions = [
  { label: 'Outstanding (High → Low)', value: '-total_outstanding' },
  { label: 'Risk Score (High → Low)', value: '-risk_score' },
  { label: 'Name (A → Z)', value: 'name' },
  { label: 'Last Contact (Recent)', value: '-last_contact_date' },
];

function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sort, setSort] = useState('-total_outstanding');
  const [search, setSearch] = useState('');
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search ? 'all' : page, statusFilter, riskFilter, sort, search],
    queryFn: () => listCustomers(search ? 1 : page, statusFilter || undefined, riskFilter || undefined, sort, search ? 200 : undefined),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      setConfirmDeleteId(null);
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: () => toast.error('Failed to delete customer'),
  });

  const searchLower = search.toLowerCase();
  const filteredItems = search && data?.items
    ? data.items.filter((c) => c.name.toLowerCase().includes(searchLower))
    : data?.items;

  async function runAutomation(automationName: string, customerId: string) {
    setRunningAction(`${automationName}-${customerId}`);
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
        inputs: { customer_id: customerId },
      });
      const pollResult = await pollRun(run.id);
      if (pollResult.status === 'succeeded') {
        if (automationName === 'ca_assess_risk') {
          const [updatedCustomer, activities] = await Promise.all([
            getCustomer(customerId),
            listCustomerActivities(customerId),
          ]);
          const latest = activities.items?.[0];
          setRiskResult({
            risk_score: updatedCustomer.risk_score ?? 0,
            risk_level: updatedCustomer.risk_level ?? 'medium',
            next_action: updatedCustomer.next_action ?? '',
            reasoning: latest?.content ?? '',
          });
        } else if (automationName === 'ca_draft_email') {
          const activities = await listCustomerActivities(customerId);
          const emailActivity = activities.items?.find((a) => a.activity_type === 'email');
          const cust = await getCustomer(customerId);
          if (emailActivity) {
            setEmailResult({
              subject: emailActivity.subject,
              body: emailActivity.content,
              customer_email: cust.email ?? '',
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      } else {
        setShowRiskModal(false);
        setShowEmailModal(false);
        toast.error(`Automation failed: ${pollResult.error || 'Unknown error'}`);
      }
    } catch {
      setShowRiskModal(false);
      setShowEmailModal(false);
      toast.error('Failed to run automation');
    } finally {
      setRunningAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage and take action on customer accounts</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingCustomer(null); setShowCustomerModal(true); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Add Customer
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customers..."
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6">
        {/* Status tabs */}
        <div className="flex gap-1 border-b flex-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Risk filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Risk:</span>
          {riskTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setRiskFilter(tab.value); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                riskFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[22%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
              <th className="px-4 py-3 font-medium">Risk Score</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Contact</th>
              <th className="px-4 py-3 font-medium" />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filteredItems && filteredItems.length > 0 ? (
              filteredItems.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/customers/$id" params={{ id: c.id! }} className="text-primary hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatAmount(c.total_outstanding)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{c.risk_score ?? '--'}</span>
                      {c.risk_level && <StatusBadge status={c.risk_level} />}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.last_contact_date)}</td>
                  <td className="px-4 py-3">
                    {c.status !== 'resolved' && (
                      <div className="flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => runAutomation('ca_assess_risk', c.id!)}
                          disabled={runningAction !== null}
                          className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {runningAction === `ca_assess_risk-${c.id}` ? 'Running...' : 'Assess Risk'}
                        </button>
                        <button
                          type="button"
                          onClick={() => runAutomation('ca_draft_email', c.id!)}
                          disabled={runningAction !== null}
                          className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {runningAction === `ca_draft_email-${c.id}` ? 'Running...' : 'Draft Email'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {confirmDeleteId === c.id ? (
                        <>
                          <button type="button" onClick={() => deleteMut.mutate(c.id!)} disabled={deleteMut.isPending} className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                            {deleteMut.isPending ? '...' : 'Yes'}
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs border hover:bg-muted transition-colors">No</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => { setEditingCustomer(c); setShowCustomerModal(true); }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="size-3.5" /></button>
                          <button type="button" onClick={() => setConfirmDeleteId(c.id!)} className="rounded p-1 text-muted-foreground hover:text-red-600 hover:bg-muted transition-colors"><Trash2 className="size-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <p className="text-muted-foreground">{search || statusFilter || riskFilter ? 'No customers match your filters.' : 'No customers yet.'}</p>
                {!search && !statusFilter && !riskFilter && (
                  <button type="button" onClick={() => { setEditingCustomer(null); setShowCustomerModal(true); }} className="mt-2 text-sm text-primary hover:underline">Add your first customer</button>
                )}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (data.totalPages ?? 1)}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRiskModal && <RiskAssessmentModal result={riskResult} onClose={() => setShowRiskModal(false)} />}
      {showEmailModal && <EmailPreviewModal result={emailResult} onClose={() => setShowEmailModal(false)} />}
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => { setShowCustomerModal(false); setEditingCustomer(null); }}
          onSaved={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
            queryClient.invalidateQueries({ queryKey: ['customers'] });
          }}
        />
      )}
    </div>
  );
}

// --- Customer Modal ---

function CustomerModal({ customer, onClose, onSaved }: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = customer !== null;
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [contactName, setContactName] = useState(customer?.contact_name ?? '');
  const [paymentTerms, setPaymentTerms] = useState(customer?.payment_terms ?? 'Net 30');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { name, email, phone, contact_name: contactName, payment_terms: paymentTerms };
      return isEdit ? updateCustomer(customer.id!, data) : createCustomer({ ...data, status: 'active' as const });
    },
    onSuccess: () => { toast.success(isEdit ? 'Customer updated' : 'Customer created'); onSaved(); },
    onError: () => toast.error(isEdit ? 'Failed to update customer' : 'Failed to create customer'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Company name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="ar@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Terms</label>
              <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Net 30" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
          </button>
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
