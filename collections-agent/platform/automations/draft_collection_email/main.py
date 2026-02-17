"""
Draft a personalized collection email for a customer based on their open AR invoices.

Triggered from the frontend when a user clicks "Draft Email" on a customer detail page.
Creates a collection_activities record with the drafted email content.
"""

import json
from datetime import date

from lumera import llm, pb


def main(customer_id: str):
    print(f"Drafting collection email for customer: {customer_id}")

    # Fetch the customer record
    customer = pb.get("customers", customer_id)
    customer_name = customer.get("name", "Customer")
    contact_name = customer.get("contact_name") or "Accounts Payable"

    # Fetch open invoices for this customer
    invoices = pb.list(
        "ar_invoices",
        filter=f"customer='{customer_id}' && status='open'",
        sort="-days_overdue",
        limit=50,
    )

    items = invoices.get("items", [])
    if not items:
        return {"error": "No open invoices found for this customer"}

    # Build invoice summary for the LLM
    invoice_lines = []
    total = 0
    for inv in items:
        amount = float(inv.get("amount", 0))
        total += amount
        days = inv.get("days_overdue", 0)
        due = inv.get("due_date", "unknown")
        if isinstance(due, str) and "T" in due:
            due = due.split("T")[0]
        invoice_lines.append(
            f"- Invoice #{inv['invoice_number']}: ${amount:,.2f} "
            f"(due {due}, {days} days overdue)"
        )

    max_overdue = max(inv.get("days_overdue", 0) for inv in items)

    # Determine tone based on how overdue
    if max_overdue <= 15:
        tone = "friendly reminder"
    elif max_overdue <= 45:
        tone = "firm but professional"
    else:
        tone = "urgent and direct"

    prompt = f"""Draft a {tone} collection email.

Customer: {customer_name}
Contact: {contact_name}
Total Outstanding: ${total:,.2f}
Number of Open Invoices: {len(items)}

Open Invoices:
{chr(10).join(invoice_lines)}

Guidelines:
- Address the contact by name
- Reference specific invoice numbers and amounts
- Request payment or a call to discuss payment arrangements
- Keep it concise (3-4 paragraphs)
- Professional tone appropriate for the overdue severity
- Include a clear call to action

Return JSON:
{{"subject": "string - email subject line", "body": "string - email body text"}}"""

    response = llm.complete(prompt, json_mode=True, temperature=1)
    result = json.loads(response["content"])

    subject = result.get("subject", "Payment Reminder")
    body = result.get("body", "")

    # Create activity record with the draft
    pb.create(
        "collection_activities",
        {
            "customer": customer_id,
            "activity_type": "email_draft",
            "subject": subject,
            "content": body,
            "contact_date": date.today().isoformat(),
        },
    )

    # Update customer status and last contact date
    pb.update(
        "customers",
        customer_id,
        {
            "status": "contacted",
            "last_contact_date": date.today().isoformat(),
        },
    )

    print(f"Drafted email: {subject}")
    return {"status": "success", "subject": subject}
