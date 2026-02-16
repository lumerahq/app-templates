# /// script
# dependencies = ["lumera"]
# ///
"""
Extract invoice details from an uploaded document using AI vision.

Downloads the file, uses LLM vision to extract text, then parses
the text into structured invoice fields.

Usage (triggered from frontend after file upload):
    createRun({ automationId: 'project:extract_invoice', inputs: { file_descriptor } })
"""

import json

from lumera import storage, llm

file_descriptor = inputs["file_descriptor"]

print(f"Extracting data from: {file_descriptor.get('original_name', 'unknown')}")

# --- Download the uploaded file ---
content = storage.download(file_descriptor["object_key"])

# --- Step 1: Extract raw text from the document using vision ---
print("Running document vision...")
extraction = llm.extract_text(
    content,
    mime_type=file_descriptor.get("content_type", "application/pdf"),
    filename=file_descriptor.get("original_name", "invoice"),
    prompt="Extract all text from this invoice document. Include every detail: invoice number, dates, amounts, vendor information, line items, and any other visible information.",
)

raw_text = extraction["content"]
print(f"Extracted {len(raw_text)} characters of text")

# --- Step 2: Parse extracted text into structured fields ---
print("Parsing into structured data...")
parse_response = llm.complete(
    prompt=f"""Parse this invoice text into structured data.

Extracted text:
{raw_text}

Return JSON:
{{
  "invoice_number": "exact invoice number/ID",
  "vendor_name": "vendor/company name",
  "date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "amount": 0.00,
  "description": "brief description of what this invoice is for"
}}

Rules:
- Use null for fields you cannot determine
- Amount must be a number (no currency symbols)
- Dates must be YYYY-MM-DD
- Copy the invoice number exactly as shown""",
    json_mode=True,
    temperature=0.1,
)

extracted = json.loads(parse_response["content"])

print(f"Extracted: {extracted.get('invoice_number', '?')} — ${extracted.get('amount', 0):,.2f}")

return {
    "success": True,
    "extracted": extracted,
}
