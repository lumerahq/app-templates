# Lumera SDK for Automations

Write Python automations using the Lumera SDK. Use `from lumera import pb` for records, `from lumera import storage` for files, `from lumera import llm` for AI completions, `from lumera import email` for sending emails. Avoid importing from `lumera.sdk` directly.

---

## Overview

The Lumera SDK provides high-level modules for building automations:

| Module | Import | Purpose |
|--------|--------|---------|
| `pb` | `from lumera import pb` | Record CRUD operations |
| `storage` | `from lumera import storage` | File uploads |
| `llm` | `from lumera import llm` | LLM completions |
| `locks` | `from lumera import locks` | Prevent concurrent processing |
| `email` | `from lumera import email` | Send transactional emails |

## Record Operations (`pb`)

### Search Records
```python
from lumera import pb

# Simple filter
results = pb.search("deposits", filter={"status": "pending"})

# Comparison operators: eq, gt, gte, lt, lte
results = pb.search("deposits", filter={"amount": {"gt": 1000}})

# OR logic
results = pb.search("deposits", filter={"or": [{"status": "pending"}, {"status": "review"}]})

# Pagination and sorting
results = pb.search("deposits", filter={"status": "pending"}, per_page=100, sort="-created")

for deposit in results["items"]:
    print(deposit["id"], deposit["amount"])
```

### Iterate All Records (Auto-Pagination)
```python
# Automatically handles pagination
for deposit in pb.iter_all("deposits", filter={"status": "pending"}):
    process(deposit)
```

### Get Single Record
```python
# By ID
deposit = pb.get("deposits", "rec_abc123")

# By external_id
deposit = pb.get_by_external_id("deposits", "dep-2024-001")
```

### Create, Update, Delete
```python
# Create
deposit = pb.create("deposits", {
    "external_id": "dep-001",
    "amount": 1000,
    "status": "pending"
})

# Update (partial)
pb.update("deposits", deposit["id"], {"status": "processed"})

# Upsert (create or update by external_id)
pb.upsert("deposits", {
    "external_id": "dep-001",
    "amount": 2000  # Updates if exists
})

# Delete
pb.delete("deposits", "rec_abc123")
```

### Bulk Operations

Process multiple records in a single call (max 1000 records per request):

```python
from lumera import pb

# Bulk delete by IDs
result = pb.bulk_delete("deposits", ["rec_abc", "rec_def", "rec_ghi"])
print(f"Deleted: {result['succeeded']}, Failed: {result['failed']}")

# Bulk update (individual data per record)
result = pb.bulk_update("deposits", [
    {"id": "rec_abc", "status": "approved", "amount": 100},
    {"id": "rec_def", "status": "rejected", "amount": 200},
])
# Each record must have 'id' field. Records must exist.

# Bulk upsert (create or update by external_id)
result = pb.bulk_upsert("deposits", [
    {"external_id": "dep-001", "amount": 1000, "status": "pending"},
    {"external_id": "dep-002", "amount": 2000, "status": "approved"},
])
# Returns created/updated records in result["records"]

# Bulk insert (create multiple new records)
result = pb.bulk_insert("deposits", [
    {"amount": 500, "status": "new"},
    {"amount": 750, "status": "new"},
])
# Returns created records in result["records"]
```

**Transaction mode**: All bulk operations support `transaction=True` for all-or-nothing semantics:
```python
# All-or-nothing: if any record fails, all changes are rolled back
result = pb.bulk_insert("deposits", records, transaction=True)
if result.get("rolled_back"):
    print(f"Transaction rolled back: {result['errors']}")
```

Bulk response format:
```python
{
    "succeeded": 5,
    "failed": 1,
    "errors": [{"index": 3, "error": "validation failed"}],
    "records": [...],     # Only for insert/upsert
    "rolled_back": False  # Only when transaction=True and operation failed
}
```

## File Storage (`storage`)

Files are automatically namespaced by the current automation run.

```python
from lumera import storage

# Upload content directly
result = storage.upload(
    path="exports/report.csv",
    content=csv_data.encode("utf-8"),
    content_type="text/csv"
)
print(f"Uploaded to: {result['url']}")

# Upload from disk
result = storage.upload_file(
    path="exports/report.pdf",
    file_path="/tmp/generated.pdf"
)

# List files in this run
files = storage.list_files(prefix="exports/")
```

## LLM Completions (`llm`)

```python
from lumera import llm
import json

# Simple completion
response = llm.complete("Summarize this document: ...")
print(response["content"])

# With system prompt and JSON mode
response = llm.complete(
    prompt="Classify this transaction: ...",
    system_prompt="You are an expert accountant. Return JSON.",
    model="gpt-5.2-mini",  # or gpt-5.2, gpt-5.2-nano
    json_mode=True
)
data = json.loads(response["content"])

# Multi-turn chat
response = llm.chat([
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is 2+2?"},
    {"role": "assistant", "content": "4"},
    {"role": "user", "content": "What about 3+3?"}
])

# Embeddings
embedding = llm.embed("deposit payment notice")
embeddings = llm.embed(["text1", "text2", "text3"])  # Batch
```

## Locking (`locks`)

Prevent duplicate processing of records:

```python
from lumera import locks

# Claim locks on specific records
result = locks.claim_record_locks(
    job_type="export",
    collection="deposits",
    record_ids=["dep_1", "dep_2", "dep_3"],
    ttl_seconds=900  # 15 minutes
)

# Process only claimed records
for dep_id in result["claimed"]:
    process_deposit(dep_id)

# Release when done
locks.release_record_locks(job_type="export", record_ids=result["claimed"])
```

## Email (`email`)

Send transactional emails through AWS SES:

```python
from lumera import email

# Simple email
result = email.send(
    to="user@example.com",
    subject="Welcome to Lumera!",
    body_html="<h1>Hello!</h1><p>Welcome aboard.</p>"
)
print(f"Sent! Message ID: {result.message_id}")

# Email with multiple recipients and options
result = email.send(
    to=["alice@example.com", "bob@example.com"],
    subject="Monthly Report",
    body_html="<h1>Report</h1><p>See details below.</p>",
    body_text="Report\n\nSee details below.",  # Optional plain text
    cc="manager@example.com",
    reply_to="reports@example.com",
    tags={"type": "report", "department": "sales"}  # For tracking
)
```

**Parameters:**
- `to` - Recipient(s), string or list
- `subject` - Email subject line
- `body_html` - HTML content (required unless body_text provided)
- `body_text` - Plain text content (auto-generated from HTML if not provided)
- `cc`, `bcc` - Optional CC/BCC recipients
- `from_address`, `from_name` - Optional sender (uses platform default)
- `reply_to` - Optional reply-to address
- `tags` - Optional dict for tracking in logs

**Returns:** `SendResult` with `message_id` and `log_id`

## Complete Example

```python
from lumera import pb, storage, llm
from datetime import datetime
import csv
import io

def main(status: str = "approved"):
    """Export deposits matching status to CSV."""

    # Query records
    deposits = list(pb.iter_all("deposits", filter={"status": status}))

    if not deposits:
        return {"message": "No deposits found", "count": 0}

    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Amount", "Status", "Created"])
    for dep in deposits:
        writer.writerow([dep["id"], dep["amount"], dep["status"], dep["created"]])

    # Upload to storage
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    result = storage.upload(
        path=f"exports/deposits_{status}_{timestamp}.csv",
        content=output.getvalue().encode("utf-8"),
        content_type="text/csv"
    )

    # Update records
    for dep in deposits:
        pb.update("deposits", dep["id"], {"status": "exported"})

    return {
        "success": True,
        "count": len(deposits),
        "file_url": result["url"]
    }
```

## Filter Syntax Reference

| Pattern | Example |
|---------|---------|
| Equality | `{"status": "pending"}` |
| Greater than | `{"amount": {"gt": 1000}}` |
| Range | `{"amount": {"gte": 100, "lte": 500}}` |
| OR | `{"or": [{"status": "a"}, {"status": "b"}]}` |
| AND (implicit) | `{"status": "pending", "amount": {"gt": 1000}}` |
| Date comparison | `{"created": {"gte": "2024-01-01T00:00:00Z"}}` |

## Available Models

| Model | Best for |
|-------|----------|
| `gpt-5.2` | Complex reasoning tasks |
| `gpt-5.2-mini` | General purpose (default) |
| `gpt-5.2-nano` | Fast, simple tasks |

## Important

- **DO NOT** import from `lumera.sdk` directly - use the modules above
- All filter values use JSON syntax (dicts), not string expressions
- Files uploaded via `storage` are scoped to the current automation run
- LLM API keys are automatically fetched from the Lumera platform
