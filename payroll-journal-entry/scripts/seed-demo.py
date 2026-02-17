# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data for Payroll Journal Entry template (idempotent).

Usage:
    lumera run scripts/seed-demo.py
"""

from lumera import pb

gl_accounts = [
    {"external_id": "demo:gl_6000", "code": "6000", "name": "Wages & Salaries Expense", "account_type": "expense"},
    {"external_id": "demo:gl_6100", "code": "6100", "name": "Payroll Tax Expense", "account_type": "expense"},
    {"external_id": "demo:gl_6200", "code": "6200", "name": "Benefits Expense", "account_type": "expense"},
    {"external_id": "demo:gl_6300", "code": "6300", "name": "Employer FICA Expense", "account_type": "expense"},
    {"external_id": "demo:gl_2100", "code": "2100", "name": "Wages Payable", "account_type": "liability"},
    {"external_id": "demo:gl_2200", "code": "2200", "name": "Tax Withholdings Payable", "account_type": "liability"},
    {"external_id": "demo:gl_2300", "code": "2300", "name": "Benefits Payable", "account_type": "liability"},
    {"external_id": "demo:gl_1000", "code": "1000", "name": "Payroll Bank Account", "account_type": "asset"},
]

payroll_runs = [
    {
        "external_id": "demo:pr_001",
        "pay_period_start": "2025-01-01",
        "pay_period_end": "2025-01-15",
        "pay_date": "2025-01-20",
        "status": "posted",
        "total_debits": 45000.00,
        "total_credits": 45000.00,
    },
    {
        "external_id": "demo:pr_002",
        "pay_period_start": "2025-01-16",
        "pay_period_end": "2025-01-31",
        "pay_date": "2025-02-05",
        "status": "review",
        "total_debits": 47500.00,
        "total_credits": 47500.00,
    },
    {
        "external_id": "demo:pr_003",
        "pay_period_start": "2025-02-01",
        "pay_period_end": "2025-02-15",
        "pay_date": "2025-02-20",
        "status": "draft",
        "total_debits": 0,
        "total_credits": 0,
    },
]

print("Seeding demo data...")

for gl in gl_accounts:
    pb.upsert("gl_accounts", gl)
    print(f"  GL: {gl['code']} - {gl['name']}")

for run in payroll_runs:
    pb.upsert("payroll_runs", run)
    print(f"  Payroll Run: {run['pay_period_start']} to {run['pay_period_end']} ({run['status']})")

# Create journal entries for the posted run
pr_001 = pb.search("payroll_runs", filter={"external_id": "demo:pr_001"}, per_page=1)
if pr_001 and pr_001.get("items"):
    pr_001_id = pr_001["items"][0]["id"]
    je_posted = [
        {"external_id": "demo:je_001_1", "payroll_run": pr_001_id, "account_code": "6000", "account_name": "Wages & Salaries Expense", "department": "Engineering", "debit_amount": 25000.00, "credit_amount": 0, "memo": "Gross wages - Engineering"},
        {"external_id": "demo:je_001_2", "payroll_run": pr_001_id, "account_code": "6000", "account_name": "Wages & Salaries Expense", "department": "Sales", "debit_amount": 10000.00, "credit_amount": 0, "memo": "Gross wages - Sales"},
        {"external_id": "demo:je_001_3", "payroll_run": pr_001_id, "account_code": "6100", "account_name": "Payroll Tax Expense", "debit_amount": 5000.00, "credit_amount": 0, "memo": "Employer payroll taxes"},
        {"external_id": "demo:je_001_4", "payroll_run": pr_001_id, "account_code": "6200", "account_name": "Benefits Expense", "debit_amount": 5000.00, "credit_amount": 0, "memo": "Employer benefits contribution"},
        {"external_id": "demo:je_001_5", "payroll_run": pr_001_id, "account_code": "2100", "account_name": "Wages Payable", "debit_amount": 0, "credit_amount": 28000.00, "memo": "Net pay to employees"},
        {"external_id": "demo:je_001_6", "payroll_run": pr_001_id, "account_code": "2200", "account_name": "Tax Withholdings Payable", "debit_amount": 0, "credit_amount": 12000.00, "memo": "Employee + employer taxes"},
        {"external_id": "demo:je_001_7", "payroll_run": pr_001_id, "account_code": "2300", "account_name": "Benefits Payable", "debit_amount": 0, "credit_amount": 5000.00, "memo": "Benefits deductions"},
    ]
    for je in je_posted:
        pb.upsert("journal_entries", je)
    print(f"  Created {len(je_posted)} journal entries for posted run")

# Create journal entries for the review run
pr_002 = pb.search("payroll_runs", filter={"external_id": "demo:pr_002"}, per_page=1)
if pr_002 and pr_002.get("items"):
    pr_002_id = pr_002["items"][0]["id"]
    je_review = [
        {"external_id": "demo:je_002_1", "payroll_run": pr_002_id, "account_code": "6000", "account_name": "Wages & Salaries Expense", "department": "Engineering", "debit_amount": 26500.00, "credit_amount": 0, "memo": "Gross wages - Engineering"},
        {"external_id": "demo:je_002_2", "payroll_run": pr_002_id, "account_code": "6000", "account_name": "Wages & Salaries Expense", "department": "Sales", "debit_amount": 10500.00, "credit_amount": 0, "memo": "Gross wages - Sales"},
        {"external_id": "demo:je_002_3", "payroll_run": pr_002_id, "account_code": "6100", "account_name": "Payroll Tax Expense", "debit_amount": 5250.00, "credit_amount": 0, "memo": "Employer payroll taxes"},
        {"external_id": "demo:je_002_4", "payroll_run": pr_002_id, "account_code": "6200", "account_name": "Benefits Expense", "debit_amount": 5250.00, "credit_amount": 0, "memo": "Employer benefits contribution"},
        {"external_id": "demo:je_002_5", "payroll_run": pr_002_id, "account_code": "2100", "account_name": "Wages Payable", "debit_amount": 0, "credit_amount": 29500.00, "memo": "Net pay to employees"},
        {"external_id": "demo:je_002_6", "payroll_run": pr_002_id, "account_code": "2200", "account_name": "Tax Withholdings Payable", "debit_amount": 0, "credit_amount": 12750.00, "memo": "Employee + employer taxes"},
        {"external_id": "demo:je_002_7", "payroll_run": pr_002_id, "account_code": "2300", "account_name": "Benefits Payable", "debit_amount": 0, "credit_amount": 5250.00, "memo": "Benefits deductions"},
    ]
    for je in je_review:
        pb.upsert("journal_entries", je)
    print(f"  Created {len(je_review)} journal entries for review run")

print(f"\nSeeded {len(gl_accounts)} GL accounts, {len(payroll_runs)} payroll runs with journal entries.")
