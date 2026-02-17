import { type PbRecord, pbCreate, pbDelete, pbGet, pbList, pbSql, pbUpdate } from '@lumerahq/ui/lib';

// --- Types ---

export type FixedAsset = PbRecord & {
  name: string;
  asset_tag: string;
  category: 'equipment' | 'furniture' | 'vehicles' | 'software' | 'buildings' | 'leasehold_improvements';
  status: 'active' | 'fully_depreciated' | 'disposed';
  acquisition_date: string;
  cost_basis: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: 'straight_line' | 'declining_balance';
  accumulated_depreciation: number;
  location: string;
  department: string;
  disposal_date: string;
  disposal_proceeds: number;
  notes: string;
  external_id: string;
};

export type DepreciationEntry = PbRecord & {
  fixed_asset: string;
  period: string;
  depreciation_amount: number;
  accumulated_total: number;
  net_book_value: number;
  status: 'pending' | 'posted';
  external_id: string;
};

export type GlAccount = PbRecord & {
  code: string;
  name: string;
  account_type: 'asset' | 'contra_asset' | 'expense';
  external_id: string;
};

// --- Dashboard ---

export type DashboardStats = {
  total_assets: string;
  total_cost: string;
  total_accumulated: string;
  total_nbv: string;
  active_count: string;
  fully_depreciated_count: string;
  disposed_count: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await pbSql<DashboardStats>({
    sql: `
      SELECT
        COUNT(*) as total_assets,
        COALESCE(SUM(cost_basis), 0) as total_cost,
        COALESCE(SUM(accumulated_depreciation), 0) as total_accumulated,
        COALESCE(SUM(cost_basis - accumulated_depreciation), 0) as total_nbv,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'fully_depreciated' THEN 1 ELSE 0 END) as fully_depreciated_count,
        SUM(CASE WHEN status = 'disposed' THEN 1 ELSE 0 END) as disposed_count
      FROM fixed_assets
    `,
  });
  return result.rows?.[0] ?? {
    total_assets: '0', total_cost: '0', total_accumulated: '0', total_nbv: '0',
    active_count: '0', fully_depreciated_count: '0', disposed_count: '0',
  };
}

export type CategoryBreakdown = {
  category: string;
  count: string;
  total_cost: string;
  total_nbv: string;
};

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const result = await pbSql<CategoryBreakdown>({
    sql: `
      SELECT
        category,
        COUNT(*) as count,
        COALESCE(SUM(cost_basis), 0) as total_cost,
        COALESCE(SUM(cost_basis - accumulated_depreciation), 0) as total_nbv
      FROM fixed_assets
      WHERE status != 'disposed'
      GROUP BY category
      ORDER BY total_nbv DESC
    `,
  });
  return result.rows ?? [];
}

// --- Fixed Assets ---

export async function listAssets(page = 1, statusFilter?: string, categoryFilter?: string) {
  const filters: Record<string, string> = {};
  if (statusFilter) filters.status = statusFilter;
  if (categoryFilter) filters.category = categoryFilter;
  const filter = Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined;
  return pbList<FixedAsset>('fixed_assets', {
    page,
    perPage: 20,
    sort: '-created',
    filter,
  });
}

export async function getAsset(id: string) {
  return pbGet<FixedAsset>('fixed_assets', id);
}

export async function createAsset(data: Partial<FixedAsset>) {
  return pbCreate<FixedAsset>('fixed_assets', data);
}

export async function updateAsset(id: string, data: Partial<FixedAsset>) {
  return pbUpdate<FixedAsset>('fixed_assets', id, data);
}

export async function deleteAsset(id: string) {
  return pbDelete('fixed_assets', id);
}

// --- Depreciation Entries ---

export async function listDepreciationEntries(assetId: string) {
  return pbList<DepreciationEntry>('depreciation_entries', {
    perPage: 100,
    sort: 'period',
    filter: JSON.stringify({ fixed_asset: assetId }),
  });
}

export type DepreciationEntryWithAsset = DepreciationEntry & {
  asset_name: string;
  asset_tag: string;
};

export async function listAllDepreciationEntries(page = 1, statusFilter?: string) {
  const perPage = 50;
  const offset = (page - 1) * perPage;
  const where = statusFilter ? `WHERE d.status = '${statusFilter}'` : '';

  const countResult = await pbSql<{ total: string }>({
    sql: `SELECT COUNT(*) as total FROM depreciation_entries d ${where}`,
  });
  const totalItems = Number(countResult.rows?.[0]?.total ?? 0);

  const result = await pbSql<DepreciationEntryWithAsset>({
    sql: `
      SELECT d.*, a.name as asset_name, a.asset_tag
      FROM depreciation_entries d
      LEFT JOIN fixed_assets a ON d.fixed_asset = a.id
      ${where}
      ORDER BY d.period DESC
      LIMIT ${perPage} OFFSET ${offset}
    `,
  });

  return {
    items: result.rows ?? [],
    page,
    perPage,
    totalItems,
    totalPages: Math.ceil(totalItems / perPage),
  };
}

export async function updateDepreciationEntry(id: string, data: Partial<DepreciationEntry>) {
  return pbUpdate<DepreciationEntry>('depreciation_entries', id, data);
}

// --- GL Accounts ---

export async function listGlAccounts() {
  return pbList<GlAccount>('asset_gl_accounts', { perPage: 100, sort: 'code' });
}

export async function createGlAccount(data: Partial<GlAccount>) {
  return pbCreate<GlAccount>('asset_gl_accounts', data);
}

export async function updateGlAccount(id: string, data: Partial<GlAccount>) {
  return pbUpdate<GlAccount>('asset_gl_accounts', id, data);
}

export async function deleteGlAccount(id: string) {
  return pbDelete('asset_gl_accounts', id);
}

// --- Helpers ---

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
