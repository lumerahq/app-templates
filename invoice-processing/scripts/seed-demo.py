# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data for Invoice Processing template (idempotent).

Usage:
    lumera run scripts/seed-demo.py
"""

from lumera import pb

gl_accounts = [
    {"external_id": "demo:gl_6000", "code": "6000", "name": "Office Supplies", "account_type": "expense"},
    {"external_id": "demo:gl_6100", "code": "6100", "name": "Software & Subscriptions", "account_type": "expense"},
    {"external_id": "demo:gl_6200", "code": "6200", "name": "Professional Services", "account_type": "expense"},
    {"external_id": "demo:gl_6300", "code": "6300", "name": "Marketing & Advertising", "account_type": "expense"},
    {"external_id": "demo:gl_6400", "code": "6400", "name": "Travel & Entertainment", "account_type": "expense"},
    {"external_id": "demo:gl_6500", "code": "6500", "name": "Utilities", "account_type": "expense"},
    {"external_id": "demo:gl_6600", "code": "6600", "name": "Rent & Facilities", "account_type": "expense"},
    {"external_id": "demo:gl_6700", "code": "6700", "name": "Insurance", "account_type": "expense"},
]

vendors = [
    {"external_id": "demo:vendor_acme", "name": "Acme Office Supplies", "default_gl_code": "6000"},
    {"external_id": "demo:vendor_cloudsoft", "name": "CloudSoft Inc", "default_gl_code": "6100"},
    {"external_id": "demo:vendor_johnson", "name": "Johnson & Partners LLP", "default_gl_code": "6200"},
    {"external_id": "demo:vendor_brightspark", "name": "BrightSpark Media", "default_gl_code": "6300"},
]

invoices = [
    {
        "external_id": "demo:inv_001",
        "vendor_name": "Acme Office Supplies",
        "invoice_number": "INV-2024-001",
        "invoice_date": "2024-11-15",
        "due_date": "2024-12-15",
        "total_amount": 1250.00,
        "currency": "USD",
        "description": "Q4 office supplies order",
        "status": "approved",
    },
    {
        "external_id": "demo:inv_002",
        "vendor_name": "CloudSoft Inc",
        "invoice_number": "CS-8847",
        "invoice_date": "2024-12-01",
        "due_date": "2024-12-31",
        "total_amount": 4999.00,
        "currency": "USD",
        "description": "Annual SaaS license renewal",
        "status": "review",
        "extracted_data": {
            "vendor_name": "CloudSoft Inc",
            "invoice_number": "CS-8847",
            "total_amount": 4999.00,
            "line_items": [
                {"description": "Enterprise Plan - Annual", "amount": 4999.00}
            ],
        },
    },
    {
        "external_id": "demo:inv_003",
        "vendor_name": "Johnson & Partners LLP",
        "invoice_number": "JP-2024-0392",
        "invoice_date": "2024-12-10",
        "due_date": "2025-01-10",
        "total_amount": 7500.00,
        "currency": "USD",
        "description": "Legal consulting - December",
        "status": "draft",
    },
]

print("Seeding demo data...")

for gl in gl_accounts:
    pb.upsert("inv_gl_accounts", gl)
    print(f"  GL: {gl['code']} - {gl['name']}")

for v in vendors:
    pb.upsert("vendors", v)
    print(f"  Vendor: {v['name']}")

for inv in invoices:
    pb.upsert("invoices", inv)
    print(f"  Invoice: {inv['invoice_number']} ({inv['status']})")

print(f"\nSeeded {len(gl_accounts)} GL accounts, {len(vendors)} vendors, {len(invoices)} invoices.")
