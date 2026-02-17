import { type PbRecord, pbCreate, pbDelete, pbGet, pbList, pbSql, pbUpdate } from '@lumerahq/ui/lib';

// --- Types ---

export type Invoice = PbRecord & {
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  description: string;
  status: 'draft' | 'processing' | 'review' | 'approved' | 'rejected';
  document: { object_key: string; original_name: string; size: number; content_type: string } | null;
  extracted_data: Record<string, unknown> | null;
  notes: string;
};

export type Vendor = PbRecord & {
  name: string;
  default_gl_code: string;
};

export type GlAccount = PbRecord & {
  code: string;
  name: string;
  account_type: string;
};

// --- Dashboard ---

export type DashboardStats = {
  total: string;
  pending_review: string;
  approved: string;
  draft: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await pbSql<DashboardStats>({
    sql: `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
      FROM invoices
    `,
  });
  return result.rows?.[0] ?? { total: '0', pending_review: '0', approved: '0', draft: '0' };
}

// --- Invoices ---

export async function listInvoices(page = 1, statusFilter?: string) {
  const filter = statusFilter ? JSON.stringify({ status: statusFilter }) : undefined;
  return pbList<Invoice>('invoices', {
    page,
    perPage: 20,
    sort: '-created',
    filter,
  });
}

export async function getInvoice(id: string) {
  return pbGet<Invoice>('invoices', id);
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  return pbUpdate<Invoice>('invoices', id, data);
}

export async function createInvoice(data: Partial<Invoice>) {
  return pbCreate<Invoice>('invoices', data);
}

// --- Vendors ---

export async function listVendors() {
  return pbList<Vendor>('vendors', { perPage: 100, sort: 'name' });
}

export async function createVendor(data: Partial<Vendor>) {
  return pbCreate<Vendor>('vendors', data);
}

export async function updateVendor(id: string, data: Partial<Vendor>) {
  return pbUpdate<Vendor>('vendors', id, data);
}

export async function deleteVendor(id: string) {
  return pbDelete('vendors', id);
}

// --- GL Accounts ---

export async function listGlAccounts() {
  return pbList<GlAccount>('gl_accounts', { perPage: 100, sort: 'code' });
}

export async function createGlAccount(data: Partial<GlAccount>) {
  return pbCreate<GlAccount>('gl_accounts', data);
}

export async function updateGlAccount(id: string, data: Partial<GlAccount>) {
  return pbUpdate<GlAccount>('gl_accounts', id, data);
}

export async function deleteGlAccount(id: string) {
  return pbDelete('gl_accounts', id);
}

// --- Helpers ---

const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', AUD: 'A$', CAD: 'C$', CHF: 'CHF\u00A0', INR: '\u20B9',
};

export function formatAmount(amount: number | null | undefined, currency?: string): string {
  if (amount == null) return '\u2014';
  const sym = currencySymbols[currency || 'USD'] || `${currency || 'USD'}\u00A0`;
  return `${sym}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}
