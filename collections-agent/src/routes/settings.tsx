import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Bell, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '../components/StatusBadge';
import {
  type EscalationRule,
  type ReminderTemplate,
  createEscalationRule,
  createReminderTemplate,
  deleteEscalationRule,
  deleteReminderTemplate,
  listEscalationRules,
  listReminderTemplates,
  updateEscalationRule,
  updateReminderTemplate,
} from '../lib/queries';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

type Tab = 'templates' | 'rules';

function SettingsPage() {
  const [tab, setTab] = useState<Tab>('templates');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage reminder templates and escalation rules</p>
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
      </div>

      {tab === 'templates' && <TemplatesTab />}
      {tab === 'rules' && <RulesTab />}
    </div>
  );
}

// ─── Reminder Templates Tab ─────────────────────────────────────────────────

function TemplatesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['reminder-templates'], queryFn: listReminderTemplates });
  const [editing, setEditing] = useState<ReminderTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);
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
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Template
        </button>
      </div>

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Days Trigger</th>
              <th className="px-4 py-3 font-medium">Enabled</th>
              <th className="px-4 py-3 font-medium w-20" />
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
                  <td className="px-4 py-3 tabular-nums">{t.days_overdue_trigger}</td>
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
                          <button type="button" onClick={() => { setEditing(t); setShowModal(true); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit"><Pencil className="size-3.5" /></button>
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

      {showModal && (
        <TemplateModal
          template={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['reminder-templates'] }); }}
        />
      )}
    </div>
  );
}

function TemplateModal({ template, onClose, onSaved }: { template: ReminderTemplate | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = template !== null;
  const [name, setName] = useState(template?.name ?? '');
  const [stage, setStage] = useState(template?.stage ?? 'friendly');
  const [daysTrigger, setDaysTrigger] = useState(String(template?.days_overdue_trigger ?? ''));
  const [subjectTemplate, setSubjectTemplate] = useState(template?.subject_template ?? '');
  const [bodyTemplate, setBodyTemplate] = useState(template?.body_template ?? '');
  const [enabled, setEnabled] = useState(template?.enabled ?? 'yes');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { name, stage, days_overdue_trigger: Number(daysTrigger), subject_template: subjectTemplate, body_template: bodyTemplate, enabled };
      return isEdit ? updateReminderTemplate(template.id!, data) : createReminderTemplate(data);
    },
    onSuccess: () => { toast.success(isEdit ? 'Template updated' : 'Template created'); onSaved(); },
    onError: () => toast.error('Failed to save template'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Template' : 'Add Template'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors"><X className="size-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || !daysTrigger || !subjectTemplate.trim() || !bodyTemplate.trim() || mutation.isPending} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
          </button>
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Escalation Rules Tab ───────────────────────────────────────────────────

function RulesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['escalation-rules'], queryFn: listEscalationRules });
  const [editing, setEditing] = useState<EscalationRule | null>(null);
  const [showModal, setShowModal] = useState(false);
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
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Rule
        </button>
      </div>

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Min Days</th>
              <th className="px-4 py-3 font-medium">Min Amount</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Enabled</th>
              <th className="px-4 py-3 font-medium w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 tabular-nums">{r.min_days_overdue}</td>
                  <td className="px-4 py-3 tabular-nums">{r.min_amount ? `$${r.min_amount.toLocaleString()}` : '--'}</td>
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
                          <button type="button" onClick={() => { setEditing(r); setShowModal(true); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit"><Pencil className="size-3.5" /></button>
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

      {showModal && (
        <RuleModal
          rule={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['escalation-rules'] }); }}
        />
      )}
    </div>
  );
}

function RuleModal({ rule, onClose, onSaved }: { rule: EscalationRule | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = rule !== null;
  const [name, setName] = useState(rule?.name ?? '');
  const [minDays, setMinDays] = useState(String(rule?.min_days_overdue ?? ''));
  const [minAmount, setMinAmount] = useState(String(rule?.min_amount ?? ''));
  const [actionType, setActionType] = useState(rule?.action_type ?? 'flag');
  const [enabled, setEnabled] = useState(rule?.enabled ?? 'yes');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { name, min_days_overdue: Number(minDays), min_amount: minAmount ? Number(minAmount) : 0, action_type: actionType, enabled };
      return isEdit ? updateEscalationRule(rule.id!, data) : createEscalationRule(data);
    },
    onSuccess: () => { toast.success(isEdit ? 'Rule updated' : 'Rule created'); onSaved(); },
    onError: () => toast.error('Failed to save rule'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Rule' : 'Add Rule'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors"><X className="size-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Rule name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Min Days Overdue *</label>
              <input type="number" value={minDays} onChange={(e) => setMinDays(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. 60" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Min Amount</label>
              <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => mutation.mutate()} disabled={!name.trim() || !minDays || mutation.isPending} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
          </button>
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
