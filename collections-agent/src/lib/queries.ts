import { type PbRecord, pbCreate, pbDelete, pbGet, pbList, pbSql, pbUpdate } from '@lumerahq/ui/lib';

// --- Types ---

export type Customer = PbRecord & {
  name: string;
  email: string;
  phone: string;
  contact_name: string;
  status: 'active' | 'contacted' | 'promised' | 'escalated' | 'resolved';
  total_outstanding: number;
  total_paid: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  payment_terms: string;
  next_action: string;
  next_follow_up: string;
  last_contact_date: string;
  notes: string;
};

export type Invoice = PbRecord & {
  customer_id: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  status: 'open' | 'partial' | 'paid' | 'written_off';
  paid_amount: number;
  balance_remaining: number;
  reminder_count: number;
  last_reminder_date: string;
  notes: string;
};

export type Activity = PbRecord & {
  customer_id: string;
  customer_name: string;
  activity_type: 'email' | 'call' | 'note' | 'promise' | 'escalation' | 'payment';
  subject: string;
  content: string;
  outcome: string;
  follow_up_date: string;
};

export type Payment = PbRecord & {
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_date: string;
  reference: string;
  method: 'wire' | 'check' | 'ach' | 'credit_card' | 'other';
  applied_invoices: unknown;
  notes: string;
};

export type AuditLog = PbRecord & {
  action: 'create' | 'update' | 'delete';
  action_category: 'customer' | 'invoice';
  action_label: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  target_collection: string;
  target_record_id: string;
  before_state: unknown;
  after_state: unknown;
};

export type ReminderTemplate = PbRecord & {
  name: string;
  stage: 'friendly' | 'firm' | 'urgent' | 'final';
  days_overdue_trigger: number;
  subject_template: string;
  body_template: string;
  enabled: 'yes' | 'no';
};

export type EscalationRule = PbRecord & {
  name: string;
  min_days_overdue: number;
  min_amount: number;
  action_type: 'flag' | 'escalate' | 'final_notice';
  enabled: 'yes' | 'no';
};

// --- Dashboard ---

export type DashboardStats = {
  total_outstanding: string;
  active_customers: string;
  followups_due: string;
  escalated: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await pbSql<DashboardStats>({
    sql: `
      SELECT
        COALESCE(SUM(total_outstanding), 0) as total_outstanding,
        COUNT(*) as active_customers,
        SUM(CASE WHEN next_follow_up <= date('now') AND status != 'resolved' THEN 1 ELSE 0 END) as followups_due,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated
      FROM ca_customers
      WHERE status != 'resolved'
    `,
  });
  return result.rows?.[0] ?? { total_outstanding: '0', active_customers: '0', followups_due: '0', escalated: '0' };
}

export type AgingBucket = {
  bucket: string;
  amount: string;
  count: string;
};

export async function getAgingBreakdown(): Promise<AgingBucket[]> {
  const result = await pbSql<AgingBucket>({
    sql: `
      SELECT
        CASE
          WHEN days_overdue <= 0 THEN 'Current'
          WHEN days_overdue BETWEEN 1 AND 30 THEN '1-30 days'
          WHEN days_overdue BETWEEN 31 AND 60 THEN '31-60 days'
          WHEN days_overdue BETWEEN 61 AND 90 THEN '61-90 days'
          ELSE '90+ days'
        END as bucket,
        COALESCE(SUM(balance_remaining), 0) as amount,
        COUNT(*) as count
      FROM ca_invoices
      WHERE status IN ('open', 'partial')
      GROUP BY bucket
      ORDER BY MIN(days_overdue)
    `,
  });
  return result.rows ?? [];
}

// --- Customers ---

export async function listCustomers(page = 1, statusFilter?: string, riskFilter?: string, sort = '-total_outstanding', perPage = 20) {
  const filterObj: Record<string, unknown> = {};
  if (statusFilter) filterObj.status = statusFilter;
  if (riskFilter) filterObj.risk_level = riskFilter;
  const filter = Object.keys(filterObj).length > 0 ? JSON.stringify(filterObj) : undefined;
  return pbList<Customer>('ca_customers', {
    page,
    perPage,
    sort,
    filter,
  });
}

export async function getCustomer(id: string) {
  return pbGet<Customer>('ca_customers', id);
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
  return pbUpdate<Customer>('ca_customers', id, data);
}

export async function createCustomer(data: Partial<Customer>) {
  return pbCreate<Customer>('ca_customers', data);
}

export async function deleteCustomer(id: string) {
  return pbDelete('ca_customers', id);
}

// --- Invoices ---

export async function listCustomerInvoices(customerId: string) {
  return pbList<Invoice>('ca_invoices', {
    filter: JSON.stringify({ customer_id: customerId }),
    perPage: 100,
    sort: 'due_date',
  });
}

export async function createInvoice(data: Partial<Invoice>) {
  return pbCreate<Invoice>('ca_invoices', data);
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  return pbUpdate<Invoice>('ca_invoices', id, data);
}

export async function deleteInvoice(id: string) {
  return pbDelete('ca_invoices', id);
}

// --- Activities ---

export async function listCustomerActivities(customerId: string) {
  return pbList<Activity>('ca_activities', {
    filter: JSON.stringify({ customer_id: customerId }),
    perPage: 100,
    sort: '-created',
  });
}

export async function createActivity(data: Partial<Activity>) {
  return pbCreate<Activity>('ca_activities', data);
}

// --- Payments ---

export async function listCustomerPayments(customerId: string) {
  return pbList<Payment>('ca_payments', {
    filter: JSON.stringify({ customer_id: customerId }),
    perPage: 100,
    sort: '-payment_date',
  });
}

// --- Audit Log ---

export async function listAuditLog(page = 1, categoryFilter?: string, actionFilter?: string) {
  const filterObj: Record<string, unknown> = {};
  if (categoryFilter) filterObj.action_category = categoryFilter;
  if (actionFilter) filterObj.action = actionFilter;
  const filter = Object.keys(filterObj).length > 0 ? JSON.stringify(filterObj) : undefined;
  return pbList<AuditLog>('ca_audit_log', {
    page,
    perPage: 20,
    sort: '-created',
    filter,
  });
}

// --- Reminder Templates ---

export async function listReminderTemplates() {
  return pbList<ReminderTemplate>('ca_reminder_templates', { perPage: 100, sort: 'days_overdue_trigger' });
}

export async function createReminderTemplate(data: Partial<ReminderTemplate>) {
  return pbCreate<ReminderTemplate>('ca_reminder_templates', data);
}

export async function updateReminderTemplate(id: string, data: Partial<ReminderTemplate>) {
  return pbUpdate<ReminderTemplate>('ca_reminder_templates', id, data);
}

export async function deleteReminderTemplate(id: string) {
  return pbDelete('ca_reminder_templates', id);
}

// --- Escalation Rules ---

export async function listEscalationRules() {
  return pbList<EscalationRule>('ca_escalation_rules', { perPage: 100, sort: 'min_days_overdue' });
}

export async function createEscalationRule(data: Partial<EscalationRule>) {
  return pbCreate<EscalationRule>('ca_escalation_rules', data);
}

export async function updateEscalationRule(id: string, data: Partial<EscalationRule>) {
  return pbUpdate<EscalationRule>('ca_escalation_rules', id, data);
}

export async function deleteEscalationRule(id: string) {
  return pbDelete('ca_escalation_rules', id);
}

// --- Helpers ---

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '\u2014';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '\u2014';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
