import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@lumerahq/ui/components';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listGlAccounts, listVendors } from '../lib/queries';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'gl_accounts' | 'vendors'>('gl_accounts');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage reference data for invoice processing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('gl_accounts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gl_accounts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          GL Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'vendors'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Vendors
        </button>
      </div>

      {activeTab === 'gl_accounts' ? <GlAccountsTable /> : <VendorsTable />}
    </div>
  );
}

function GlAccountsTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['settings-gl-accounts', page],
    queryFn: () => listGlAccounts(page),
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Code</th>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Type</th>
              <th className="px-5 py-2.5 font-medium">Department</th>
              <th className="px-5 py-2.5 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-t">
                  <td colSpan={5} className="px-5 py-3">
                    <div className="h-4 rounded bg-muted/50 animate-pulse" />
                  </td>
                </tr>
              ))}
            {!isLoading &&
              items.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/50">
                  <td className="px-5 py-2.5 font-medium">{row.code}</td>
                  <td className="px-5 py-2.5">{row.name}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.type || '—'}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.department || '—'}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  No GL accounts. Run <code className="bg-muted px-1 rounded">lumera run scripts/seed-demo.py</code> to add sample data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-5 py-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="size-4 mr-1" />
            Prev
          </Button>
          <span className="text-sm tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function VendorsTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['settings-vendors', page],
    queryFn: () => listVendors(page),
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Email</th>
              <th className="px-5 py-2.5 font-medium">Default GL</th>
              <th className="px-5 py-2.5 font-medium">Payment Terms</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-t">
                  <td colSpan={5} className="px-5 py-3">
                    <div className="h-4 rounded bg-muted/50 animate-pulse" />
                  </td>
                </tr>
              ))}
            {!isLoading &&
              items.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/50">
                  <td className="px-5 py-2.5 font-medium">{row.name}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.email || '—'}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{row.default_gl_code || '—'}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">
                    {row.payment_terms?.replace(/_/g, ' ') || '—'}
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  No vendors. Run <code className="bg-muted px-1 rounded">lumera run scripts/seed-demo.py</code> to add sample data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-5 py-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="size-4 mr-1" />
            Prev
          </Button>
          <span className="text-sm tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
