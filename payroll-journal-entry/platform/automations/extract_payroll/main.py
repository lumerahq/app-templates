"""
Extract payroll data from an uploaded report and generate journal entry lines.

Triggered automatically when a new payroll run is created with a document attached.
Updates the payroll run with extracted data and creates journal entry records.
"""

import json
from lumera import llm, pb, storage


def main(payroll_run_id: str):
    print(f"Starting extraction for payroll run: {payroll_run_id}")

    # Fetch the payroll run record
    run = pb.get("payroll_runs", payroll_run_id)
    document = run.get("document")

    if not document:
        pb.update("payroll_runs", payroll_run_id, {"status": "draft"})
        return {"error": "No document attached"}

    # Download the file
    object_key = document["object_key"]
    content_type = document.get("content_type", "application/pdf")
    filename = document.get("original_name", "payroll_report.pdf")

    file_bytes = storage.download(object_key)
    print(f"Downloaded {len(file_bytes)} bytes")

    # Extract structured data using AI
    extraction_prompt = """Extract payroll data from this document and return JSON with this structure:
{
  "pay_period_start": "YYYY-MM-DD",
  "pay_period_end": "YYYY-MM-DD",
  "pay_date": "YYYY-MM-DD",
  "journal_entries": [
    {
      "account_code": "string - GL account code",
      "account_name": "string - GL account name",
      "department": "string - department name if applicable",
      "debit_amount": number_or_0,
      "credit_amount": number_or_0,
      "memo": "string - brief description"
    }
  ]
}

Common payroll journal entry pattern:
- DEBIT: Wages/Salary Expense, Payroll Tax Expense, Benefits Expense
- CREDIT: Wages Payable, Tax Withholdings Payable, Benefits Payable

Return ONLY valid JSON. Use null for fields you cannot find.
Total debits must equal total credits."""

    response = llm.extract_text(
        source=file_bytes,
        mime_type=content_type,
        filename=filename,
        prompt=extraction_prompt,
    )
    result_text = response["content"]
    print(f"Extraction complete ({len(result_text)} chars)")

    # Parse the extraction result
    try:
        extracted = json.loads(result_text)
    except json.JSONDecodeError:
        pb.update("payroll_runs", payroll_run_id, {"status": "review", "extracted_data": {"raw_text": result_text}})
        return {"error": "Could not parse extraction result"}

    # Create journal entry records
    entries = extracted.get("journal_entries", [])
    total_debits = 0
    total_credits = 0

    for entry in entries:
        debit = float(entry.get("debit_amount", 0) or 0)
        credit = float(entry.get("credit_amount", 0) or 0)
        total_debits += debit
        total_credits += credit

        pb.create("journal_entries", {
            "payroll_run": payroll_run_id,
            "account_code": entry.get("account_code", ""),
            "account_name": entry.get("account_name", ""),
            "department": entry.get("department", ""),
            "debit_amount": debit,
            "credit_amount": credit,
            "memo": entry.get("memo", ""),
        })

    # Update the payroll run
    update = {
        "extracted_data": extracted,
        "total_debits": total_debits,
        "total_credits": total_credits,
        "status": "review",
    }

    if extracted.get("pay_period_start"):
        update["pay_period_start"] = extracted["pay_period_start"]
    if extracted.get("pay_period_end"):
        update["pay_period_end"] = extracted["pay_period_end"]
    if extracted.get("pay_date"):
        update["pay_date"] = extracted["pay_date"]

    pb.update("payroll_runs", payroll_run_id, update)
    print(f"Created {len(entries)} journal entries, total debits={total_debits}, credits={total_credits}")

    return {"status": "success", "entries_created": len(entries)}
