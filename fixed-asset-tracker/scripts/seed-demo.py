# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data for the Fixed Asset Tracker template (idempotent).

Uses bulk_upsert for efficiency. Safe to run multiple times — existing
records are matched by external_id and updated in place.

Usage:
    lumera run scripts/seed-demo.py
"""

from lumera import pb


def resolve_ids(collection: str, external_ids: list[str]) -> dict[str, str]:
    """Fetch existing records and return {external_id: id} map."""
    if not external_ids:
        return {}
    result = pb.search(collection, per_page=200)
    return {
        r["external_id"]: r["id"]
        for r in result.get("items", [])
        if r.get("external_id") in external_ids
    }


def attach_ids(records: list[dict], id_map: dict[str, str]) -> list[dict]:
    """Attach internal IDs to records that already exist (for upsert)."""
    for r in records:
        existing_id = id_map.get(r.get("external_id", ""))
        if existing_id:
            r["id"] = existing_id
    return records


# ── GL Accounts ──────────────────────────────────────────────────────

gl_accounts = [
    {"external_id": "gl:1500", "code": "1500", "name": "Fixed Assets - Equipment", "account_type": "asset"},
    {"external_id": "gl:1510", "code": "1510", "name": "Fixed Assets - Furniture", "account_type": "asset"},
    {"external_id": "gl:1520", "code": "1520", "name": "Fixed Assets - Vehicles", "account_type": "asset"},
    {"external_id": "gl:1530", "code": "1530", "name": "Fixed Assets - Software", "account_type": "asset"},
    {"external_id": "gl:1540", "code": "1540", "name": "Fixed Assets - Buildings", "account_type": "asset"},
    {"external_id": "gl:1550", "code": "1550", "name": "Accumulated Depreciation", "account_type": "contra_asset"},
    {"external_id": "gl:6150", "code": "6150", "name": "Depreciation Expense", "account_type": "expense"},
    {"external_id": "gl:6900", "code": "6900", "name": "Gain/Loss on Disposal", "account_type": "expense"},
]

print("Seeding GL accounts...")
ext_ids = [a["external_id"] for a in gl_accounts]
gl_id_map = resolve_ids("gl_accounts", ext_ids)
attach_ids(gl_accounts, gl_id_map)
result = pb.bulk_upsert("gl_accounts", gl_accounts)
print(f"  {result['succeeded']} succeeded, {result['failed']} failed")

# ── Fixed Assets ─────────────────────────────────────────────────────

assets = [
    # Active - Equipment
    {
        "external_id": "asset:macbook-pro-001",
        "name": "MacBook Pro 16\" M3 Max",
        "asset_tag": "FA-001",
        "category": "equipment",
        "status": "active",
        "acquisition_date": "2024-03-15",
        "cost_basis": 3499.00,
        "salvage_value": 350.00,
        "useful_life_months": 36,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 2624.25,
        "location": "HQ - Floor 2",
        "department": "Engineering",
    },
    {
        "external_id": "asset:dell-monitor-002",
        "name": "Dell U3423WE Ultrawide Monitor",
        "asset_tag": "FA-002",
        "category": "equipment",
        "status": "active",
        "acquisition_date": "2024-06-01",
        "cost_basis": 1099.99,
        "salvage_value": 100.00,
        "useful_life_months": 60,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 166.66,
        "location": "HQ - Floor 2",
        "department": "Engineering",
    },
    {
        "external_id": "asset:server-rack-003",
        "name": "Dell PowerEdge R760 Server",
        "asset_tag": "FA-003",
        "category": "equipment",
        "status": "active",
        "acquisition_date": "2024-01-10",
        "cost_basis": 12500.00,
        "salvage_value": 1000.00,
        "useful_life_months": 60,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 2875.00,
        "location": "Data Center",
        "department": "IT",
    },
    {
        "external_id": "asset:printer-004",
        "name": "HP LaserJet Pro MFP",
        "asset_tag": "FA-004",
        "category": "equipment",
        "status": "active",
        "acquisition_date": "2025-01-15",
        "cost_basis": 899.00,
        "salvage_value": 50.00,
        "useful_life_months": 60,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 155.78,
        "location": "HQ - Floor 1",
        "department": "Operations",
    },
    # Active - Furniture
    {
        "external_id": "asset:standing-desk-005",
        "name": "Herman Miller Standing Desk (x10)",
        "asset_tag": "FA-005",
        "category": "furniture",
        "status": "active",
        "acquisition_date": "2024-02-01",
        "cost_basis": 15000.00,
        "salvage_value": 1500.00,
        "useful_life_months": 84,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 3857.14,
        "location": "HQ - Floor 2",
        "department": "Operations",
    },
    {
        "external_id": "asset:conference-table-006",
        "name": "Conference Room Table & Chairs",
        "asset_tag": "FA-006",
        "category": "furniture",
        "status": "active",
        "acquisition_date": "2023-09-01",
        "cost_basis": 8500.00,
        "salvage_value": 500.00,
        "useful_life_months": 84,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 2857.14,
        "location": "HQ - Floor 3",
        "department": "Operations",
    },
    # Active - Vehicles
    {
        "external_id": "asset:delivery-van-007",
        "name": "Ford Transit Cargo Van",
        "asset_tag": "FA-007",
        "category": "vehicles",
        "status": "active",
        "acquisition_date": "2024-04-01",
        "cost_basis": 42000.00,
        "salvage_value": 8000.00,
        "useful_life_months": 60,
        "depreciation_method": "declining_balance",
        "accumulated_depreciation": 14280.00,
        "location": "Warehouse",
        "department": "Logistics",
    },
    # Active - Software
    {
        "external_id": "asset:salesforce-license-008",
        "name": "Salesforce Enterprise License",
        "asset_tag": "FA-008",
        "category": "software",
        "status": "active",
        "acquisition_date": "2024-07-01",
        "cost_basis": 36000.00,
        "salvage_value": 0,
        "useful_life_months": 36,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 8000.00,
        "location": "Cloud",
        "department": "Sales",
    },
    {
        "external_id": "asset:figma-enterprise-009",
        "name": "Figma Enterprise (3-yr prepaid)",
        "asset_tag": "FA-009",
        "category": "software",
        "status": "active",
        "acquisition_date": "2025-01-01",
        "cost_basis": 18000.00,
        "salvage_value": 0,
        "useful_life_months": 36,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 500.00,
        "location": "Cloud",
        "department": "Design",
    },
    # Active - Buildings/Leasehold
    {
        "external_id": "asset:office-buildout-010",
        "name": "Office Buildout - 2nd Floor",
        "asset_tag": "FA-010",
        "category": "leasehold_improvements",
        "status": "active",
        "acquisition_date": "2023-06-01",
        "cost_basis": 85000.00,
        "salvage_value": 0,
        "useful_life_months": 120,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 22666.67,
        "location": "HQ - Floor 2",
        "department": "Operations",
    },
    # Fully Depreciated
    {
        "external_id": "asset:old-laptop-011",
        "name": "MacBook Pro 2019 (retired)",
        "asset_tag": "FA-011",
        "category": "equipment",
        "status": "fully_depreciated",
        "acquisition_date": "2019-09-01",
        "cost_basis": 2799.00,
        "salvage_value": 200.00,
        "useful_life_months": 36,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 2599.00,
        "location": "Storage",
        "department": "Engineering",
    },
    {
        "external_id": "asset:old-printer-012",
        "name": "HP OfficeJet 9010 (retired)",
        "asset_tag": "FA-012",
        "category": "equipment",
        "status": "fully_depreciated",
        "acquisition_date": "2020-01-01",
        "cost_basis": 549.00,
        "salvage_value": 0,
        "useful_life_months": 36,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 549.00,
        "location": "Storage",
        "department": "Operations",
    },
    # Disposed
    {
        "external_id": "asset:old-server-013",
        "name": "Dell PowerEdge R640 (sold)",
        "asset_tag": "FA-013",
        "category": "equipment",
        "status": "disposed",
        "acquisition_date": "2020-03-01",
        "cost_basis": 8500.00,
        "salvage_value": 500.00,
        "useful_life_months": 60,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 8000.00,
        "location": "Disposed",
        "department": "IT",
        "disposal_date": "2025-01-15",
        "disposal_proceeds": 1200.00,
        "notes": "Sold to refurbishment vendor. Gain on disposal: $700",
    },
    {
        "external_id": "asset:old-van-014",
        "name": "2018 Ford Transit (traded in)",
        "asset_tag": "FA-014",
        "category": "vehicles",
        "status": "disposed",
        "acquisition_date": "2018-06-01",
        "cost_basis": 35000.00,
        "salvage_value": 5000.00,
        "useful_life_months": 60,
        "depreciation_method": "straight_line",
        "accumulated_depreciation": 30000.00,
        "location": "Disposed",
        "department": "Logistics",
        "disposal_date": "2024-12-01",
        "disposal_proceeds": 7500.00,
        "notes": "Traded in for new delivery van. Gain on disposal: $2,500",
    },
]

print("\nSeeding fixed assets...")
ext_ids = [a["external_id"] for a in assets]
asset_id_map = resolve_ids("fixed_assets", ext_ids)
attach_ids(assets, asset_id_map)
result = pb.bulk_upsert("fixed_assets", assets)
print(f"  {result['succeeded']} succeeded, {result['failed']} failed")

# Re-fetch assets to get external_id → id map (includes newly created)
asset_lookup = pb.search("fixed_assets", per_page=200)
asset_ids = {r["external_id"]: r["id"] for r in asset_lookup.get("items", [])}

# ── Depreciation Entries (sample history for a few assets) ───────────

macbook_id = asset_ids.get("asset:macbook-pro-001")
server_id = asset_ids.get("asset:server-rack-003")

depreciation_entries = []

if macbook_id:
    # MacBook: $3499 cost, $350 salvage, 36 months SL = $87.47/month
    monthly = 87.47
    periods = [
        "2024-04", "2024-05", "2024-06", "2024-07", "2024-08", "2024-09",
        "2024-10", "2024-11", "2024-12", "2025-01", "2025-02",
    ]
    accumulated = 0
    for i, period in enumerate(periods):
        accumulated = round(accumulated + monthly, 2)
        nbv = round(3499.00 - accumulated, 2)
        depreciation_entries.append({
            "external_id": f"dep:macbook-{period}",
            "fixed_asset": macbook_id,
            "period": period,
            "depreciation_amount": monthly,
            "accumulated_total": accumulated,
            "net_book_value": nbv,
            "status": "posted" if i < len(periods) - 1 else "pending",
        })

if server_id:
    # Server: $12500 cost, $1000 salvage, 60 months SL = $191.67/month
    monthly = 191.67
    periods = [
        "2024-02", "2024-03", "2024-04", "2024-05", "2024-06",
        "2024-07", "2024-08", "2024-09", "2024-10", "2024-11",
        "2024-12", "2025-01", "2025-02",
    ]
    accumulated = 0
    for i, period in enumerate(periods):
        accumulated = round(accumulated + monthly, 2)
        nbv = round(12500.00 - accumulated, 2)
        depreciation_entries.append({
            "external_id": f"dep:server-{period}",
            "fixed_asset": server_id,
            "period": period,
            "depreciation_amount": monthly,
            "accumulated_total": accumulated,
            "net_book_value": nbv,
            "status": "posted" if i < len(periods) - 1 else "pending",
        })

print(f"\nSeeding {len(depreciation_entries)} depreciation entries...")
ext_ids = [e["external_id"] for e in depreciation_entries]
dep_id_map = resolve_ids("depreciation_entries", ext_ids)
attach_ids(depreciation_entries, dep_id_map)
result = pb.bulk_upsert("depreciation_entries", depreciation_entries)
print(f"  {result['succeeded']} succeeded, {result['failed']} failed")

print(f"\nDone! Seeded:")
print(f"  {len(gl_accounts)} GL accounts")
print(f"  {len(assets)} fixed assets")
print(f"  {len(depreciation_entries)} depreciation entries")
