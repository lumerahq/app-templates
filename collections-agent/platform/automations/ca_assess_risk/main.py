"""
Assess a customer's collection risk using AI.

Pulls invoices, payment history, and activities to build a risk profile,
then uses an LLM to generate a risk score (0-100), level, and recommended action.
"""

import json
from datetime import datetime, timedelta

from lumera import llm, pb


def main(customer_id: str):
    print(f"Assessing risk for customer: {customer_id}")

    customer = pb.get("ca_customers", customer_id)
    name = customer.get("name", "Unknown")

    # Pull all invoices for this customer
    invoices = pb.search("ca_invoices", filter={"customer_id": customer_id}, per_page=200)
    all_invoices = invoices.get("items", [])

    open_invoices = [i for i in all_invoices if i.get("status") in ("open", "partial")]

    # Pull recent payments
    payments = pb.search("ca_payments", filter={"customer_id": customer_id}, per_page=100)
    all_payments = payments.get("items", [])

    # Calculate metrics
    total_outstanding = sum(float(i.get("balance_remaining") or i.get("amount") or 0) for i in open_invoices)
    total_paid = sum(float(p.get("amount", 0)) for p in all_payments)
    total_invoiced = sum(float(i.get("amount", 0)) for i in all_invoices)

    days_overdue_list = [int(i.get("days_overdue", 0)) for i in open_invoices if int(i.get("days_overdue", 0)) > 0]
    max_days_overdue = max(days_overdue_list) if days_overdue_list else 0
    avg_days_overdue = round(sum(days_overdue_list) / len(days_overdue_list)) if days_overdue_list else 0

    over_90 = len([d for d in days_overdue_list if d > 90])
    pct_over_90 = round(over_90 / len(open_invoices) * 100) if open_invoices else 0

    payment_ratio = round(total_paid / total_invoiced * 100) if total_invoiced > 0 else 0

    profile = {
        "customer_name": name,
        "total_outstanding": total_outstanding,
        "total_paid_lifetime": total_paid,
        "open_invoice_count": len(open_invoices),
        "max_days_overdue": max_days_overdue,
        "avg_days_overdue": avg_days_overdue,
        "pct_invoices_over_90_days": pct_over_90,
        "lifetime_payment_ratio_pct": payment_ratio,
        "payment_terms": customer.get("payment_terms", "Net 30"),
    }

    prompt = f"""You are an AR collections risk analyst. Analyze this customer profile and return a JSON risk assessment.

Customer Profile:
{json.dumps(profile, indent=2)}

Return ONLY valid JSON:
{{
  "risk_score": <number 0-100, higher = more risky>,
  "risk_level": "<low | medium | high>",
  "next_action": "<recommended next step in 1 sentence>",
  "reasoning": "<2-3 sentence explanation>"
}}

Guidelines:
- 0-39 = low risk (paying on time, small balances)
- 40-69 = medium risk (some overdue, moderate amounts)
- 70-100 = high risk (significantly overdue, large amounts, poor payment history)"""

    response = llm.complete(prompt, json_mode=True, temperature=1)
    result = json.loads(response["content"])

    risk_score = int(result.get("risk_score", 50))
    risk_level = result.get("risk_level", "medium")

    # Set follow-up based on risk
    follow_up_days = {"high": 1, "medium": 3, "low": 7}.get(risk_level, 3)
    next_follow_up = (datetime.utcnow() + timedelta(days=follow_up_days)).strftime("%Y-%m-%d")

    pb.update("ca_customers", customer_id, {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "next_action": result.get("next_action", ""),
        "next_follow_up": next_follow_up,
        "total_outstanding": total_outstanding,
    })

    # Log assessment as activity so frontend can read it
    pb.create("ca_activities", {
        "customer_id": customer_id,
        "customer_name": name,
        "activity_type": "note",
        "subject": f"Risk Assessment: {risk_level.title()} ({risk_score})",
        "content": result.get("reasoning", ""),
        "outcome": result.get("next_action", ""),
    })

    print(f"Risk assessment complete: score={risk_score}, level={risk_level}")
    return result
