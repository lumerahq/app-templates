import { type PbRecord, pbCreate, pbDelete, pbGet, pbList, pbSql, pbUpdate } from '@lumerahq/ui/lib';

// --- Types ---

export type Customer = PbRecord & {
  name: string;
  email: string;
  contact_name: string;
  phone: string;
  total_outstanding: number;
  oldest_due_date: string;
  status: 'active' | 'contacted' | 'promised' | 'escalated' | 'resolved';
  last_contact_date: string;
  notes: string;
};

export type ArInvoice = PbRecord & {
  customer: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  status: 'open' | 'partial' | 'paid' | 'written_off';
};

export type CollectionActivity = PbRecord & {
  customer: string;
  activity_type: 'email_draft' | 'email_sent' | 'call' | 'note' | 'promise_to_pay';
  subject: string;
  content: string;
  contact_date: string;
};

export type AuditLogEntry = PbRecord & {
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown>;
};

// --- Dashboard ---

export async function getDashboardStats() {
  const result = await pbSql<{
    total_customers: string;
    total_outstanding: string;
    active: string;
    contacted: string;
    escalated: string;
  }>({
    sql: `
      SELECT
        COUNT(*) as total_customers,
        COALESCE(SUM(total_outstanding), 0) as total_outstanding,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated
      FROM customers
      WHERE status != 'resolved'
    `,
  });
  return result.rows?.[0] ?? { total_customers: '0', total_outstanding: '0', active: '0', contacted: '0', escalated: '0' };
}

export async function getAgingBuckets() {
  const result = await pbSql<{ bucket: string; count: string; total: string }>({
    sql: `
      SELECT
        CASE
          WHEN days_overdue <= 0 THEN 'Current'
          WHEN days_overdue <= 30 THEN '1-30 days'
          WHEN days_overdue <= 60 THEN '31-60 days'
          WHEN days_overdue <= 90 THEN '61-90 days'
          ELSE '90+ days'
        END as bucket,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM ar_invoices
      WHERE status = 'open'
      GROUP BY bucket
    `,
  });
  return result.rows ?? [];
}

// --- Customers ---

export async function listCustomers(page = 1, statusFilter?: string) {
  const filter = statusFilter ? JSON.stringify({ status: statusFilter }) : undefined;
  return pbList<Customer>('customers', {
    page,
    perPage: 20,
    sort: '-total_outstanding',
    filter,
  });
}

export async function getCustomer(id: string) {
  return pbGet<Customer>('customers', id);
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
  return pbUpdate<Customer>('customers', id, data);
}

export async function createCustomer(data: Partial<Customer>) {
  return pbCreate<Customer>('customers', data);
}

export async function deleteCustomer(id: string) {
  return pbDelete('customers', id);
}

// --- AR Invoices ---

export async function listCustomerInvoices(customerId: string) {
  return pbList<ArInvoice>('ar_invoices', {
    perPage: 100,
    sort: '-days_overdue',
    filter: JSON.stringify({ customer: customerId }),
  });
}

export async function createInvoice(data: Partial<ArInvoice>) {
  return pbCreate<ArInvoice>('ar_invoices', data);
}

export async function updateInvoice(id: string, data: Partial<ArInvoice>) {
  return pbUpdate<ArInvoice>('ar_invoices', id, data);
}

export async function deleteInvoice(id: string) {
  return pbDelete('ar_invoices', id);
}

// --- Collection Activities ---

export async function listCustomerActivities(customerId: string) {
  return pbList<CollectionActivity>('collection_activities', {
    perPage: 50,
    sort: '-created',
    filter: JSON.stringify({ customer: customerId }),
  });
}

export async function createActivity(data: Partial<CollectionActivity>) {
  return pbCreate<CollectionActivity>('collection_activities', data);
}

// --- Audit Log ---

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata?: Record<string, unknown>,
) {
  return pbCreate<AuditLogEntry>('ca_audit_log', {
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
    metadata: metadata ?? {},
  });
}

export async function listAuditLog(page = 1) {
  return pbList<AuditLogEntry>('ca_audit_log', {
    page,
    perPage: 50,
    sort: '-created',
  });
}

// --- Helpers ---

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '\u2014';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}
