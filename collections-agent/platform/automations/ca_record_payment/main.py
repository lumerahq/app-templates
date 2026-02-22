"""
Record a payment and apply it to outstanding invoices.

Applies payment oldest-first (by due date) unless specific invoice IDs are provided.
Updates invoice balances, customer totals, and auto-resolves when fully paid.
"""

from lumera import pb


def main(customer_id: str, amount: float, payment_date: str, method: str, reference: str = "", invoice_ids: str = ""):
    print(f"Recording payment of ${amount:,.2f} for customer: {customer_id}")

    customer = pb.get("ca_customers", customer_id)
    name = customer.get("name", "Unknown")

    # Get open invoices sorted by due date (oldest first)
    invoices_result = pb.search(
        "ca_invoices",
        filter={"customer_id": customer_id, "or": [{"status": "open"}, {"status": "partial"}]},
        per_page=200,
        sort="due_date",
    )
    open_invoices = invoices_result.get("items", [])

    # If specific invoice IDs provided, filter to those
    if invoice_ids:
        target_ids = [x.strip() for x in invoice_ids.split(",") if x.strip()]
        open_invoices = [i for i in open_invoices if i["id"] in target_ids]

    if not open_invoices:
        return {"error": "No open invoices found to apply payment"}

    # Apply payment oldest-first
    remaining = float(amount)
    applied = []

    for inv in open_invoices:
        if remaining <= 0:
            break

        balance = float(inv.get("balance_remaining") or inv.get("amount") or 0)
        if balance <= 0:
            continue

        applied_amount = min(remaining, balance)
        new_paid = float(inv.get("paid_amount", 0)) + applied_amount
        new_balance = float(inv.get("amount", 0)) - new_paid
        new_status = "paid" if new_balance <= 0.01 else "partial"

        pb.update("ca_invoices", inv["id"], {
            "paid_amount": round(new_paid, 2),
            "balance_remaining": round(max(new_balance, 0), 2),
            "status": new_status,
        })

        applied.append({
            "invoice_id": inv["id"],
            "invoice_number": inv.get("invoice_number", ""),
            "applied_amount": round(applied_amount, 2),
        })

        remaining -= applied_amount

    # Create payment record
    pb.create("ca_payments", {
        "customer_id": customer_id,
        "customer_name": name,
        "amount": amount,
        "payment_date": payment_date,
        "method": method,
        "reference": reference,
        "applied_invoices": applied,
    })

    # Log activity
    pb.create("ca_activities", {
        "customer_id": customer_id,
        "customer_name": name,
        "activity_type": "payment",
        "subject": f"Payment received: ${amount:,.2f}",
        "content": f"Payment of ${amount:,.2f} via {method}. Reference: {reference or 'N/A'}. Applied to {len(applied)} invoice(s).",
    })

    # Recalculate customer totals
    all_invoices = pb.search("ca_invoices", filter={"customer_id": customer_id}, per_page=200)
    all_inv = all_invoices.get("items", [])

    new_outstanding = sum(
        float(i.get("balance_remaining") or i.get("amount") or 0)
        for i in all_inv if i.get("status") in ("open", "partial")
    )
    new_paid = sum(float(i.get("paid_amount", 0)) for i in all_inv)

    update_data = {
        "total_outstanding": round(new_outstanding, 2),
        "total_paid": round(new_paid, 2),
    }

    # Auto-resolve if all invoices are paid
    open_count = sum(1 for i in all_inv if i.get("status") in ("open", "partial"))
    if open_count == 0:
        update_data["status"] = "resolved"

    pb.update("ca_customers", customer_id, update_data)

    print(f"Payment recorded. Applied to {len(applied)} invoices. Remaining: ${remaining:,.2f}")
    return {
        "applied_invoices": applied,
        "total_applied": round(amount - remaining, 2),
        "unapplied": round(remaining, 2),
        "customer_resolved": open_count == 0,
    }
