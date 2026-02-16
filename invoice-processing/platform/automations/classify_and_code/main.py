# /// script
# dependencies = ["lumera"]
# ///
"""
Classify and code an invoice using AI.

Fetches the invoice, vendor info, and available GL accounts,
then uses an LLM to suggest the best GL code with a confidence score.
"""

import json

from lumera import pb, llm

# --- Get inputs ---
invoice_id = inputs["invoice_id"]

# --- Fetch invoice ---
invoice = pb.get("invoices", invoice_id)
if not invoice:
    raise ValueError(f"Invoice {invoice_id} not found")

print(f"Processing invoice {invoice.get('invoice_number', invoice_id)}...")

# Update status to processing
pb.update("invoices", invoice_id, {"status": "processing"})

# --- Fetch vendor info ---
vendor_name = "Unknown Vendor"
default_gl = None
if invoice.get("vendor"):
    try:
        vendor = pb.get("vendors", invoice["vendor"])
        vendor_name = vendor.get("name", "Unknown Vendor")
        default_gl = vendor.get("default_gl_code")
    except Exception:
        pass

# --- Fetch active GL accounts ---
gl_result = pb.search("gl_accounts", filter={"active": True}, per_page=100)
gl_accounts = gl_result.get("items", [])
gl_list = "\n".join(
    f"- {a['code']}: {a['name']} ({a.get('type', 'N/A')}, dept: {a.get('department', 'N/A')})"
    for a in gl_accounts
)

# --- Build LLM prompt ---
prompt = f"""You are a finance AI assistant that codes invoices to GL accounts.

Invoice Details:
- Invoice Number: {invoice.get('invoice_number', 'N/A')}
- Vendor: {vendor_name}
- Amount: ${invoice.get('amount', 0):,.2f}
- Description: {invoice.get('description', 'No description')}
- Date: {invoice.get('date', 'N/A')}

Vendor Default GL Code: {default_gl or 'None set'}

Available GL Accounts:
{gl_list}

Based on the invoice description, vendor, and amount, select the most appropriate GL account code.

Respond with JSON only:
{{
  "gl_code": "the GL account code from the list above",
  "department": "the department this expense belongs to",
  "confidence": 85,
  "reasoning": "brief explanation of why this GL code was chosen"
}}

Rules:
- confidence is 0-100
- If the vendor has a default GL code and the description matches, confidence should be high (90+)
- If the description is vague, confidence should be lower (50-70)
- Always pick from the available GL accounts list"""

# --- Call LLM ---
print("Classifying with AI...")
response = llm.complete(prompt, json_mode=True)
result = json.loads(response["content"])

gl_code = result.get("gl_code", "")
department = result.get("department", "")
confidence = result.get("confidence", 0)
reasoning = result.get("reasoning", "")

# --- Determine status based on confidence ---
new_status = "coded" if confidence >= 90 else "pending_approval"

# --- Update invoice ---
pb.update("invoices", invoice_id, {
    "gl_code": gl_code,
    "department": department,
    "coding_confidence": confidence,
    "notes": f"AI suggestion: {reasoning}",
    "status": new_status,
})

print(f"Invoice {invoice.get('invoice_number')} coded to {gl_code} (confidence: {confidence}%)")
print(f"Status: {new_status}")
print(f"Reasoning: {reasoning}")
