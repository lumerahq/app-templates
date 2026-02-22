# /// script
# dependencies = ["lumera"]
# ///
"""
Seed demo data for Collections Agent template (idempotent).

Usage:
    lumera run scripts/seed-demo.py
"""

from datetime import datetime, timedelta
import random

from lumera import pb

random.seed(42)

today = datetime.now()


def days_ago(n):
    return (today - timedelta(days=n)).strftime("%Y-%m-%d")


def days_from_now(n):
    return (today + timedelta(days=n)).strftime("%Y-%m-%d")


# ─── Reminder Templates ─────────────────────────────────────────────────────

reminder_templates = [
    {
        "external_id": "demo:tpl_friendly",
        "name": "Friendly Reminder",
        "stage": "friendly",
        "days_overdue_trigger": 7,
        "subject_template": "Friendly Reminder: Invoice {{invoice_number}} is past due",
        "body_template": "Hi {{contact_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{amount}} was due on {{due_date}}. If payment has already been sent, please disregard this notice.\n\nPlease let us know if you have any questions.\n\nBest regards",
        "enabled": "yes",
    },
    {
        "external_id": "demo:tpl_firm",
        "name": "Firm Follow-up",
        "stage": "firm",
        "days_overdue_trigger": 30,
        "subject_template": "Payment Overdue: Invoice {{invoice_number}} - Action Required",
        "body_template": "Dear {{contact_name}},\n\nWe have not yet received payment for invoice {{invoice_number}} totaling {{amount}}, which is now {{days_overdue}} days past due.\n\nPlease arrange payment at your earliest convenience or contact us to discuss a payment plan.\n\nThank you for your prompt attention.",
        "enabled": "yes",
    },
    {
        "external_id": "demo:tpl_urgent",
        "name": "Urgent Notice",
        "stage": "urgent",
        "days_overdue_trigger": 60,
        "subject_template": "URGENT: Past Due Balance of {{amount}} Requires Immediate Attention",
        "body_template": "Dear {{contact_name}},\n\nDespite previous reminders, your account remains past due with a balance of {{amount}}. Invoice {{invoice_number}} is now {{days_overdue}} days overdue.\n\nImmediate payment is required to avoid further action. Please contact us within 48 hours to resolve this matter.",
        "enabled": "yes",
    },
    {
        "external_id": "demo:tpl_final",
        "name": "Final Notice",
        "stage": "final",
        "days_overdue_trigger": 90,
        "subject_template": "FINAL NOTICE: Account {{customer_name}} - Immediate Payment Required",
        "body_template": "Dear {{contact_name}},\n\nThis is a final notice regarding your outstanding balance of {{amount}}. Your account is now {{days_overdue}} days past due.\n\nIf we do not receive payment or hear from you within 7 days, we may be forced to escalate this matter. Please contact us immediately.",
        "enabled": "yes",
    },
]

# ─── Escalation Rules ───────────────────────────────────────────────────────

escalation_rules = [
    {
        "external_id": "demo:rule_flag",
        "name": "Flag for Review",
        "min_days_overdue": 30,
        "min_amount": 5000,
        "action_type": "flag",
        "enabled": "yes",
    },
    {
        "external_id": "demo:rule_escalate",
        "name": "Escalate to Manager",
        "min_days_overdue": 60,
        "min_amount": 10000,
        "action_type": "escalate",
        "enabled": "yes",
    },
    {
        "external_id": "demo:rule_final",
        "name": "Send Final Notice",
        "min_days_overdue": 90,
        "min_amount": 0,
        "action_type": "final_notice",
        "enabled": "yes",
    },
]

# ─── Customers ───────────────────────────────────────────────────────────────

customer_data = [
    # High risk (8)
    {"ext": "cust_01", "name": "Meridian Industrial Corp", "email": "ar@meridian-ind.com", "phone": "(312) 555-0101", "contact_name": "Sarah Chen", "status": "escalated", "risk_score": 92, "risk_level": "high", "payment_terms": "Net 30", "outstanding": 125000, "paid": 45000, "next_action": "Send final notice and escalate to legal", "follow_up": 1},
    {"ext": "cust_02", "name": "Northshore Building Supply", "email": "billing@northshore-bldg.com", "phone": "(847) 555-0202", "contact_name": "Mike Torres", "status": "escalated", "risk_score": 88, "risk_level": "high", "payment_terms": "Net 30", "outstanding": 98500, "paid": 22000, "next_action": "Schedule call with CFO", "follow_up": 1},
    {"ext": "cust_03", "name": "Pacific Trade Solutions", "email": "accounts@pacifictrade.com", "phone": "(415) 555-0303", "contact_name": "David Wong", "status": "contacted", "risk_score": 85, "risk_level": "high", "payment_terms": "Net 45", "outstanding": 67800, "paid": 15000, "next_action": "Follow up on payment promise", "follow_up": 2},
    {"ext": "cust_04", "name": "Atlas Manufacturing Inc", "email": "ap@atlas-mfg.com", "phone": "(216) 555-0404", "contact_name": "Jennifer Brooks", "status": "active", "risk_score": 82, "risk_level": "high", "payment_terms": "Net 30", "outstanding": 54200, "paid": 8000, "next_action": "Send urgent collection email", "follow_up": 1},
    {"ext": "cust_05", "name": "Redwood Logistics LLC", "email": "finance@redwoodlog.com", "phone": "(503) 555-0505", "contact_name": "Robert Kim", "status": "contacted", "risk_score": 78, "risk_level": "high", "payment_terms": "Net 30", "outstanding": 43500, "paid": 31000, "next_action": "Verify wire transfer status", "follow_up": 2},
    {"ext": "cust_06", "name": "Summit Healthcare Group", "email": "billing@summithcg.com", "phone": "(602) 555-0606", "contact_name": "Lisa Patel", "status": "promised", "risk_score": 76, "risk_level": "high", "payment_terms": "Net 60", "outstanding": 89000, "paid": 55000, "next_action": "Confirm promised payment by Friday", "follow_up": 3},
    {"ext": "cust_07", "name": "Coastal Energy Partners", "email": "ar@coastal-energy.com", "phone": "(305) 555-0707", "contact_name": "Carlos Rivera", "status": "active", "risk_score": 73, "risk_level": "high", "payment_terms": "Net 30", "outstanding": 37600, "paid": 12000, "next_action": "Draft firm collection email", "follow_up": 1},
    {"ext": "cust_08", "name": "Pinnacle Tech Services", "email": "accounts@pinnacletech.com", "phone": "(512) 555-0808", "contact_name": "Amanda Foster", "status": "contacted", "risk_score": 71, "risk_level": "high", "payment_terms": "Net 30", "outstanding": 29800, "paid": 18000, "next_action": "Schedule payment plan discussion", "follow_up": 2},
    # Medium risk (10)
    {"ext": "cust_09", "name": "Greenfield Agriculture Co", "email": "finance@greenfield-ag.com", "phone": "(515) 555-0909", "contact_name": "Tom Miller", "status": "contacted", "risk_score": 65, "risk_level": "medium", "payment_terms": "Net 30", "outstanding": 22400, "paid": 35000, "next_action": "Send follow-up reminder", "follow_up": 3},
    {"ext": "cust_10", "name": "Metro Construction Group", "email": "ar@metroconstruct.com", "phone": "(973) 555-1010", "contact_name": "James Wilson", "status": "active", "risk_score": 58, "risk_level": "medium", "payment_terms": "Net 45", "outstanding": 31200, "paid": 48000, "next_action": "Send friendly reminder", "follow_up": 5},
    {"ext": "cust_11", "name": "Lakeshore Distribution", "email": "billing@lakeshore-dist.com", "phone": "(414) 555-1111", "contact_name": "Nancy Lee", "status": "active", "risk_score": 55, "risk_level": "medium", "payment_terms": "Net 30", "outstanding": 18900, "paid": 42000, "next_action": "Monitor payment timeline", "follow_up": 5},
    {"ext": "cust_12", "name": "Valley Produce Wholesale", "email": "accounting@valleyproduce.com", "phone": "(559) 555-1212", "contact_name": "Maria Garcia", "status": "promised", "risk_score": 52, "risk_level": "medium", "payment_terms": "Net 30", "outstanding": 15600, "paid": 28000, "next_action": "Payment expected by end of month", "follow_up": 7},
    {"ext": "cust_13", "name": "Ironworks Fabrication", "email": "ar@ironworks-fab.com", "phone": "(412) 555-1313", "contact_name": "Steve Johnson", "status": "active", "risk_score": 49, "risk_level": "medium", "payment_terms": "Net 30", "outstanding": 27300, "paid": 53000, "next_action": "Send payment reminder", "follow_up": 5},
    {"ext": "cust_14", "name": "Cascade IT Solutions", "email": "finance@cascadeit.com", "phone": "(206) 555-1414", "contact_name": "Kevin Park", "status": "contacted", "risk_score": 47, "risk_level": "medium", "payment_terms": "Net 45", "outstanding": 19500, "paid": 38000, "next_action": "Await response to email", "follow_up": 4},
    {"ext": "cust_15", "name": "Heritage Foods Inc", "email": "ap@heritagefoods.com", "phone": "(615) 555-1515", "contact_name": "Diane Taylor", "status": "active", "risk_score": 44, "risk_level": "medium", "payment_terms": "Net 30", "outstanding": 12800, "paid": 21000, "next_action": "Review account status", "follow_up": 7},
    {"ext": "cust_16", "name": "Horizon Marine Supply", "email": "billing@horizonmarine.com", "phone": "(904) 555-1616", "contact_name": "Paul Anderson", "status": "active", "risk_score": 42, "risk_level": "medium", "payment_terms": "Net 30", "outstanding": 16400, "paid": 44000, "next_action": "Send friendly reminder", "follow_up": 5},
    {"ext": "cust_17", "name": "Sterling Auto Parts", "email": "accounts@sterlingauto.com", "phone": "(248) 555-1717", "contact_name": "Rachel Brown", "status": "contacted", "risk_score": 41, "risk_level": "medium", "payment_terms": "Net 30", "outstanding": 11200, "paid": 29000, "next_action": "Follow up on partial payment", "follow_up": 3},
    {"ext": "cust_18", "name": "Apex Chemical Corp", "email": "finance@apexchem.com", "phone": "(713) 555-1818", "contact_name": "Daniel Martinez", "status": "active", "risk_score": 40, "risk_level": "medium", "payment_terms": "Net 45", "outstanding": 23700, "paid": 61000, "next_action": "Monitor", "follow_up": 7},
    # Low risk (8)
    {"ext": "cust_19", "name": "Clearwater Electronics", "email": "ar@clearwaterelec.com", "phone": "(727) 555-1919", "contact_name": "Susan White", "status": "active", "risk_score": 35, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 8500, "paid": 72000, "next_action": "Standard follow-up", "follow_up": 7},
    {"ext": "cust_20", "name": "Oakridge Paper Company", "email": "billing@oakridgepaper.com", "phone": "(423) 555-2020", "contact_name": "Mark Davis", "status": "active", "risk_score": 28, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 6200, "paid": 45000, "next_action": "No action needed", "follow_up": 14},
    {"ext": "cust_21", "name": "Pioneer Telecom Inc", "email": "accounts@pioneertelecom.com", "phone": "(303) 555-2121", "contact_name": "Laura Thompson", "status": "active", "risk_score": 22, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 4800, "paid": 38000, "next_action": "No action needed", "follow_up": 14},
    {"ext": "cust_22", "name": "Sunbelt Office Solutions", "email": "finance@sunbeltoffice.com", "phone": "(404) 555-2222", "contact_name": "Chris Evans", "status": "active", "risk_score": 18, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 3400, "paid": 55000, "next_action": "No action needed", "follow_up": 14},
    {"ext": "cust_23", "name": "Timber Creek Lumber", "email": "ar@timbercreeklumber.com", "phone": "(541) 555-2323", "contact_name": "Jeff Nelson", "status": "active", "risk_score": 15, "risk_level": "low", "payment_terms": "Net 45", "outstanding": 9200, "paid": 82000, "next_action": "No action needed", "follow_up": 14},
    {"ext": "cust_24", "name": "Riverside Medical Supply", "email": "billing@riversidemed.com", "phone": "(916) 555-2424", "contact_name": "Patricia Clark", "status": "contacted", "risk_score": 12, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 2100, "paid": 33000, "next_action": "Payment in transit", "follow_up": 7},
    {"ext": "cust_25", "name": "Mountain View Packaging", "email": "ap@mtnviewpkg.com", "phone": "(801) 555-2525", "contact_name": "Brian Hall", "status": "active", "risk_score": 10, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 5600, "paid": 41000, "next_action": "No action needed", "follow_up": 14},
    {"ext": "cust_26", "name": "Bayshore Seafood Dist", "email": "finance@bayshoreseafood.com", "phone": "(410) 555-2626", "contact_name": "Amy Roberts", "status": "active", "risk_score": 8, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 7800, "paid": 96000, "next_action": "No action needed", "follow_up": 14},
    # Resolved (4)
    {"ext": "cust_27", "name": "Central Valley Foods", "email": "ar@centralvalleyfoods.com", "phone": "(209) 555-2727", "contact_name": "George Lopez", "status": "resolved", "risk_score": 0, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 0, "paid": 67000, "next_action": "", "follow_up": 0},
    {"ext": "cust_28", "name": "Eastport Shipping Co", "email": "billing@eastportship.com", "phone": "(207) 555-2828", "contact_name": "Sandra Mitchell", "status": "resolved", "risk_score": 0, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 0, "paid": 42000, "next_action": "", "follow_up": 0},
    {"ext": "cust_29", "name": "Granite State Electric", "email": "accounts@graniteelec.com", "phone": "(603) 555-2929", "contact_name": "Ryan Walker", "status": "resolved", "risk_score": 0, "risk_level": "low", "payment_terms": "Net 45", "outstanding": 0, "paid": 53000, "next_action": "", "follow_up": 0},
    {"ext": "cust_30", "name": "Golden Gate Consulting", "email": "finance@ggateconsult.com", "phone": "(415) 555-3030", "contact_name": "Michelle Young", "status": "resolved", "risk_score": 0, "risk_level": "low", "payment_terms": "Net 30", "outstanding": 0, "paid": 88000, "next_action": "", "follow_up": 0},
]

# ─── Build customer records + invoices ───────────────────────────────────────

customers = []
invoices = []
inv_counter = 1000

for c in customer_data:
    cust = {
        "external_id": f"demo:{c['ext']}",
        "name": c["name"],
        "email": c["email"],
        "phone": c["phone"],
        "contact_name": c["contact_name"],
        "status": c["status"],
        "risk_score": c["risk_score"],
        "risk_level": c["risk_level"],
        "payment_terms": c["payment_terms"],
        "total_outstanding": c["outstanding"],
        "total_paid": c["paid"],
        "next_action": c["next_action"],
        "last_contact_date": days_ago(random.randint(1, 30)) if c["status"] != "active" else "",
    }
    if c["follow_up"] > 0:
        cust["next_follow_up"] = days_from_now(c["follow_up"])
    customers.append(cust)

    # Generate invoices for each customer
    remaining_outstanding = c["outstanding"]
    if remaining_outstanding > 0:
        # Spread across 2-5 invoices
        num_invoices = random.randint(2, 5)
        for j in range(num_invoices):
            inv_counter += 1
            if j == num_invoices - 1:
                inv_amount = remaining_outstanding
            else:
                inv_amount = round(remaining_outstanding * random.uniform(0.15, 0.45), 2)
                remaining_outstanding -= inv_amount

            days_overdue = random.randint(5, 120) if c["risk_level"] == "high" else random.randint(1, 60) if c["risk_level"] == "medium" else random.randint(1, 25)
            due_date = days_ago(days_overdue)

            # Some invoices partially paid
            if random.random() < 0.2:
                paid_pct = random.uniform(0.2, 0.6)
                paid_amount = round(inv_amount * paid_pct, 2)
                balance = round(inv_amount - paid_amount, 2)
                status = "partial"
            else:
                paid_amount = 0
                balance = inv_amount
                status = "open"

            invoices.append({
                "external_id": f"demo:inv_{inv_counter}",
                "customer_name": c["name"],
                "invoice_number": f"INV-{inv_counter}",
                "amount": round(inv_amount, 2),
                "due_date": due_date,
                "days_overdue": days_overdue,
                "status": status,
                "paid_amount": paid_amount,
                "balance_remaining": round(balance, 2),
                "reminder_count": random.randint(0, 3) if days_overdue > 15 else 0,
                "last_reminder_date": days_ago(random.randint(1, 14)) if days_overdue > 15 else "",
            })
    elif c["status"] == "resolved":
        # Paid invoices for resolved customers
        for j in range(random.randint(2, 4)):
            inv_counter += 1
            inv_amount = round(c["paid"] / random.randint(2, 5), 2)
            invoices.append({
                "external_id": f"demo:inv_{inv_counter}",
                "customer_name": c["name"],
                "invoice_number": f"INV-{inv_counter}",
                "amount": inv_amount,
                "due_date": days_ago(random.randint(30, 120)),
                "days_overdue": 0,
                "status": "paid",
                "paid_amount": inv_amount,
                "balance_remaining": 0,
                "reminder_count": 0,
            })

# ─── Activities ──────────────────────────────────────────────────────────────

activity_types = ["email", "call", "note", "promise", "escalation", "payment"]
activities = []
act_counter = 0

for c in customer_data:
    if c["status"] == "resolved":
        # Just a payment activity
        act_counter += 1
        activities.append({
            "external_id": f"demo:act_{act_counter}",
            "customer_name": c["name"],
            "activity_type": "payment",
            "subject": f"Final payment received",
            "content": f"All outstanding invoices cleared. Account resolved.",
        })
        continue

    # 1-3 activities per active customer
    num_acts = random.randint(1, 3)
    for _ in range(num_acts):
        act_counter += 1
        atype = random.choice(["email", "call", "note"])
        if c["status"] == "escalated":
            atype = random.choice(["email", "escalation", "call"])
        elif c["status"] == "promised":
            atype = random.choice(["call", "promise", "note"])

        subjects = {
            "email": f"Collection email sent to {c['contact_name']}",
            "call": f"Phone call with {c['contact_name']}",
            "note": f"Internal note on {c['name']} account",
            "promise": f"Payment promise from {c['contact_name']}",
            "escalation": f"Account escalated for {c['name']}",
            "payment": f"Partial payment received from {c['name']}",
        }
        contents = {
            "email": f"Sent collection reminder for outstanding balance of ${c['outstanding']:,.2f}.",
            "call": f"Spoke with {c['contact_name']} regarding overdue invoices. Discussed payment timeline.",
            "note": f"Reviewed account. Total outstanding: ${c['outstanding']:,.2f}. Risk score: {c['risk_score']}.",
            "promise": f"{c['contact_name']} committed to making payment by end of next week.",
            "escalation": f"Account escalated due to ${c['outstanding']:,.2f} outstanding and high risk score of {c['risk_score']}.",
            "payment": f"Received partial payment. Remaining balance: ${c['outstanding']:,.2f}.",
        }

        activities.append({
            "external_id": f"demo:act_{act_counter}",
            "customer_name": c["name"],
            "activity_type": atype,
            "subject": subjects[atype],
            "content": contents[atype],
        })

# ─── Payments ────────────────────────────────────────────────────────────────

payments = []
pay_counter = 0
methods = ["ach", "wire", "check", "credit_card"]

for c in customer_data:
    if c["paid"] <= 0:
        continue
    # 1-3 payments per customer
    num_pays = random.randint(1, 3)
    remaining_paid = c["paid"]
    for j in range(num_pays):
        pay_counter += 1
        if j == num_pays - 1:
            pay_amount = remaining_paid
        else:
            pay_amount = round(remaining_paid * random.uniform(0.2, 0.5), 2)
            remaining_paid -= pay_amount

        payments.append({
            "external_id": f"demo:pay_{pay_counter}",
            "customer_name": c["name"],
            "amount": round(pay_amount, 2),
            "payment_date": days_ago(random.randint(5, 90)),
            "method": random.choice(methods),
            "reference": f"REF-{random.randint(100000, 999999)}",
        })

# ─── Seed everything ─────────────────────────────────────────────────────────

print("Seeding Collections Agent demo data...\n")

print(f"Reminder Templates ({len(reminder_templates)}):")
for t in reminder_templates:
    pb.upsert("ca_reminder_templates", t)
    print(f"  {t['stage']}: {t['name']}")

print(f"\nEscalation Rules ({len(escalation_rules)}):")
for r in escalation_rules:
    pb.upsert("ca_escalation_rules", r)
    print(f"  {r['action_type']}: {r['name']}")

print(f"\nCustomers ({len(customers)}):")
# First pass: upsert customers to get IDs
customer_ids = {}
for c in customers:
    result = pb.upsert("ca_customers", c)
    customer_ids[c["name"]] = result["id"]
    print(f"  {c['name']} ({c['status']}, risk={c.get('risk_score', 0)})")

print(f"\nInvoices ({len(invoices)}):")
for inv in invoices:
    inv["customer_id"] = customer_ids.get(inv["customer_name"], "")
    pb.upsert("ca_invoices", inv)
print(f"  Seeded {len(invoices)} invoices")

print(f"\nActivities ({len(activities)}):")
for act in activities:
    act["customer_id"] = customer_ids.get(act["customer_name"], "")
    pb.upsert("ca_activities", act)
print(f"  Seeded {len(activities)} activities")

print(f"\nPayments ({len(payments)}):")
for pay in payments:
    pay["customer_id"] = customer_ids.get(pay["customer_name"], "")
    pb.upsert("ca_payments", pay)
print(f"  Seeded {len(payments)} payments")

total_outstanding = sum(c.get("total_outstanding", 0) for c in customers)
print(f"\nDone! Total outstanding across all customers: ${total_outstanding:,.2f}")
print(f"Summary: {len(customers)} customers, {len(invoices)} invoices, {len(activities)} activities, {len(payments)} payments")
