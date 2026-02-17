import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  type GlAccount,
  createGlAccount,
  deleteGlAccount,
  listGlAccounts,
  updateGlAccount,
} from '../lib/queries';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

const accountTypes = ['asset', 'contra_asset', 'expense'] as const;

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['gl-accounts'], queryFn: listGlAccounts });
  const [editing, setEditing] = useState<GlAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteGlAccount,
    onSuccess: () => {
      setConfirmDeleteId(null);
      toast.success('Account deleted');
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
    },
    onError: () => toast.error('Failed to delete account'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage GL accounts for fixed asset accounting</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">GL Accounts ({data?.items?.length ?? 0})</h2>
          <button
            type="button"
            onClick={() => { setCreating(true); setEditing(null); }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            Add Account
          </button>
        </div>

        {creating && (
          <GlAccountForm
            onClose={() => setCreating(false)}
            onSaved={() => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['gl-accounts'] }); }}
          />
        )}

        {editing && (
          <GlAccountForm
            account={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['gl-accounts'] }); }}
          />
        )}

        <div className="rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium w-32" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm">{a.code}</td>
                    <td className="px-4 py-3">{a.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{a.account_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {confirmDeleteId === a.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => deleteMut.mutate(a.id!)}
                              disabled={deleteMut.isPending}
                              className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deleteMut.isPending ? '...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded px-2 py-1 text-xs border hover:bg-muted transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setEditing(a); setCreating(false); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit">
                              <Pencil className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(a.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No GL accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GlAccountForm({ account, onClose, onSaved }: { account?: GlAccount; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(account?.code ?? '');
  const [name, setName] = useState(account?.name ?? '');
  const [accountType, setAccountType] = useState<typeof accountTypes[number]>(account?.account_type ?? 'asset');

  const mutation = useMutation({
    mutationFn: () =>
      account?.id
        ? updateGlAccount(account.id, { code, name, account_type: accountType as GlAccount['account_type'] })
        : createGlAccount({ code, name, account_type: accountType as GlAccount['account_type'] }),
    onSuccess: () => {
      toast.success(account ? 'Account updated' : 'Account created');
      onSaved();
    },
    onError: () => toast.error('Failed to save account'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{account ? 'Edit GL Account' : 'New GL Account'}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Code *</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. 1500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Account name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value as typeof accountTypes[number])} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {accountTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!code.trim() || !name.trim() || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : account ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
