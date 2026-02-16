import { type PbRecord, pbSql, pbGet, pbUpdate, pbList, pbCreate } from '@lumerahq/ui/lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Invoice = PbRecord & {
  vendor: string;
  invoice_number: string;
  date: string;
  due_date: string;
  amount: number;
  status: string;
  gl_code: string;
  department: string;
  description: string;
  source_document: string;
  coding_confidence: number;
  notes: string;
  approved_by: string;
  approved_at: string;
};

export type InvoiceWithVendor = Invoice & {
  vendor_name: string;
};

export type Vendor = PbRecord & {
  name: string;
  email: string;
  default_gl_code: string;
  payment_terms: string;
  status: string;
};

export type GlAccount = PbRecord & {
  code: string;
  name: string;
  type: string;
  department: string;
  active: boolean;
};

export type AuditEntry = PbRecord & {
  entity_type: string;
  entity_id: string;
  action: string;
  details: string;
  performed_by: string;
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type StatusSummary = {
  status: string;
  count: number;
  total: number;
};

export async function getDashboardStats(): Promise<StatusSummary[]> {
  const res = await pbSql<StatusSummary>({
    sql: `SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
          FROM invoices
          GROUP BY status`,
  });
  // pbSql returns numbers as strings — cast to avoid string concatenation in reduce()
  return (res.rows ?? []).map((r) => ({
    status: r.status,
    count: Number(r.count),
    total: Number(r.total),
  }));
}

export async function getRecentInvoices(limit = 10): Promise<InvoiceWithVendor[]> {
  const res = await pbSql<InvoiceWithVendor>({
    sql: `SELECT i.*, v.name as vendor_name
          FROM invoices i
          LEFT JOIN vendors v ON i.vendor = v.id
          ORDER BY i.created DESC
          LIMIT ?`,
    args: [limit],
  });
  return res.rows ?? [];
}

// ---------------------------------------------------------------------------
// Invoice list (paginated, with vendor JOIN)
// ---------------------------------------------------------------------------

export async function listInvoices(opts: {
  page?: number;
  perPage?: number;
  status?: string;
}): Promise<{ items: InvoiceWithVendor[]; total: number }> {
  const { page = 1, perPage = 20, status } = opts;
  const offset = (page - 1) * perPage;

  const conditions: string[] = [];
  const args: unknown[] = [];
  if (status) {
    conditions.push('i.status = ?');
    args.push(status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pbSql<{ total: number }>({
    sql: `SELECT COUNT(*) as total FROM invoices i ${where}`,
    args,
  });
  const total = Number(countRes.rows?.[0]?.total ?? 0);

  const dataRes = await pbSql<InvoiceWithVendor>({
    sql: `SELECT i.*, v.name as vendor_name
          FROM invoices i
          LEFT JOIN vendors v ON i.vendor = v.id
          ${where}
          ORDER BY i.created DESC
          LIMIT ? OFFSET ?`,
    args: [...args, perPage, offset],
  });

  return { items: dataRes.rows ?? [], total };
}

// ---------------------------------------------------------------------------
// Invoice CRUD
// ---------------------------------------------------------------------------

export async function getInvoice(id: string) {
  return pbGet<Invoice>('invoices', id);
}

export async function createInvoice(data: Record<string, unknown>) {
  return pbCreate<Invoice>('invoices', data);
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  return pbUpdate('invoices', id, data);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function getAuditLog(entityId: string): Promise<AuditEntry[]> {
  const res = await pbSql<AuditEntry>({
    sql: `SELECT * FROM audit_log
          WHERE entity_type = 'invoice' AND entity_id = ?
          ORDER BY created DESC`,
    args: [entityId],
  });
  return res.rows ?? [];
}

export async function logAction(entityId: string, action: string, details?: string) {
  return pbCreate<AuditEntry>('audit_log', {
    entity_type: 'invoice',
    entity_id: entityId,
    action,
    details: details ?? '',
    performed_by: 'current_user',
  });
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export async function listGlAccounts(page = 1, perPage = 50) {
  return pbList<GlAccount>('gl_accounts', { page, perPage, sort: 'code' });
}

export async function listVendors(page = 1, perPage = 50) {
  return pbList<Vendor>('vendors', { page, perPage, sort: 'name' });
}
