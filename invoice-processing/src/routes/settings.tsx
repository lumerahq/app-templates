import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Building2, Landmark, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  type GlAccount,
  type Vendor,
  createGlAccount,
  createVendor,
  deleteGlAccount,
  deleteVendor,
  listGlAccounts,
  listVendors,
  updateGlAccount,
  updateVendor,
} from '../lib/queries';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

type Tab = 'vendors' | 'gl_accounts';

function SettingsPage() {
  const [tab, setTab] = useState<Tab>('vendors');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage master data</p>
      </div>

      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setTab('vendors')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'vendors'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="size-4" />
          Vendors
        </button>
        <button
          type="button"
          onClick={() => setTab('gl_accounts')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'gl_accounts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Landmark className="size-4" />
          GL Accounts
        </button>
      </div>

      {tab === 'vendors' ? <VendorsTab /> : <GlAccountsTab />}
    </div>
  );
}

// ─── Vendors Tab ────────────────────────────────────────────────────────────

function VendorsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['vendors'], queryFn: listVendors });
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      setConfirmDeleteId(null);
      toast.success('Vendor deleted');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: () => toast.error('Failed to delete vendor'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Vendors ({data?.items?.length ?? 0})</h2>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditing(null); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Vendor
        </button>
      </div>

      {creating && (
        <VendorForm
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['vendors'] }); }}
        />
      )}

      {editing && (
        <VendorForm
          vendor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['vendors'] }); }}
        />
      )}

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Default GL Code</th>
              <th className="px-4 py-3 font-medium w-32" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.default_gl_code || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {confirmDeleteId === v.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => deleteMut.mutate(v.id!)}
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
                          <button type="button" onClick={() => { setEditing(v); setCreating(false); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit">
                            <Pencil className="size-3.5" />
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(v.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No vendors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VendorForm({ vendor, onClose, onSaved }: { vendor?: Vendor; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(vendor?.name ?? '');
  const [glCode, setGlCode] = useState(vendor?.default_gl_code ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      vendor?.id
        ? updateVendor(vendor.id, { name, default_gl_code: glCode })
        : createVendor({ name, default_gl_code: glCode }),
    onSuccess: () => {
      toast.success(vendor ? 'Vendor updated' : 'Vendor created');
      onSaved();
    },
    onError: () => toast.error('Failed to save vendor'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{vendor ? 'Edit Vendor' : 'New Vendor'}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Vendor name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Default GL Code</label>
          <input value={glCode} onChange={(e) => setGlCode(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. 6000" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : vendor ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── GL Accounts Tab ────────────────────────────────────────────────────────

const accountTypes = ['expense', 'asset', 'liability', 'equity', 'revenue'] as const;

function GlAccountsTab() {
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
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{a.account_type || '—'}</span>
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
  );
}

function GlAccountForm({ account, onClose, onSaved }: { account?: GlAccount; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(account?.code ?? '');
  const [name, setName] = useState(account?.name ?? '');
  const [accountType, setAccountType] = useState(account?.account_type ?? 'expense');

  const mutation = useMutation({
    mutationFn: () =>
      account?.id
        ? updateGlAccount(account.id, { code, name, account_type: accountType })
        : createGlAccount({ code, name, account_type: accountType }),
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
          <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. 6000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Account name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {accountTypes.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
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
