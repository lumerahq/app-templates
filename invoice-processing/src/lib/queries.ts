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
  gl_code: string;
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

export type LineItem = PbRecord & {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  gl_code: string;
};

export type Comment = PbRecord & {
  invoice_id: string;
  content: string;
  comment_type: 'comment' | 'approval' | 'rejection' | 'system';
  author_name: string;
  author_email: string;
};

// --- Dashboard ---

export type DashboardStats = {
  total: string;
  pending_review: string;
  approved: string;
  draft: string;
  processing: string;
  rejected: string;
  total_approved_amount: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await pbSql<DashboardStats>({
    sql: `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as total_approved_amount
      FROM ip_invoices
    `,
  });
  return (
    result.rows?.[0] ?? {
      total: '0',
      pending_review: '0',
      approved: '0',
      draft: '0',
      processing: '0',
      rejected: '0',
      total_approved_amount: '0',
    }
  );
}

export type StatusPipelineRow = { status: string; count: string; amount: string };

export async function getStatusPipeline(): Promise<StatusPipelineRow[]> {
  const result = await pbSql<StatusPipelineRow>({
    sql: `
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as amount
      FROM ip_invoices
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'draft' THEN 1
          WHEN 'processing' THEN 2
          WHEN 'review' THEN 3
          WHEN 'approved' THEN 4
          WHEN 'rejected' THEN 5
        END
    `,
  });
  return result.rows ?? [];
}

export type SpendRow = { label: string; total: string };

export async function getSpendByVendor(): Promise<SpendRow[]> {
  const result = await pbSql<SpendRow>({
    sql: `
      SELECT vendor_name as label, SUM(total_amount) as total
      FROM ip_invoices
      WHERE status = 'approved' AND vendor_name IS NOT NULL AND vendor_name != ''
      GROUP BY vendor_name
      ORDER BY SUM(total_amount) DESC
      LIMIT 5
    `,
  });
  return result.rows ?? [];
}

export async function getSpendByGlCode(): Promise<SpendRow[]> {
  const result = await pbSql<SpendRow>({
    sql: `
      SELECT
        CASE WHEN gl_code IS NOT NULL AND gl_code != '' THEN gl_code ELSE 'Uncoded' END as label,
        SUM(total_amount) as total
      FROM ip_invoices
      WHERE status = 'approved'
      GROUP BY label
      ORDER BY SUM(total_amount) DESC
      LIMIT 5
    `,
  });
  return result.rows ?? [];
}

export type AgingBucket = { bucket: string; amount: string; count: string };

export async function getInvoiceAging(): Promise<AgingBucket[]> {
  const result = await pbSql<AgingBucket>({
    sql: `
      SELECT
        CASE
          WHEN due_date IS NULL OR due_date = '' THEN 'No Due Date'
          WHEN julianday('now') - julianday(due_date) <= 0 THEN 'Current'
          WHEN julianday('now') - julianday(due_date) BETWEEN 1 AND 30 THEN '1-30 days'
          WHEN julianday('now') - julianday(due_date) BETWEEN 31 AND 60 THEN '31-60 days'
          WHEN julianday('now') - julianday(due_date) BETWEEN 61 AND 90 THEN '61-90 days'
          ELSE '90+ days'
        END as bucket,
        COALESCE(SUM(total_amount), 0) as amount,
        COUNT(*) as count
      FROM ip_invoices
      WHERE status NOT IN ('approved', 'rejected')
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN 'Current' THEN 1
          WHEN '1-30 days' THEN 2
          WHEN '31-60 days' THEN 3
          WHEN '61-90 days' THEN 4
          WHEN '90+ days' THEN 5
          WHEN 'No Due Date' THEN 6
        END
    `,
  });
  return result.rows ?? [];
}

// --- Invoices ---

export async function listInvoices(page = 1, statusFilter?: string, sort = '-created', perPage = 20) {
  const filter = statusFilter ? JSON.stringify({ status: statusFilter }) : undefined;
  return pbList<Invoice>('ip_invoices', { page, perPage, sort, filter });
}

export async function getInvoice(id: string) {
  return pbGet<Invoice>('ip_invoices', id);
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  return pbUpdate<Invoice>('ip_invoices', id, data);
}

export async function createInvoice(data: Partial<Invoice>) {
  return pbCreate<Invoice>('ip_invoices', data);
}

// --- Line Items ---

export async function listLineItems(invoiceId: string) {
  const data = await pbList<LineItem>('ip_line_items', {
    perPage: 100,
    sort: 'created',
    filter: JSON.stringify({ invoice_id: invoiceId }),
  });
  return data.items ?? [];
}

export async function createLineItem(data: Partial<LineItem>) {
  return pbCreate<LineItem>('ip_line_items', data);
}

export async function updateLineItem(id: string, data: Partial<LineItem>) {
  return pbUpdate<LineItem>('ip_line_items', id, data);
}

export async function deleteLineItem(id: string) {
  return pbDelete('ip_line_items', id);
}

// --- Comments ---

export async function listComments(invoiceId: string) {
  const data = await pbList<Comment>('ip_comments', {
    perPage: 200,
    sort: 'created',
    filter: JSON.stringify({ invoice_id: invoiceId }),
  });
  return data.items ?? [];
}

export async function createComment(data: Partial<Comment>) {
  return pbCreate<Comment>('ip_comments', data);
}

// --- Vendors ---

export async function listVendors() {
  return pbList<Vendor>('ip_vendors', { perPage: 100, sort: 'name' });
}

export async function createVendor(data: Partial<Vendor>) {
  return pbCreate<Vendor>('ip_vendors', data);
}

export async function updateVendor(id: string, data: Partial<Vendor>) {
  return pbUpdate<Vendor>('ip_vendors', id, data);
}

export async function deleteVendor(id: string) {
  return pbDelete('ip_vendors', id);
}

// --- GL Accounts ---

export async function listGlAccounts() {
  return pbList<GlAccount>('ip_gl_accounts', { perPage: 100, sort: 'code' });
}

export async function createGlAccount(data: Partial<GlAccount>) {
  return pbCreate<GlAccount>('ip_gl_accounts', data);
}

export async function updateGlAccount(id: string, data: Partial<GlAccount>) {
  return pbUpdate<GlAccount>('ip_gl_accounts', id, data);
}

export async function deleteGlAccount(id: string) {
  return pbDelete('ip_gl_accounts', id);
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

export function formatDate(date: string | null | undefined): string {
  if (!date) return '\u2014';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
