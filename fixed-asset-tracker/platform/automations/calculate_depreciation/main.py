"""
Calculate monthly depreciation for fixed assets.

Supports straight-line and declining-balance methods.
- If asset_id is provided, processes that single asset.
- If asset_id is omitted, processes all active assets in bulk.
"""

from lumera import pb


def depreciate_asset(asset: dict, period: str) -> dict:
    """Calculate depreciation for a single asset. Returns a result dict."""
    asset_id = asset["id"]
    name = asset.get("name", "Unknown")
    status = asset.get("status", "active")

    if status != "active":
        print(f"  Skipping {name} — status is '{status}'")
        return {"asset": name, "status": "skipped", "message": f"Asset is {status}"}

    cost_basis = float(asset.get("cost_basis", 0))
    salvage_value = float(asset.get("salvage_value", 0))
    useful_life_months = int(asset.get("useful_life_months", 0))
    method = asset.get("depreciation_method", "straight_line")
    accumulated = float(asset.get("accumulated_depreciation", 0))

    depreciable_amount = cost_basis - salvage_value
    remaining = depreciable_amount - accumulated

    if remaining <= 0 or useful_life_months <= 0:
        print(f"  Skipping {name} — fully depreciated")
        pb.update("fixed_assets", asset_id, {"status": "fully_depreciated"})
        return {"asset": name, "status": "skipped", "message": "Fully depreciated"}

    # Check if entry already exists for this period
    existing = pb.search(
        "depreciation_entries",
        filter={"fixed_asset": asset_id, "period": period},
        per_page=1,
    )
    if existing.get("items"):
        print(f"  Skipping {name} — entry exists for {period}")
        return {"asset": name, "status": "skipped", "message": "Entry already exists"}

    # Calculate depreciation
    if method == "declining_balance":
        rate = 2.0 / useful_life_months  # double-declining
        monthly = (cost_basis - accumulated) * rate
    else:
        monthly = depreciable_amount / useful_life_months

    # Cap at remaining depreciable amount
    monthly = round(min(monthly, remaining), 2)
    new_accumulated = round(accumulated + monthly, 2)
    nbv = round(cost_basis - new_accumulated, 2)

    print(f"  {name}: ${monthly:,.2f} ({method}) — NBV ${nbv:,.2f}")

    # Create depreciation entry
    pb.create("depreciation_entries", {
        "fixed_asset": asset_id,
        "period": period,
        "depreciation_amount": monthly,
        "accumulated_total": new_accumulated,
        "net_book_value": nbv,
        "status": "pending",
    })

    # Update asset
    update_data = {"accumulated_depreciation": new_accumulated}
    if nbv <= salvage_value:
        update_data["status"] = "fully_depreciated"
        print(f"  {name} is now fully depreciated")

    pb.update("fixed_assets", asset_id, update_data)

    return {
        "asset": name,
        "status": "success",
        "depreciation": monthly,
        "accumulated": new_accumulated,
        "nbv": nbv,
    }


def main(period: str, asset_id: str = ""):
    if asset_id:
        # Single asset mode
        asset = pb.get("fixed_assets", asset_id)
        if not asset:
            print(f"Asset {asset_id} not found")
            return {"status": "error", "message": "Asset not found"}

        print(f"Running depreciation for period {period}")
        result = depreciate_asset(asset, period)
        return result

    # Bulk mode — process all active assets
    print(f"Running bulk depreciation for period {period}")
    all_assets = []
    page = 1
    while True:
        batch = pb.search("fixed_assets", filter={"status": "active"}, per_page=200, page=page)
        items = batch.get("items", [])
        all_assets.extend(items)
        if page >= batch.get("totalPages", 1):
            break
        page += 1

    print(f"Found {len(all_assets)} active assets")

    succeeded = 0
    skipped = 0
    results = []

    for asset in all_assets:
        result = depreciate_asset(asset, period)
        results.append(result)
        if result["status"] == "success":
            succeeded += 1
        else:
            skipped += 1

    print(f"\nDone: {succeeded} recorded, {skipped} skipped")
    return {
        "status": "success",
        "succeeded": succeeded,
        "skipped": skipped,
        "total": len(all_assets),
        "results": results,
    }
