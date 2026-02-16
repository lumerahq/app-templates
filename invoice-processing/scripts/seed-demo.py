# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data for Invoice Processing template (idempotent).

Creates GL accounts, vendors, and sample invoices in various statuses
to demonstrate the full invoice processing workflow.

Usage:
    lumera run scripts/seed-demo.py
"""

from lumera import pb

# ---------------------------------------------------------------------------
# GL Accounts
# ---------------------------------------------------------------------------
gl_accounts = [
    {"external_id": "demo:gl_6000", "code": "6000", "name": "Office Supplies", "type": "expense", "department": "General", "active": True},
    {"external_id": "demo:gl_6100", "code": "6100", "name": "Software & Subscriptions", "type": "expense", "department": "Engineering", "active": True},
    {"external_id": "demo:gl_6200", "code": "6200", "name": "Professional Services", "type": "expense", "department": "Finance", "active": True},
    {"external_id": "demo:gl_6300", "code": "6300", "name": "Travel & Entertainment", "type": "expense", "department": "Sales", "active": True},
    {"external_id": "demo:gl_6400", "code": "6400", "name": "Marketing & Advertising", "type": "expense", "department": "Marketing", "active": True},
    {"external_id": "demo:gl_6500", "code": "6500", "name": "Insurance", "type": "expense", "department": "Finance", "active": True},
    {"external_id": "demo:gl_6600", "code": "6600", "name": "Rent & Facilities", "type": "expense", "department": "Operations", "active": True},
    {"external_id": "demo:gl_6700", "code": "6700", "name": "Utilities", "type": "expense", "department": "Operations", "active": True},
    {"external_id": "demo:gl_6800", "code": "6800", "name": "Legal Fees", "type": "expense", "department": "Legal", "active": True},
    {"external_id": "demo:gl_1500", "code": "1500", "name": "Computer Equipment", "type": "asset", "department": "Engineering", "active": True},
]

print("Seeding GL accounts...")
for acct in gl_accounts:
    pb.upsert("gl_accounts", acct)
    print(f"  ✓ {acct['code']} - {acct['name']}")

# ---------------------------------------------------------------------------
# Vendors
# ---------------------------------------------------------------------------
vendors = [
    {"external_id": "demo:vendor_1", "name": "Acme Office Supply Co.", "email": "billing@acmeoffice.com", "default_gl_code": "6000", "payment_terms": "net_30", "status": "active"},
    {"external_id": "demo:vendor_2", "name": "CloudTech Solutions", "email": "invoices@cloudtech.io", "default_gl_code": "6100", "payment_terms": "net_30", "status": "active"},
    {"external_id": "demo:vendor_3", "name": "Baker & Associates LLP", "email": "ap@bakerassociates.com", "default_gl_code": "6200", "payment_terms": "net_45", "status": "active"},
    {"external_id": "demo:vendor_4", "name": "Metro Building Management", "email": "rent@metrobuilding.com", "default_gl_code": "6600", "payment_terms": "net_15", "status": "active"},
    {"external_id": "demo:vendor_5", "name": "Digital Marketing Pros", "email": "billing@dmpros.com", "default_gl_code": "6400", "payment_terms": "net_30", "status": "active"},
    {"external_id": "demo:vendor_6", "name": "Summit Insurance Group", "email": "policies@summitins.com", "default_gl_code": "6500", "payment_terms": "due_on_receipt", "status": "active"},
    {"external_id": "demo:vendor_7", "name": "Pacific Power & Light", "email": "business@pacificpower.com", "default_gl_code": "6700", "payment_terms": "net_15", "status": "active"},
    {"external_id": "demo:vendor_8", "name": "Sterling Legal Group", "email": "invoices@sterlinglegal.com", "default_gl_code": "6800", "payment_terms": "net_60", "status": "active"},
]

print("\nSeeding vendors...")
for v in vendors:
    pb.upsert("vendors", v)
    print(f"  ✓ {v['name']}")

# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

# Helper: look up vendor record ID by external_id
def get_vendor_id(ext_id):
    result = pb.search("vendors", filter={"external_id": ext_id}, per_page=1)
    items = result.get("items", [])
    return items[0]["id"] if items else None

invoices = [
    # Posted — fully processed
    {"external_id": "demo:inv_001", "invoice_number": "INV-2025-001", "date": "2025-01-15", "due_date": "2025-02-14", "amount": 1250.00, "status": "posted", "gl_code": "6000", "department": "General", "description": "Office supplies Q1 order - paper, toner, binders", "coding_confidence": 95, "vendor_ext": "demo:vendor_1"},
    {"external_id": "demo:inv_004", "invoice_number": "INV-2025-004", "date": "2025-02-01", "due_date": "2025-02-16", "amount": 8500.00, "status": "posted", "gl_code": "6600", "department": "Operations", "description": "February office rent - Suite 400", "coding_confidence": 98, "vendor_ext": "demo:vendor_4"},

    # Approved — waiting to post
    {"external_id": "demo:inv_002", "invoice_number": "INV-2025-002", "date": "2025-01-20", "due_date": "2025-02-19", "amount": 4999.00, "status": "approved", "gl_code": "6100", "department": "Engineering", "description": "Annual Datadog subscription renewal", "coding_confidence": 92, "vendor_ext": "demo:vendor_2"},
    {"external_id": "demo:inv_006", "invoice_number": "INV-2025-006", "date": "2025-02-05", "due_date": "2025-02-05", "amount": 12000.00, "status": "approved", "gl_code": "6500", "department": "Finance", "description": "Annual D&O insurance premium", "coding_confidence": 96, "vendor_ext": "demo:vendor_6"},

    # Pending approval — AI coded, needs human review
    {"external_id": "demo:inv_003", "invoice_number": "INV-2025-003", "date": "2025-01-22", "due_date": "2025-03-08", "amount": 15000.00, "status": "pending_approval", "gl_code": "6200", "department": "Finance", "description": "Tax advisory services - Q4 review and planning", "coding_confidence": 88, "notes": "AI suggestion: Tax advisory maps to Professional Services based on vendor default", "vendor_ext": "demo:vendor_3"},
    {"external_id": "demo:inv_008", "invoice_number": "INV-2025-008", "date": "2025-02-08", "due_date": "2025-04-09", "amount": 22500.00, "status": "pending_approval", "gl_code": "6800", "department": "Legal", "description": "Patent filing and IP review services", "coding_confidence": 78, "notes": "AI suggestion: Patent-related services mapped to Legal Fees", "vendor_ext": "demo:vendor_8"},

    # Coded — AI processed, high confidence
    {"external_id": "demo:inv_005", "invoice_number": "INV-2025-005", "date": "2025-02-03", "due_date": "2025-03-05", "amount": 3200.00, "status": "coded", "gl_code": "6400", "department": "Marketing", "description": "Google Ads campaign management - January", "coding_confidence": 91, "vendor_ext": "demo:vendor_5"},
    {"external_id": "demo:inv_010", "invoice_number": "INV-2025-010", "date": "2025-02-10", "due_date": "2025-03-12", "amount": 9800.00, "status": "coded", "gl_code": "6100", "department": "Engineering", "description": "AWS cloud infrastructure - January usage", "coding_confidence": 94, "vendor_ext": "demo:vendor_2"},
    {"external_id": "demo:inv_013", "invoice_number": "INV-2025-013", "date": "2025-02-13", "due_date": "2025-02-28", "amount": 425.00, "status": "coded", "gl_code": "6700", "department": "Operations", "description": "Water service - January/February", "coding_confidence": 90, "vendor_ext": "demo:vendor_7"},

    # Processing — currently being analyzed
    {"external_id": "demo:inv_007", "invoice_number": "INV-2025-007", "date": "2025-02-07", "due_date": "2025-02-22", "amount": 847.50, "status": "processing", "description": "Electricity service - January billing period", "vendor_ext": "demo:vendor_7"},
    {"external_id": "demo:inv_015", "invoice_number": "INV-2025-015", "date": "2025-02-15", "due_date": "2025-03-17", "amount": 2100.00, "status": "processing", "description": "New laptop setup and configuration", "vendor_ext": "demo:vendor_2"},

    # Received — new, not yet processed
    {"external_id": "demo:inv_009", "invoice_number": "INV-2025-009", "date": "2025-02-10", "due_date": "2025-03-12", "amount": 675.00, "status": "received", "description": "Team lunch catering - engineering all-hands", "vendor_ext": "demo:vendor_1"},
    {"external_id": "demo:inv_011", "invoice_number": "INV-2025-011", "date": "2025-02-11", "due_date": "2025-03-28", "amount": 7500.00, "status": "received", "description": "Audit preparation advisory", "vendor_ext": "demo:vendor_3"},
    {"external_id": "demo:inv_014", "invoice_number": "INV-2025-014", "date": "2025-02-14", "due_date": "2025-03-16", "amount": 5600.00, "status": "received", "description": "Conference booth and travel - FinTech Summit", "vendor_ext": "demo:vendor_5"},

    # Rejected
    {"external_id": "demo:inv_012", "invoice_number": "INV-2025-012", "date": "2025-02-12", "due_date": "2025-03-14", "amount": 1800.00, "status": "rejected", "gl_code": "6400", "department": "Marketing", "description": "Social media advertising - duplicate of INV-2025-005", "coding_confidence": 60, "notes": "Rejected: duplicate invoice", "vendor_ext": "demo:vendor_5"},
]

print("\nSeeding invoices...")
for inv in invoices:
    vendor_ext = inv.pop("vendor_ext", None)
    if vendor_ext:
        vendor_id = get_vendor_id(vendor_ext)
        if vendor_id:
            inv["vendor"] = vendor_id
    pb.upsert("invoices", inv)
    status_label = inv.get("status", "")
    print(f"  ✓ {inv['invoice_number']} - ${inv['amount']:,.2f} ({status_label})")

# ---------------------------------------------------------------------------
# Audit Log entries (realistic history per invoice status)
# ---------------------------------------------------------------------------

def get_invoice_id(ext_id):
    result = pb.search("invoices", filter={"external_id": ext_id}, per_page=1)
    items = result.get("items", [])
    return items[0]["id"] if items else None

# Map invoice external_id → audit entries based on status
audit_entries = {
    # Posted: full lifecycle
    "demo:inv_001": [
        {"action": "created", "details": "Invoice INV-2025-001 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6000 (95% confidence)"},
        {"action": "approved", "details": "Invoice approved"},
        {"action": "posted", "details": "Invoice posted to ERP"},
    ],
    "demo:inv_004": [
        {"action": "created", "details": "Invoice INV-2025-004 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6600 (98% confidence)"},
        {"action": "approved", "details": "Invoice approved"},
        {"action": "posted", "details": "Invoice posted to ERP"},
    ],
    # Approved
    "demo:inv_002": [
        {"action": "created", "details": "Invoice INV-2025-002 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6100 (92% confidence)"},
        {"action": "approved", "details": "Invoice approved"},
    ],
    "demo:inv_006": [
        {"action": "created", "details": "Invoice INV-2025-006 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6500 (96% confidence)"},
        {"action": "approved", "details": "Invoice approved"},
    ],
    # Pending approval
    "demo:inv_003": [
        {"action": "created", "details": "Invoice INV-2025-003 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6200 (88% confidence, flagged for review)"},
    ],
    "demo:inv_008": [
        {"action": "created", "details": "Invoice INV-2025-008 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6800 (78% confidence, flagged for review)"},
    ],
    # Coded
    "demo:inv_005": [
        {"action": "created", "details": "Invoice INV-2025-005 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6400 (91% confidence)"},
    ],
    "demo:inv_010": [
        {"action": "created", "details": "Invoice INV-2025-010 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6100 (94% confidence)"},
    ],
    # Received
    "demo:inv_009": [
        {"action": "created", "details": "Invoice INV-2025-009 created"},
    ],
    "demo:inv_011": [
        {"action": "created", "details": "Invoice INV-2025-011 created"},
    ],
    # Coded (additional)
    "demo:inv_013": [
        {"action": "created", "details": "Invoice INV-2025-013 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6700 (92% confidence)"},
    ],
    # Received (additional)
    "demo:inv_014": [
        {"action": "created", "details": "Invoice INV-2025-014 created"},
    ],
    # Processing
    "demo:inv_007": [
        {"action": "created", "details": "Invoice INV-2025-007 created"},
    ],
    "demo:inv_015": [
        {"action": "created", "details": "Invoice INV-2025-015 created"},
    ],
    # Rejected
    "demo:inv_012": [
        {"action": "created", "details": "Invoice INV-2025-012 created"},
        {"action": "ai_coded", "details": "AI classification completed — GL 6400 (60% confidence, flagged for review)"},
        {"action": "rejected", "details": "Rejected: duplicate invoice"},
    ],
}

print("\nSeeding audit log...")
audit_count = 0
for inv_ext, entries in audit_entries.items():
    inv_id = get_invoice_id(inv_ext)
    if not inv_id:
        print(f"  ⚠ Invoice {inv_ext} not found, skipping audit entries")
        continue
    for i, entry in enumerate(entries):
        ext_id = f"demo:audit_{inv_ext.split(':')[1]}_{i}"
        pb.upsert("audit_log", {
            "external_id": ext_id,
            "entity_type": "invoice",
            "entity_id": inv_id,
            "action": entry["action"],
            "details": entry["details"],
            "performed_by": "system",
        })
        audit_count += 1
    print(f"  ✓ {inv_ext} — {len(entries)} entries")

print(f"\nDone! Seeded {len(gl_accounts)} GL accounts, {len(vendors)} vendors, {len(invoices)} invoices, {audit_count} audit log entries.")
