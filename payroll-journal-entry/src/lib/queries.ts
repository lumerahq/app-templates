import { type PbRecord, pbCreate, pbDelete, pbGet, pbList, pbSql, pbUpdate } from '@lumerahq/ui/lib';

// --- Types ---

export type PayrollRun = PbRecord & {
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: 'draft' | 'processing' | 'review' | 'posted' | 'rejected';
  document: { object_key: string; original_name: string; size: number; content_type: string } | null;
  total_debits: number;
  total_credits: number;
  notes: string;
  extracted_data: Record<string, unknown> | null;
};

export type JournalEntry = PbRecord & {
  payroll_run: string;
  account_code: string;
  account_name: string;
  department: string;
  debit_amount: number;
  credit_amount: number;
  memo: string;
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
  posted: string;
  draft: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await pbSql<DashboardStats>({
    sql: `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) as posted,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
      FROM payroll_runs
    `,
  });
  return result.rows?.[0] ?? { total: '0', pending_review: '0', posted: '0', draft: '0' };
}

// --- Payroll Runs ---

export async function listPayrollRuns(page = 1, statusFilter?: string) {
  const filter = statusFilter ? JSON.stringify({ status: statusFilter }) : undefined;
  return pbList<PayrollRun>('payroll_runs', {
    page,
    perPage: 20,
    sort: '-created',
    filter,
  });
}

export async function getPayrollRun(id: string) {
  return pbGet<PayrollRun>('payroll_runs', id);
}

export async function updatePayrollRun(id: string, data: Partial<PayrollRun>) {
  return pbUpdate<PayrollRun>('payroll_runs', id, data);
}

// --- Journal Entries ---

export async function listJournalEntries(payrollRunId: string) {
  return pbList<JournalEntry>('journal_entries', {
    perPage: 200,
    sort: '-debit_amount',
    filter: JSON.stringify({ payroll_run: payrollRunId }),
  });
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

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '\u2014';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}
