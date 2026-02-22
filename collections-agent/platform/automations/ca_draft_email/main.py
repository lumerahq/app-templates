"""
Draft a personalized collection email for a customer.

Matches the appropriate reminder template based on days overdue,
then uses AI to personalize the email. Logs the draft as an activity
so the frontend can show it for review before sending.
"""

import json

from lumera import llm, pb


def main(customer_id: str):
    print(f"Drafting collection email for customer: {customer_id}")

    customer = pb.get("ca_customers", customer_id)
    name = customer.get("name", "Unknown")
    email_addr = customer.get("email", "")

    # Get open invoices
    invoices = pb.search("ca_invoices", filter={"customer_id": customer_id, "status": "open"}, per_page=100)
    open_invoices = invoices.get("items", [])

    if not open_invoices:
        return {"error": "No open invoices found for this customer"}

    # Find max days overdue
    max_days = max(int(i.get("days_overdue", 0)) for i in open_invoices)

    # Get enabled reminder templates sorted by days_overdue_trigger
    templates = pb.search("ca_reminder_templates", filter={"enabled": "yes"}, per_page=10, sort="days_overdue_trigger")
    all_templates = templates.get("items", [])

    # Match template: pick the one with the highest trigger that's <= max_days
    matched_template = None
    for t in all_templates:
        trigger = int(t.get("days_overdue_trigger", 0))
        if trigger <= max_days:
            matched_template = t

    if not matched_template and all_templates:
        matched_template = all_templates[0]  # fallback to first

    # Build invoice summary
    invoice_lines = []
    total_due = 0
    for inv in open_invoices:
        amt = float(inv.get("balance_remaining") or inv.get("amount") or 0)
        total_due += amt
        invoice_lines.append(
            f"  - {inv.get('invoice_number', 'N/A')}: ${amt:,.2f} (due {inv.get('due_date', 'N/A')}, {inv.get('days_overdue', 0)} days overdue)"
        )

    template_guide = ""
    if matched_template:
        template_guide = f"""
Use this template as a guide for tone and structure:
Stage: {matched_template.get('stage', 'friendly')}
Subject template: {matched_template.get('subject_template', '')}
Body template: {matched_template.get('body_template', '')}"""

    prompt = f"""You are a professional AR collections specialist. Draft a collection email for this customer.

Customer: {name}
Email: {email_addr}
Total Outstanding: ${total_due:,.2f}
Max Days Overdue: {max_days}

Open Invoices:
{chr(10).join(invoice_lines)}
{template_guide}

Return ONLY valid JSON:
{{
  "subject": "<email subject line>",
  "body": "<email body text, professional and clear, include specific invoice details>"
}}

Keep the tone appropriate for the overdue level. Be professional but firm."""

    response = llm.complete(prompt, json_mode=True, temperature=1)
    result = json.loads(response["content"])

    subject = result.get("subject", "Payment Reminder")
    body = result.get("body", "")

    # Log draft as activity
    pb.create("ca_activities", {
        "customer_id": customer_id,
        "customer_name": name,
        "activity_type": "email",
        "subject": subject,
        "content": body,
    })

    # Update customer status if currently active
    if customer.get("status") == "active":
        pb.update("ca_customers", customer_id, {
            "status": "contacted",
            "last_contact_date": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d"),
        })

    # Increment reminder count on invoices
    for inv in open_invoices:
        count = int(inv.get("reminder_count", 0)) + 1
        pb.update("ca_invoices", inv["id"], {
            "reminder_count": count,
            "last_reminder_date": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d"),
        })

    print(f"Email drafted: {subject}")
    return {"subject": subject, "body": body, "customer_email": email_addr}
