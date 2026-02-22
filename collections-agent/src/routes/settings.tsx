import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Bell, Pencil, Plus, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '../components/StatusBadge';
import {
  type Customer,
  type EscalationRule,
  type ReminderTemplate,
  createCustomer,
  createEscalationRule,
  createReminderTemplate,
  deleteCustomer,
  deleteEscalationRule,
  deleteReminderTemplate,
  listCustomers,
  listEscalationRules,
  listReminderTemplates,
  updateCustomer,
  updateEscalationRule,
  updateReminderTemplate,
} from '../lib/queries';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

type Tab = 'templates' | 'rules' | 'customers';

function SettingsPage() {
  const [tab, setTab] = useState<Tab>('templates');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage configuration and master data</p>
      </div>

      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="size-4" />
          Reminder Templates
        </button>
        <button
          type="button"
          onClick={() => setTab('rules')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'rules'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert className="size-4" />
          Escalation Rules
        </button>
        <button
          type="button"
          onClick={() => setTab('customers')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'customers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-4" />
          Customers
        </button>
      </div>

      {tab === 'templates' && <TemplatesTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'customers' && <CustomersTab />}
    </div>
  );
}

// ─── Reminder Templates Tab ─────────────────────────────────────────────────

function TemplatesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['reminder-templates'], queryFn: listReminderTemplates });
  const [editing, setEditing] = useState<ReminderTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteReminderTemplate,
    onSuccess: () => {
      setConfirmDeleteId(null);
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
    },
    onError: () => toast.error('Failed to delete template'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Reminder Templates ({data?.items?.length ?? 0})</h2>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditing(null); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Template
        </button>
      </div>

      {creating && (
        <TemplateForm
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['reminder-templates'] }); }}
        />
      )}

      {editing && (
        <TemplateForm
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['reminder-templates'] }); }}
        />
      )}

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium text-right">Days Trigger</th>
              <th className="px-4 py-3 font-medium">Enabled</th>
              <th className="px-4 py-3 font-medium w-32" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.stage} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.days_overdue_trigger}</td>
                  <td className="px-4 py-3">{t.enabled === 'yes' ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {confirmDeleteId === t.id ? (
                        <>
                          <button type="button" onClick={() => deleteMut.mutate(t.id!)} disabled={deleteMut.isPending} className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                            {deleteMut.isPending ? '...' : 'Confirm'}
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs border hover:bg-muted transition-colors">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => { setEditing(t); setCreating(false); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit"><Pencil className="size-3.5" /></button>
                          <button type="button" onClick={() => setConfirmDeleteId(t.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete"><Trash2 className="size-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No templates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateForm({ template, onClose, onSaved }: { template?: ReminderTemplate; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? '');
  const [stage, setStage] = useState(template?.stage ?? 'friendly');
  const [daysTrigger, setDaysTrigger] = useState(String(template?.days_overdue_trigger ?? ''));
  const [subjectTemplate, setSubjectTemplate] = useState(template?.subject_template ?? '');
  const [bodyTemplate, setBodyTemplate] = useState(template?.body_template ?? '');
  const [enabled, setEnabled] = useState(template?.enabled ?? 'yes');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { name, stage, days_overdue_trigger: Number(daysTrigger), subject_template: subjectTemplate, body_template: bodyTemplate, enabled };
      return template?.id ? updateReminderTemplate(template.id, data) : createReminderTemplate(data);
    },
    onSuccess: () => { toast.success(template ? 'Template updated' : 'Template created'); onSaved(); },
    onError: () => toast.error('Failed to save template'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{template ? 'Edit Template' : 'New Template'}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors"><X className="size-4" /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Template name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Stage *</label>
          <select value={stage} onChange={(e) => setStage(e.target.value as ReminderTemplate['stage'])} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="friendly">Friendly</option>
            <option value="firm">Firm</option>
            <option value="urgent">Urgent</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Days Trigger *</label>
          <input type="number" value={daysTrigger} onChange={(e) => setDaysTrigger(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. 30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Enabled</label>
          <select value={enabled} onChange={(e) => setEnabled(e.target.value as 'yes' | 'no')} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Subject Template *</label>
        <input value={subjectTemplate} onChange={(e) => setSubjectTemplate(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Email subject line" />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Body Template *</label>
        <textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Email body template..." />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || !daysTrigger || !subjectTemplate.trim() || !bodyTemplate.trim() || mutation.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {mutation.isPending ? 'Saving...' : template ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── Escalation Rules Tab ───────────────────────────────────────────────────

function RulesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['escalation-rules'], queryFn: listEscalationRules });
  const [editing, setEditing] = useState<EscalationRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteEscalationRule,
    onSuccess: () => {
      setConfirmDeleteId(null);
      toast.success('Rule deleted');
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
    },
    onError: () => toast.error('Failed to delete rule'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Escalation Rules ({data?.items?.length ?? 0})</h2>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditing(null); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Rule
        </button>
      </div>

      {creating && (
        <RuleForm
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['escalation-rules'] }); }}
        />
      )}

      {editing && (
        <RuleForm
          rule={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['escalation-rules'] }); }}
        />
      )}

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium text-right">Min Days</th>
              <th className="px-4 py-3 font-medium text-right">Min Amount</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Enabled</th>
              <th className="px-4 py-3 font-medium w-32" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.min_days_overdue}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.min_amount ? `$${r.min_amount.toLocaleString()}` : '--'}</td>
                  <td className="px-4 py-3 capitalize">{r.action_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{r.enabled === 'yes' ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {confirmDeleteId === r.id ? (
                        <>
                          <button type="button" onClick={() => deleteMut.mutate(r.id!)} disabled={deleteMut.isPending} className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                            {deleteMut.isPending ? '...' : 'Confirm'}
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs border hover:bg-muted transition-colors">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => { setEditing(r); setCreating(false); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit"><Pencil className="size-3.5" /></button>
                          <button type="button" onClick={() => setConfirmDeleteId(r.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete"><Trash2 className="size-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No escalation rules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RuleForm({ rule, onClose, onSaved }: { rule?: EscalationRule; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(rule?.name ?? '');
  const [minDays, setMinDays] = useState(String(rule?.min_days_overdue ?? ''));
  const [minAmount, setMinAmount] = useState(String(rule?.min_amount ?? ''));
  const [actionType, setActionType] = useState(rule?.action_type ?? 'flag');
  const [enabled, setEnabled] = useState(rule?.enabled ?? 'yes');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { name, min_days_overdue: Number(minDays), min_amount: minAmount ? Number(minAmount) : 0, action_type: actionType, enabled };
      return rule?.id ? updateEscalationRule(rule.id, data) : createEscalationRule(data);
    },
    onSuccess: () => { toast.success(rule ? 'Rule updated' : 'Rule created'); onSaved(); },
    onError: () => toast.error('Failed to save rule'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{rule ? 'Edit Rule' : 'New Rule'}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors"><X className="size-4" /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Rule name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Min Days *</label>
          <input type="number" value={minDays} onChange={(e) => setMinDays(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. 60" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Min Amount</label>
          <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Action *</label>
          <select value={actionType} onChange={(e) => setActionType(e.target.value as EscalationRule['action_type'])} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="flag">Flag</option>
            <option value="escalate">Escalate</option>
            <option value="final_notice">Final Notice</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Enabled</label>
          <select value={enabled} onChange={(e) => setEnabled(e.target.value as 'yes' | 'no')} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || !minDays || mutation.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {mutation.isPending ? 'Saving...' : rule ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── Customers Tab ──────────────────────────────────────────────────────────

function CustomersTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-customers'], queryFn: () => listCustomers(1) });
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      setConfirmDeleteId(null);
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['settings-customers'] });
    },
    onError: () => toast.error('Failed to delete customer'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Customers ({data?.items?.length ?? 0})</h2>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditing(null); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Customer
        </button>
      </div>

      {creating && (
        <CustomerForm
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['settings-customers'] }); }}
        />
      )}

      {editing && (
        <CustomerForm
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['settings-customers'] }); }}
        />
      )}

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Terms</th>
              <th className="px-4 py-3 font-medium w-32" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || '--'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.payment_terms || '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {confirmDeleteId === c.id ? (
                        <>
                          <button type="button" onClick={() => deleteMut.mutate(c.id!)} disabled={deleteMut.isPending} className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                            {deleteMut.isPending ? '...' : 'Confirm'}
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs border hover:bg-muted transition-colors">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => { setEditing(c); setCreating(false); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit"><Pencil className="size-3.5" /></button>
                          <button type="button" onClick={() => setConfirmDeleteId(c.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete"><Trash2 className="size-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer?: Customer; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [contactName, setContactName] = useState(customer?.contact_name ?? '');
  const [paymentTerms, setPaymentTerms] = useState(customer?.payment_terms ?? 'Net 30');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { name, email, phone, contact_name: contactName, payment_terms: paymentTerms };
      return customer?.id ? updateCustomer(customer.id, data) : createCustomer({ ...data, status: 'active' as const });
    },
    onSuccess: () => { toast.success(customer ? 'Customer updated' : 'Customer created'); onSaved(); },
    onError: () => toast.error('Failed to save customer'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{customer ? 'Edit Customer' : 'New Customer'}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors"><X className="size-4" /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Company name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="ar@company.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="(555) 123-4567" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Name</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="John Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Terms</label>
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Net 30" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {mutation.isPending ? 'Saving...' : customer ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">Cancel</button>
      </div>
    </div>
  );
}
