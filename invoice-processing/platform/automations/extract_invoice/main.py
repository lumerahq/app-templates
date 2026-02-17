"""
Extract structured data from an uploaded invoice document using AI vision.

Triggered automatically when a new invoice is created with a document attached.
Updates the invoice record with extracted fields and sets status to "review".
"""

import json
from lumera import llm, pb, storage


def main(invoice_id: str):
    print(f"Starting extraction for invoice: {invoice_id}")

    # Fetch the invoice record
    invoice = pb.get("invoices", invoice_id)
    document = invoice.get("document")

    if not document:
        pb.update("invoices", invoice_id, {"status": "draft"})
        return {"error": "No document attached"}

    # Download the file
    object_key = document["object_key"]
    content_type = document.get("content_type", "application/pdf")
    filename = document.get("original_name", "invoice.pdf")

    file_bytes = storage.download(object_key)
    print(f"Downloaded {len(file_bytes)} bytes")

    # Extract structured data using AI vision
    extraction_prompt = """Extract the following fields from this invoice document as JSON:
{
  "vendor_name": "string - the vendor/supplier name",
  "invoice_number": "string - the invoice number or ID",
  "invoice_date": "string - date in YYYY-MM-DD format",
  "due_date": "string - due date in YYYY-MM-DD format if present",
  "total_amount": "number - the total amount",
  "currency": "string - 3-letter currency code (default USD)",
  "description": "string - brief description of what the invoice is for",
  "line_items": [
    {"description": "string", "quantity": "number", "unit_price": "number", "amount": "number"}
  ]
}

Return ONLY valid JSON. Use null for fields you cannot find."""

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
        extracted = {"raw_text": result_text}

    # Build update from extracted fields
    update = {"extracted_data": extracted, "status": "review"}

    field_map = ["vendor_name", "invoice_number", "invoice_date", "due_date", "total_amount", "currency", "description"]
    for field in field_map:
        value = extracted.get(field)
        if value is not None:
            update[field] = value

    pb.update("invoices", invoice_id, update)
    print(f"Updated invoice with extracted data")

    return {"status": "success", "extracted_fields": list(extracted.keys())}
