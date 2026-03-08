---
name: using-lumera-sdk
description: Write Python automations using the Lumera SDK. Always use the SDK for all platform operations — never make raw API calls. Import modules directly: `from lumera import pb` for records, `from lumera import storage` for files, `from lumera import llm` for AI, `from lumera import email` for sending emails.
---

# Using Lumera SDK

Write Python automations using the Lumera SDK. Always use the SDK for all platform operations — never make raw API calls. Import modules directly: `from lumera import pb` for records, `from lumera import storage` for files, `from lumera import llm` for AI, `from lumera import email` for sending emails.

---

## Modules

| Module | Import | Purpose |
|--------|--------|---------|
| `pb` | `from lumera import pb` | Record CRUD |
| `storage` | `from lumera import storage` | File uploads |
| `agents` | `from lumera import agents` | Invoke agents, with optional file attachments |
| `llm` | `from lumera import llm` | LLM completions |
| `locks` | `from lumera import locks` | Prevent concurrent processing |
| `email` | `from lumera import email` | Transactional emails |
| `integrations` | `from lumera import get_credentials` | Any provider credentials |
| `integrations.slack` | `from lumera.integrations import slack` | Slack messages |
| `integrations.google` | `from lumera.integrations import google` | Google Sheets, Drive |

**Never** import from `lumera.sdk` directly.

## Records (`pb`)

```python
from lumera import pb

# Search with filter
results = pb.search("deposits", filter={"status": "pending"}, per_page=100, sort="-created")
for dep in results["items"]:
    print(dep["id"], dep["amount"])

# Iterate all (auto-pagination)
for dep in pb.iter_all("deposits", filter={"status": "pending"}):
    process(dep)

# Get by ID or external_id
record = pb.get("deposits", "rec_abc123")
record = pb.get_by_external_id("deposits", "dep-2024-001")

# Create
pb.create("deposits", {"external_id": "dep-001", "amount": 1000, "status": "pending"})

# Update (partial)
pb.update("deposits", record_id, {"status": "processed"})

# Upsert (create or update by external_id)
pb.upsert("deposits", {"external_id": "dep-001", "amount": 2000})

# Delete
pb.delete("deposits", "rec_abc123")
```

### Bulk Operations

```python
pb.bulk_insert("deposits", [{"amount": 500}, {"amount": 750}])
pb.bulk_update("deposits", [{"id": "rec_1", "status": "done"}, {"id": "rec_2", "status": "done"}])
pb.bulk_upsert("deposits", [{"external_id": "d-1", "amount": 100}])
pb.bulk_delete("deposits", ["rec_1", "rec_2"])

# All-or-nothing with transaction=True
result = pb.bulk_insert("deposits", records, transaction=True)
if result.get("rolled_back"):
    print(f"Rolled back: {result['errors']}")
```

### Filter Syntax

| Pattern | Example |
|---------|---------|
| Equality | `{"status": "pending"}` |
| Comparison | `{"amount": {"gt": 1000}}` |
| Range | `{"amount": {"gte": 100, "lte": 500}}` |
| OR | `{"or": [{"status": "a"}, {"status": "b"}]}` |
| AND (implicit) | `{"status": "pending", "amount": {"gt": 1000}}` |

## Files (`storage`)

```python
from lumera import storage

result = storage.upload("exports/report.csv", csv_bytes, content_type="text/csv")
print(result["url"])

result = storage.upload_file("exports/report.pdf", "/tmp/generated.pdf")
files = storage.list_files(prefix="exports/")
```

## Agents (`agents`)

```python
from lumera import agents

# Invoke another agent
result = agents.invoke("agent_id", "Summarize last month's expenses")
print(result.output)
print(result.success)

# Invoke with file attachments
result = agents.invoke("classifier", "Classify this invoice",
    files=["invoice.pdf", "/tmp/receipt.png"])
print(result.output)

# List agents
for agent in agents.list():
    print(agent.name, agent.id)

# Get agent by ID
agent = agents.get("agent_id")
print(agent.name)
```

## LLM (`llm`)

```python
from lumera import llm
import json

response = llm.complete("Summarize this: ...")
print(response["content"])

# JSON mode
response = llm.complete("Classify this transaction: ...",
    system_prompt="Return JSON.", model="gpt-5.2", json_mode=True)
data = json.loads(response["content"])

# Chat
response = llm.chat([
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is 2+2?"}
])

# Embeddings
embedding = llm.embed("deposit payment notice")
embeddings = llm.embed(["text1", "text2"])  # batch
```

## Locking (`locks`)

```python
from lumera import locks

claimed = locks.claim_record_locks("export", "deposits", ["d1", "d2"], ttl_seconds=900)
for dep_id in claimed["claimed"]:
    process(dep_id)
locks.release_record_locks("export", claimed["claimed"])
```

## Email (`email`)

```python
from lumera import email

result = email.send(
    to="user@example.com",
    subject="Monthly Report",
    body_html="<h1>Report</h1><p>Details below.</p>",
    tags={"type": "report"}
)
print(result.message_id)
```

Options: `to` (string or list), `cc`, `bcc`, `reply_to`, `body_text`, `from_address`, `from_name`, `tags`.
