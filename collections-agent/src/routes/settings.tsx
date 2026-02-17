import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  type Customer,
  createCustomer,
  deleteCustomer,
  listCustomers,
  logAudit,
  updateCustomer,
} from '../lib/queries';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['all-customers'],
    queryFn: () => listCustomers(1),
  });
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      const deleted = data?.items?.find((c) => c.id === confirmDeleteId);
      logAudit('customer_deleted', 'customer', confirmDeleteId!, `Deleted customer ${deleted?.name ?? ''}`);
      setConfirmDeleteId(null);
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['all-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to delete customer'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage customers and master data</p>
      </div>

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
            onSaved={() => {
              setCreating(false);
              queryClient.invalidateQueries({ queryKey: ['all-customers'] });
              queryClient.invalidateQueries({ queryKey: ['customers'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            }}
          />
        )}

        {editing && (
          <CustomerForm
            customer={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              queryClient.invalidateQueries({ queryKey: ['all-customers'] });
              queryClient.invalidateQueries({ queryKey: ['customers'] });
            }}
          />
        )}

        <div className="rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Phone</th>
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
                    <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.contact_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {confirmDeleteId === c.id ? (
                          <>
                            <button type="button" onClick={() => deleteMut.mutate(c.id!)} disabled={deleteMut.isPending} className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                              {deleteMut.isPending ? '...' : 'Confirm'}
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs border hover:bg-muted transition-colors">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setEditing(c); setCreating(false); }} className="rounded p-1.5 hover:bg-muted transition-colors" title="Edit">
                              <Pencil className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(c.id!)} className="rounded p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                              <Trash2 className="size-3.5" />
                            </button>
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
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer?: Customer; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [contactName, setContactName] = useState(customer?.contact_name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      customer?.id
        ? updateCustomer(customer.id, { name, email, contact_name: contactName, phone })
        : createCustomer({ name, email, contact_name: contactName, phone, status: 'active', total_outstanding: 0 }),
    onSuccess: () => {
      const action = customer ? 'updated' : 'created';
      toast.success(`Customer ${action}`);
      logAudit(`customer_${action}`, 'customer', customer?.id ?? '', `${action === 'created' ? 'Created' : 'Updated'} customer ${name}`);
      onSaved();
    },
    onError: () => toast.error('Failed to save customer'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{customer ? 'Edit Customer' : 'New Customer'}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Company Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Acme Corp" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="ap@acme.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Name</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Jane Smith" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="(555) 123-4567" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : customer ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
