# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data for Invoice Processing template (idempotent).

Uses bulk operations for efficient seeding. On re-run, deletes existing
demo records and re-inserts them fresh.

Usage:
    lumera run scripts/seed-demo.py
"""

from lumera import pb

# --- GL Accounts (10) ---

gl_accounts = [
    {"external_id": "demo:gl_6000", "code": "6000", "name": "Office Supplies", "account_type": "expense"},
    {"external_id": "demo:gl_6100", "code": "6100", "name": "Software & Subscriptions", "account_type": "expense"},
    {"external_id": "demo:gl_6200", "code": "6200", "name": "Professional Services", "account_type": "expense"},
    {"external_id": "demo:gl_6300", "code": "6300", "name": "Marketing & Advertising", "account_type": "expense"},
    {"external_id": "demo:gl_6400", "code": "6400", "name": "Travel & Entertainment", "account_type": "expense"},
    {"external_id": "demo:gl_6500", "code": "6500", "name": "Utilities", "account_type": "expense"},
    {"external_id": "demo:gl_6600", "code": "6600", "name": "Rent & Facilities", "account_type": "expense"},
    {"external_id": "demo:gl_6700", "code": "6700", "name": "Insurance", "account_type": "expense"},
    {"external_id": "demo:gl_6800", "code": "6800", "name": "Equipment & Maintenance", "account_type": "expense"},
    {"external_id": "demo:gl_6900", "code": "6900", "name": "Training & Development", "account_type": "expense"},
]

# --- Vendors (10) ---

vendors = [
    {"external_id": "demo:vendor_acme", "name": "Acme Office Supplies", "default_gl_code": "6000"},
    {"external_id": "demo:vendor_cloudsoft", "name": "CloudSoft Inc", "default_gl_code": "6100"},
    {"external_id": "demo:vendor_johnson", "name": "Johnson & Partners LLP", "default_gl_code": "6200"},
    {"external_id": "demo:vendor_brightspark", "name": "BrightSpark Media", "default_gl_code": "6300"},
    {"external_id": "demo:vendor_techforward", "name": "TechForward Solutions", "default_gl_code": "6100"},
    {"external_id": "demo:vendor_metro", "name": "Metro Logistics", "default_gl_code": "6400"},
    {"external_id": "demo:vendor_datastream", "name": "DataStream Analytics", "default_gl_code": "6200"},
    {"external_id": "demo:vendor_premier", "name": "Premier Staffing", "default_gl_code": "6900"},
    {"external_id": "demo:vendor_greenoffice", "name": "GreenOffice Supplies", "default_gl_code": "6000"},
    {"external_id": "demo:vendor_skyline", "name": "Skyline Consulting", "default_gl_code": "6200"},
]

# --- Invoices (14) ---

invoices = [
    # Approved (4)
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
        "gl_code": "6000",
        "extracted_data": {
            "vendor_name": "Acme Office Supplies",
            "invoice_number": "INV-2024-001",
            "total_amount": 1250.00,
            "line_items": [
                {"description": "Printer paper (10 cases)", "quantity": 10, "unit_price": 45.00, "amount": 450.00},
                {"description": "Toner cartridges", "quantity": 4, "unit_price": 120.00, "amount": 480.00},
                {"description": "Desk organizers", "quantity": 8, "unit_price": 40.00, "amount": 320.00},
            ],
        },
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
        "status": "approved",
        "gl_code": "6100",
        "extracted_data": {
            "vendor_name": "CloudSoft Inc",
            "invoice_number": "CS-8847",
            "total_amount": 4999.00,
            "line_items": [
                {"description": "Enterprise Plan - Annual", "quantity": 1, "unit_price": 4999.00, "amount": 4999.00},
            ],
        },
    },
    {
        "external_id": "demo:inv_003",
        "vendor_name": "TechForward Solutions",
        "invoice_number": "TF-2024-112",
        "invoice_date": "2024-10-20",
        "due_date": "2024-11-20",
        "total_amount": 8750.00,
        "currency": "USD",
        "description": "IT infrastructure consulting",
        "status": "approved",
        "gl_code": "6100",
        "extracted_data": {
            "vendor_name": "TechForward Solutions",
            "invoice_number": "TF-2024-112",
            "total_amount": 8750.00,
            "line_items": [
                {"description": "Network architecture review", "quantity": 20, "unit_price": 250.00, "amount": 5000.00},
                {"description": "Security audit", "quantity": 15, "unit_price": 250.00, "amount": 3750.00},
            ],
        },
    },
    {
        "external_id": "demo:inv_004",
        "vendor_name": "Metro Logistics",
        "invoice_number": "ML-5521",
        "invoice_date": "2024-11-01",
        "due_date": "2024-12-01",
        "total_amount": 2340.00,
        "currency": "USD",
        "description": "November shipping and handling",
        "status": "approved",
        "gl_code": "6400",
        "extracted_data": {
            "vendor_name": "Metro Logistics",
            "invoice_number": "ML-5521",
            "total_amount": 2340.00,
            "line_items": [
                {"description": "Domestic shipments (12)", "quantity": 12, "unit_price": 150.00, "amount": 1800.00},
                {"description": "Express delivery surcharge", "quantity": 3, "unit_price": 180.00, "amount": 540.00},
            ],
        },
    },
    # Review (3)
    {
        "external_id": "demo:inv_005",
        "vendor_name": "Johnson & Partners LLP",
        "invoice_number": "JP-2024-0392",
        "invoice_date": "2024-12-10",
        "due_date": "2025-01-10",
        "total_amount": 7500.00,
        "currency": "USD",
        "description": "Legal consulting - December",
        "status": "review",
        "gl_code": "6200",
        "extracted_data": {
            "vendor_name": "Johnson & Partners LLP",
            "invoice_number": "JP-2024-0392",
            "total_amount": 7500.00,
            "line_items": [
                {"description": "Contract review (15 hrs)", "quantity": 15, "unit_price": 350.00, "amount": 5250.00},
                {"description": "Compliance advisory (6 hrs)", "quantity": 6, "unit_price": 375.00, "amount": 2250.00},
            ],
        },
    },
    {
        "external_id": "demo:inv_006",
        "vendor_name": "DataStream Analytics",
        "invoice_number": "DS-2024-089",
        "invoice_date": "2024-12-15",
        "due_date": "2025-01-15",
        "total_amount": 3200.00,
        "currency": "USD",
        "description": "Data pipeline setup and configuration",
        "status": "review",
        "gl_code": "6200",
        "extracted_data": {
            "vendor_name": "DataStream Analytics",
            "invoice_number": "DS-2024-089",
            "total_amount": 3200.00,
            "line_items": [
                {"description": "Pipeline configuration", "quantity": 8, "unit_price": 200.00, "amount": 1600.00},
                {"description": "Data migration support", "quantity": 8, "unit_price": 200.00, "amount": 1600.00},
            ],
        },
    },
    {
        "external_id": "demo:inv_007",
        "vendor_name": "BrightSpark Media",
        "invoice_number": "BS-2024-445",
        "invoice_date": "2024-12-18",
        "due_date": "2025-01-18",
        "total_amount": 5600.00,
        "currency": "USD",
        "description": "Q1 2025 marketing campaign",
        "status": "review",
        "gl_code": "6300",
        "extracted_data": {
            "vendor_name": "BrightSpark Media",
            "invoice_number": "BS-2024-445",
            "total_amount": 5600.00,
            "line_items": [
                {"description": "Campaign strategy & planning", "quantity": 1, "unit_price": 2000.00, "amount": 2000.00},
                {"description": "Digital ad placement", "quantity": 1, "unit_price": 2500.00, "amount": 2500.00},
                {"description": "Content creation", "quantity": 1, "unit_price": 1100.00, "amount": 1100.00},
            ],
        },
    },
    # Processing (2)
    {
        "external_id": "demo:inv_008",
        "vendor_name": "Premier Staffing",
        "invoice_number": "PS-DEC-2024",
        "invoice_date": "2024-12-20",
        "due_date": "2025-01-20",
        "total_amount": 12000.00,
        "currency": "USD",
        "description": "December contract staffing",
        "status": "processing",
    },
    {
        "external_id": "demo:inv_009",
        "vendor_name": "GreenOffice Supplies",
        "invoice_number": "GO-78432",
        "invoice_date": "2024-12-22",
        "due_date": "2025-01-22",
        "total_amount": 890.00,
        "currency": "USD",
        "description": "Eco-friendly office supplies",
        "status": "processing",
    },
    # Draft (3)
    {
        "external_id": "demo:inv_010",
        "vendor_name": "Skyline Consulting",
        "invoice_number": "SC-2024-201",
        "invoice_date": "2024-12-28",
        "due_date": "2025-01-28",
        "total_amount": 15000.00,
        "currency": "USD",
        "description": "Strategic planning engagement",
        "status": "draft",
    },
    {
        "external_id": "demo:inv_011",
        "vendor_name": "Acme Office Supplies",
        "invoice_number": "INV-2025-001",
        "invoice_date": "2025-01-05",
        "due_date": "2025-02-05",
        "total_amount": 780.00,
        "currency": "USD",
        "description": "January supplies order",
        "status": "draft",
    },
    {
        "external_id": "demo:inv_012",
        "vendor_name": "CloudSoft Inc",
        "invoice_number": "CS-9012",
        "invoice_date": "2025-01-10",
        "due_date": "2025-02-10",
        "total_amount": 1200.00,
        "currency": "USD",
        "description": "Additional user licenses (5 seats)",
        "status": "draft",
    },
    # Rejected (2)
    {
        "external_id": "demo:inv_013",
        "vendor_name": "Metro Logistics",
        "invoice_number": "ML-5499",
        "invoice_date": "2024-10-15",
        "due_date": "2024-11-15",
        "total_amount": 3100.00,
        "currency": "USD",
        "description": "October shipping (duplicate)",
        "status": "rejected",
        "gl_code": "6400",
        "extracted_data": {
            "vendor_name": "Metro Logistics",
            "invoice_number": "ML-5499",
            "total_amount": 3100.00,
            "line_items": [
                {"description": "Domestic shipments (15)", "quantity": 15, "unit_price": 150.00, "amount": 2250.00},
                {"description": "Warehousing", "quantity": 1, "unit_price": 850.00, "amount": 850.00},
            ],
        },
    },
    {
        "external_id": "demo:inv_014",
        "vendor_name": "DataStream Analytics",
        "invoice_number": "DS-2024-072",
        "invoice_date": "2024-09-30",
        "due_date": "2024-10-30",
        "total_amount": 1800.00,
        "currency": "USD",
        "description": "Incorrect billing - wrong project",
        "status": "rejected",
        "gl_code": "6200",
        "extracted_data": {
            "vendor_name": "DataStream Analytics",
            "invoice_number": "DS-2024-072",
            "total_amount": 1800.00,
            "line_items": [
                {"description": "Dashboard development", "quantity": 12, "unit_price": 150.00, "amount": 1800.00},
            ],
        },
    },
]

# --- Line Items (for invoices with extracted_data) ---

line_items_by_invoice = {
    "demo:inv_001": [
        {"description": "Printer paper (10 cases)", "quantity": 10, "unit_price": 45.00, "amount": 450.00, "gl_code": "6000"},
        {"description": "Toner cartridges", "quantity": 4, "unit_price": 120.00, "amount": 480.00, "gl_code": "6000"},
        {"description": "Desk organizers", "quantity": 8, "unit_price": 40.00, "amount": 320.00, "gl_code": "6000"},
    ],
    "demo:inv_002": [
        {"description": "Enterprise Plan - Annual", "quantity": 1, "unit_price": 4999.00, "amount": 4999.00, "gl_code": "6100"},
    ],
    "demo:inv_003": [
        {"description": "Network architecture review", "quantity": 20, "unit_price": 250.00, "amount": 5000.00, "gl_code": "6100"},
        {"description": "Security audit", "quantity": 15, "unit_price": 250.00, "amount": 3750.00, "gl_code": "6100"},
    ],
    "demo:inv_004": [
        {"description": "Domestic shipments (12)", "quantity": 12, "unit_price": 150.00, "amount": 1800.00, "gl_code": "6400"},
        {"description": "Express delivery surcharge", "quantity": 3, "unit_price": 180.00, "amount": 540.00, "gl_code": "6400"},
    ],
    "demo:inv_005": [
        {"description": "Contract review (15 hrs)", "quantity": 15, "unit_price": 350.00, "amount": 5250.00, "gl_code": "6200"},
        {"description": "Compliance advisory (6 hrs)", "quantity": 6, "unit_price": 375.00, "amount": 2250.00, "gl_code": "6200"},
    ],
    "demo:inv_006": [
        {"description": "Pipeline configuration", "quantity": 8, "unit_price": 200.00, "amount": 1600.00, "gl_code": "6200"},
        {"description": "Data migration support", "quantity": 8, "unit_price": 200.00, "amount": 1600.00, "gl_code": "6200"},
    ],
    "demo:inv_007": [
        {"description": "Campaign strategy & planning", "quantity": 1, "unit_price": 2000.00, "amount": 2000.00, "gl_code": "6300"},
        {"description": "Digital ad placement", "quantity": 1, "unit_price": 2500.00, "amount": 2500.00, "gl_code": "6300"},
        {"description": "Content creation", "quantity": 1, "unit_price": 1100.00, "amount": 1100.00, "gl_code": "6300"},
    ],
    "demo:inv_013": [
        {"description": "Domestic shipments (15)", "quantity": 15, "unit_price": 150.00, "amount": 2250.00, "gl_code": "6400"},
        {"description": "Warehousing", "quantity": 1, "unit_price": 850.00, "amount": 850.00, "gl_code": "6400"},
    ],
    "demo:inv_014": [
        {"description": "Dashboard development", "quantity": 12, "unit_price": 150.00, "amount": 1800.00, "gl_code": "6200"},
    ],
}

# --- Comments ---

comments_by_invoice = {
    "demo:inv_001": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "All line items verified against PO", "comment_type": "approval"},
        {"content": "Status changed from Review to Approved", "comment_type": "system"},
    ],
    "demo:inv_002": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "License renewal confirmed with IT", "comment_type": "approval"},
        {"content": "Status changed from Review to Approved", "comment_type": "system"},
    ],
    "demo:inv_003": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "Approved per consulting agreement", "comment_type": "approval"},
        {"content": "Status changed from Review to Approved", "comment_type": "system"},
    ],
    "demo:inv_004": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "Verified against shipping records", "comment_type": "approval"},
        {"content": "Status changed from Review to Approved", "comment_type": "system"},
    ],
    "demo:inv_005": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "Please verify the hourly rates match the contract", "comment_type": "comment"},
    ],
    "demo:inv_006": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
    ],
    "demo:inv_007": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "Need approval from marketing director", "comment_type": "comment"},
    ],
    "demo:inv_013": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "This is a duplicate of ML-5521. Already paid.", "comment_type": "rejection"},
        {"content": "Status changed from Review to Rejected", "comment_type": "system"},
    ],
    "demo:inv_014": [
        {"content": "Status changed from Draft to Processing", "comment_type": "system"},
        {"content": "Status changed from Processing to Review", "comment_type": "system"},
        {"content": "Wrong project billed. DataStream confirmed this should go to Project B.", "comment_type": "rejection"},
        {"content": "Status changed from Review to Rejected", "comment_type": "system"},
    ],
}


# --- Helper: collect IDs of records matching a demo: external_id prefix ---

def find_demo_ids(collection, prefix="demo:"):
    """Search a collection and return IDs of records with demo external_ids."""
    result = pb.search(collection, per_page=500)
    items = result.get("items", []) if isinstance(result, dict) else result
    return [r["id"] for r in items if r.get("external_id", "").startswith(prefix)]


def search_items(collection, per_page=500):
    """Search a collection and return just the items list."""
    result = pb.search(collection, per_page=per_page)
    return result.get("items", []) if isinstance(result, dict) else result


# --- Seed ---

print("Seeding demo data...\n")

# Step 1: Clean up existing demo data (child records first, then parents)
print("  Cleaning existing demo data...")

# Delete all line items and comments (no external_id, so delete all)
existing_li = search_items("ip_line_items")
if existing_li:
    result = pb.bulk_delete("ip_line_items", [r["id"] for r in existing_li])
    print(f"    Deleted {result['succeeded']} line items")

existing_cm = search_items("ip_comments")
if existing_cm:
    result = pb.bulk_delete("ip_comments", [r["id"] for r in existing_cm])
    print(f"    Deleted {result['succeeded']} comments")

# Delete demo invoices
demo_inv_ids = find_demo_ids("ip_invoices")
if demo_inv_ids:
    result = pb.bulk_delete("ip_invoices", demo_inv_ids)
    print(f"    Deleted {result['succeeded']} invoices")

# Delete demo vendors
demo_vendor_ids = find_demo_ids("ip_vendors")
if demo_vendor_ids:
    result = pb.bulk_delete("ip_vendors", demo_vendor_ids)
    print(f"    Deleted {result['succeeded']} vendors")

# Delete demo GL accounts
demo_gl_ids = find_demo_ids("ip_gl_accounts")
if demo_gl_ids:
    result = pb.bulk_delete("ip_gl_accounts", demo_gl_ids)
    print(f"    Deleted {result['succeeded']} GL accounts")

# Step 2: Bulk insert fresh data
print("\n  Inserting fresh data...")

result = pb.bulk_insert("ip_gl_accounts", gl_accounts)
print(f"    GL Accounts: {result['succeeded']} created")

result = pb.bulk_insert("ip_vendors", vendors)
print(f"    Vendors:     {result['succeeded']} created")

result = pb.bulk_insert("ip_invoices", invoices)
print(f"    Invoices:    {result['succeeded']} created")

# Build external_id → record_id map by searching the freshly inserted invoices
invoice_ids = {}
all_invoices = search_items("ip_invoices", per_page=500)
for rec in all_invoices:
    ext_id = rec.get("external_id", "")
    if ext_id.startswith("demo:"):
        invoice_ids[ext_id] = rec["id"]

# Step 3: Bulk insert line items
all_line_items = []
for ext_id, items in line_items_by_invoice.items():
    inv_id = invoice_ids.get(ext_id)
    if not inv_id:
        continue
    for item in items:
        all_line_items.append({"invoice_id": inv_id, **item})

if all_line_items:
    result = pb.bulk_insert("ip_line_items", all_line_items)
    print(f"    Line Items:  {result['succeeded']} created")

# Step 4: Bulk insert comments
all_comments = []
for ext_id, coms in comments_by_invoice.items():
    inv_id = invoice_ids.get(ext_id)
    if not inv_id:
        continue
    for c in coms:
        all_comments.append({
            "invoice_id": inv_id,
            "content": c["content"],
            "comment_type": c["comment_type"],
            "author_name": "System" if c["comment_type"] == "system" else "Demo User",
            "author_email": "" if c["comment_type"] == "system" else "demo@example.com",
        })

if all_comments:
    result = pb.bulk_insert("ip_comments", all_comments)
    print(f"    Comments:    {result['succeeded']} created")

print(f"\nDone! Seeded {len(gl_accounts)} GL accounts, {len(vendors)} vendors, "
      f"{len(invoices)} invoices, {len(all_line_items)} line items, {len(all_comments)} comments.")
