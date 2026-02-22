import { createRun, pollRun } from '@lumerahq/ui/lib';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import type { EmailResult } from '../components/EmailPreviewModal';
import { RiskAssessmentModal } from '../components/RiskAssessmentModal';
import type { RiskResult } from '../components/RiskAssessmentModal';
import { StatusBadge } from '../components/StatusBadge';
import { formatAmount, formatDate, getCustomer, listCustomerActivities, listCustomers } from '../lib/queries';

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

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, statusFilter, riskFilter, sort],
    queryFn: () => listCustomers(page, statusFilter || undefined, riskFilter || undefined, sort),
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
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted-foreground mt-1">Manage and take action on customer accounts</p>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium text-right">Outstanding</th>
              <th className="px-4 py-3 font-medium text-right">Risk Score</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Contact</th>
              <th className="px-4 py-3 font-medium w-56" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filteredItems && filteredItems.length > 0 ? (
              filteredItems.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/customers/$id" params={{ id: c.id! }} className="text-primary hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAmount(c.total_outstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No customers found.</td></tr>
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
    </div>
  );
}
