"""
Extract structured data from an uploaded invoice document using AI vision.

Triggered automatically when a new invoice is created with a document attached.
Updates the invoice record with extracted fields, creates line item records,
suggests a GL code from vendor defaults, and sets status to "review".
"""

import json
from lumera import llm, pb, storage


def main(invoice_id: str):
    print(f"Starting extraction for invoice: {invoice_id}")

    # Fetch the invoice record
    invoice = pb.get("ip_invoices", invoice_id)
    document = invoice.get("document")

    if not document:
        pb.update("ip_invoices", invoice_id, {"status": "draft"})
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

    # Look up vendor's default GL code
    vendor_name = extracted.get("vendor_name")
    default_gl_code = None
    if vendor_name:
        result = pb.search("ip_vendors", filter={"name": vendor_name}, per_page=1)
        items = result.get("items", []) if isinstance(result, dict) else result
        if items:
            default_gl_code = items[0].get("default_gl_code")
            if default_gl_code:
                update["gl_code"] = default_gl_code
                print(f"Auto-assigned GL code {default_gl_code} from vendor {vendor_name}")

    pb.update("ip_invoices", invoice_id, update)
    print(f"Updated invoice with extracted data")

    # Create line item records from extracted line_items
    line_items = extracted.get("line_items") or []
    created_count = 0
    for item in line_items:
        if not isinstance(item, dict):
            continue
        pb.create("ip_line_items", {
            "invoice_id": invoice_id,
            "description": item.get("description", ""),
            "quantity": item.get("quantity"),
            "unit_price": item.get("unit_price"),
            "amount": item.get("amount"),
            "gl_code": default_gl_code or "",
        })
        created_count += 1
    print(f"Created {created_count} line items")

    return {"status": "success", "extracted_fields": list(extracted.keys()), "line_items_created": created_count}
