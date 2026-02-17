# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data for Collections Agent template (idempotent).

Usage:
    lumera run scripts/seed-demo.py
"""

from lumera import pb

# --- Customers ---

customers = [
    {"external_id": "demo:cust_acme", "name": "Acme Manufacturing", "email": "ap@acmemfg.com", "contact_name": "Sarah Johnson", "phone": "(555) 100-1001", "total_outstanding": 47500.00, "oldest_due_date": "2025-10-15", "status": "active"},
    {"external_id": "demo:cust_globex", "name": "Globex Corporation", "email": "accounting@globex.com", "contact_name": "Tom Rivera", "phone": "(555) 200-2002", "total_outstanding": 82300.00, "oldest_due_date": "2025-09-01", "status": "escalated"},
    {"external_id": "demo:cust_initech", "name": "Initech Solutions", "email": "finance@initech.io", "contact_name": "Lisa Chen", "phone": "(555) 300-3003", "total_outstanding": 15750.00, "oldest_due_date": "2025-11-20", "status": "contacted"},
    {"external_id": "demo:cust_umbrella", "name": "Umbrella Corp", "email": "ar@umbrellacorp.com", "contact_name": "Mike Peters", "phone": "(555) 400-4004", "total_outstanding": 125000.00, "oldest_due_date": "2025-08-10", "status": "active"},
    {"external_id": "demo:cust_wayne", "name": "Wayne Enterprises", "email": "payments@wayne.com", "contact_name": "Alfred Pennyworth", "phone": "(555) 500-5005", "total_outstanding": 9800.00, "oldest_due_date": "2025-12-01", "status": "promised"},
    {"external_id": "demo:cust_stark", "name": "Stark Industries", "email": "ap@stark.com", "contact_name": "Pepper Potts", "phone": "(555) 600-6006", "total_outstanding": 34200.00, "oldest_due_date": "2025-10-01", "status": "active"},
    {"external_id": "demo:cust_oscorp", "name": "Oscorp Technologies", "email": "finance@oscorp.com", "contact_name": "Norman Osborn", "phone": "(555) 700-7007", "total_outstanding": 67800.00, "oldest_due_date": "2025-07-15", "status": "escalated"},
    {"external_id": "demo:cust_lexcorp", "name": "LexCorp", "email": "billing@lexcorp.com", "contact_name": "Mercy Graves", "phone": "(555) 800-8008", "total_outstanding": 22100.00, "oldest_due_date": "2025-11-05", "status": "active"},
    {"external_id": "demo:cust_cyberdyne", "name": "Cyberdyne Systems", "email": "ar@cyberdyne.com", "contact_name": "Miles Dyson", "phone": "(555) 900-9009", "total_outstanding": 55600.00, "oldest_due_date": "2025-09-20", "status": "contacted"},
    {"external_id": "demo:cust_weyland", "name": "Weyland-Yutani", "email": "accounts@weyland.com", "contact_name": "Peter Weyland", "phone": "(555) 010-0101", "total_outstanding": 0.00, "oldest_due_date": None, "status": "resolved", "notes": "All invoices paid in full as of Dec 2025."},
    {"external_id": "demo:cust_massive", "name": "Massive Dynamic", "email": "finance@massive.com", "contact_name": "Nina Sharp", "phone": "(555) 110-1101", "total_outstanding": 41300.00, "oldest_due_date": "2025-10-25", "status": "active"},
    {"external_id": "demo:cust_hooli", "name": "Hooli Inc", "email": "ap@hooli.com", "contact_name": "Gavin Belson", "phone": "(555) 120-1201", "total_outstanding": 18900.00, "oldest_due_date": "2025-11-15", "status": "active"},
]

# --- AR Invoices ---

invoices = [
    # Acme Manufacturing - $47,500
    {"external_id": "demo:inv_acme_001", "invoice_number": "INV-2025-1001", "amount": 25000.00, "due_date": "2025-10-15", "days_overdue": 125, "status": "open"},
    {"external_id": "demo:inv_acme_002", "invoice_number": "INV-2025-1042", "amount": 12500.00, "due_date": "2025-11-15", "days_overdue": 94, "status": "open"},
    {"external_id": "demo:inv_acme_003", "invoice_number": "INV-2025-1078", "amount": 10000.00, "due_date": "2025-12-15", "days_overdue": 64, "status": "open"},

    # Globex Corporation - $82,300
    {"external_id": "demo:inv_globex_001", "invoice_number": "INV-2025-0890", "amount": 45000.00, "due_date": "2025-09-01", "days_overdue": 169, "status": "open"},
    {"external_id": "demo:inv_globex_002", "invoice_number": "INV-2025-0945", "amount": 22300.00, "due_date": "2025-10-01", "days_overdue": 139, "status": "open"},
    {"external_id": "demo:inv_globex_003", "invoice_number": "INV-2025-1010", "amount": 15000.00, "due_date": "2025-11-01", "days_overdue": 108, "status": "open"},

    # Initech Solutions - $15,750
    {"external_id": "demo:inv_initech_001", "invoice_number": "INV-2025-1055", "amount": 8250.00, "due_date": "2025-11-20", "days_overdue": 89, "status": "open"},
    {"external_id": "demo:inv_initech_002", "invoice_number": "INV-2025-1090", "amount": 7500.00, "due_date": "2025-12-20", "days_overdue": 59, "status": "open"},

    # Umbrella Corp - $125,000
    {"external_id": "demo:inv_umbrella_001", "invoice_number": "INV-2025-0750", "amount": 50000.00, "due_date": "2025-08-10", "days_overdue": 191, "status": "open"},
    {"external_id": "demo:inv_umbrella_002", "invoice_number": "INV-2025-0820", "amount": 50000.00, "due_date": "2025-09-10", "days_overdue": 160, "status": "open"},
    {"external_id": "demo:inv_umbrella_003", "invoice_number": "INV-2025-0900", "amount": 25000.00, "due_date": "2025-10-10", "days_overdue": 130, "status": "open"},

    # Wayne Enterprises - $9,800
    {"external_id": "demo:inv_wayne_001", "invoice_number": "INV-2025-1100", "amount": 9800.00, "due_date": "2025-12-01", "days_overdue": 78, "status": "open"},

    # Stark Industries - $34,200
    {"external_id": "demo:inv_stark_001", "invoice_number": "INV-2025-0960", "amount": 18200.00, "due_date": "2025-10-01", "days_overdue": 139, "status": "open"},
    {"external_id": "demo:inv_stark_002", "invoice_number": "INV-2025-1030", "amount": 16000.00, "due_date": "2025-11-01", "days_overdue": 108, "status": "open"},

    # Oscorp Technologies - $67,800
    {"external_id": "demo:inv_oscorp_001", "invoice_number": "INV-2025-0650", "amount": 35000.00, "due_date": "2025-07-15", "days_overdue": 217, "status": "open"},
    {"external_id": "demo:inv_oscorp_002", "invoice_number": "INV-2025-0780", "amount": 20800.00, "due_date": "2025-08-15", "days_overdue": 186, "status": "open"},
    {"external_id": "demo:inv_oscorp_003", "invoice_number": "INV-2025-0850", "amount": 12000.00, "due_date": "2025-09-15", "days_overdue": 155, "status": "open"},

    # LexCorp - $22,100
    {"external_id": "demo:inv_lexcorp_001", "invoice_number": "INV-2025-1060", "amount": 14100.00, "due_date": "2025-11-05", "days_overdue": 104, "status": "open"},
    {"external_id": "demo:inv_lexcorp_002", "invoice_number": "INV-2025-1105", "amount": 8000.00, "due_date": "2025-12-05", "days_overdue": 74, "status": "open"},

    # Cyberdyne Systems - $55,600
    {"external_id": "demo:inv_cyberdyne_001", "invoice_number": "INV-2025-0910", "amount": 30000.00, "due_date": "2025-09-20", "days_overdue": 150, "status": "open"},
    {"external_id": "demo:inv_cyberdyne_002", "invoice_number": "INV-2025-0980", "amount": 25600.00, "due_date": "2025-10-20", "days_overdue": 120, "status": "open"},

    # Weyland-Yutani - paid
    {"external_id": "demo:inv_weyland_001", "invoice_number": "INV-2025-0800", "amount": 15000.00, "due_date": "2025-08-20", "days_overdue": 0, "status": "paid"},

    # Massive Dynamic - $41,300
    {"external_id": "demo:inv_massive_001", "invoice_number": "INV-2025-1000", "amount": 23000.00, "due_date": "2025-10-25", "days_overdue": 115, "status": "open"},
    {"external_id": "demo:inv_massive_002", "invoice_number": "INV-2025-1070", "amount": 18300.00, "due_date": "2025-11-25", "days_overdue": 84, "status": "open"},

    # Hooli Inc - $18,900
    {"external_id": "demo:inv_hooli_001", "invoice_number": "INV-2025-1080", "amount": 11400.00, "due_date": "2025-11-15", "days_overdue": 94, "status": "open"},
    {"external_id": "demo:inv_hooli_002", "invoice_number": "INV-2025-1120", "amount": 7500.00, "due_date": "2025-12-15", "days_overdue": 64, "status": "open"},
]

# --- Collection Activities ---

activities = [
    {"external_id": "demo:act_globex_email", "activity_type": "email_draft", "subject": "Overdue Payment - Immediate Attention Required", "content": "Dear Tom,\n\nI'm writing regarding several outstanding invoices totaling $82,300 that are significantly past due. Your oldest invoice (INV-2025-0890) is now over 160 days overdue.\n\nWe value our business relationship and would like to resolve this promptly. Could we schedule a call this week to discuss payment arrangements?\n\nBest regards", "contact_date": "2026-01-15"},
    {"external_id": "demo:act_initech_call", "activity_type": "call", "subject": "Spoke with Lisa Chen", "content": "Called Lisa re: outstanding balance. She mentioned their AP system had a processing delay. Expects payment within 2 weeks.", "contact_date": "2026-02-01"},
    {"external_id": "demo:act_wayne_promise", "activity_type": "promise_to_pay", "subject": "Payment committed for Feb 28", "content": "Alfred confirmed wire transfer of $9,800 scheduled for February 28, 2026.", "contact_date": "2026-02-10"},
    {"external_id": "demo:act_oscorp_escalate", "activity_type": "note", "subject": "Escalated to management", "content": "Multiple follow-ups with no response. Escalating to VP of Finance for direct outreach. Total outstanding $67,800 with oldest invoice 217 days overdue.", "contact_date": "2026-02-05"},
]

# Customer external_id to invoice mapping
customer_invoice_map = {
    "demo:cust_acme": ["demo:inv_acme_001", "demo:inv_acme_002", "demo:inv_acme_003"],
    "demo:cust_globex": ["demo:inv_globex_001", "demo:inv_globex_002", "demo:inv_globex_003"],
    "demo:cust_initech": ["demo:inv_initech_001", "demo:inv_initech_002"],
    "demo:cust_umbrella": ["demo:inv_umbrella_001", "demo:inv_umbrella_002", "demo:inv_umbrella_003"],
    "demo:cust_wayne": ["demo:inv_wayne_001"],
    "demo:cust_stark": ["demo:inv_stark_001", "demo:inv_stark_002"],
    "demo:cust_oscorp": ["demo:inv_oscorp_001", "demo:inv_oscorp_002", "demo:inv_oscorp_003"],
    "demo:cust_lexcorp": ["demo:inv_lexcorp_001", "demo:inv_lexcorp_002"],
    "demo:cust_cyberdyne": ["demo:inv_cyberdyne_001", "demo:inv_cyberdyne_002"],
    "demo:cust_weyland": ["demo:inv_weyland_001"],
    "demo:cust_massive": ["demo:inv_massive_001", "demo:inv_massive_002"],
    "demo:cust_hooli": ["demo:inv_hooli_001", "demo:inv_hooli_002"],
}

# Activity to customer mapping
activity_customer_map = {
    "demo:act_globex_email": "demo:cust_globex",
    "demo:act_initech_call": "demo:cust_initech",
    "demo:act_wayne_promise": "demo:cust_wayne",
    "demo:act_oscorp_escalate": "demo:cust_oscorp",
}

print("Seeding demo data...")

# 1. Upsert customers and build ID map
customer_ids = {}
for c in customers:
    result = pb.upsert("customers", c)
    customer_ids[c["external_id"]] = result["id"]
    print(f"  Customer: {c['name']} ({c['status']})")

# 2. Upsert invoices with customer relation
inv_ext_to_customer = {}
for cust_ext, inv_exts in customer_invoice_map.items():
    for inv_ext in inv_exts:
        inv_ext_to_customer[inv_ext] = cust_ext

for inv in invoices:
    cust_ext = inv_ext_to_customer.get(inv["external_id"])
    if cust_ext and cust_ext in customer_ids:
        inv["customer"] = customer_ids[cust_ext]
    pb.upsert("ar_invoices", inv)
    print(f"  Invoice: {inv['invoice_number']} (${inv['amount']:,.0f})")

# 3. Upsert activities with customer relation
for act in activities:
    cust_ext = activity_customer_map.get(act["external_id"])
    if cust_ext and cust_ext in customer_ids:
        act["customer"] = customer_ids[cust_ext]
    pb.upsert("collection_activities", act)
    print(f"  Activity: {act['subject']}")

print(f"\nSeeded {len(customers)} customers, {len(invoices)} invoices, {len(activities)} activities.")
