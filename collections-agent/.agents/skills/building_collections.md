---
name: building-collections
description: Design and create Lumera collection schemas. Use `pb.ensure_collection()` for idempotent create/update, stable IDs for automation references, and `lumera_file` fields for attachments.
---

# Building Collections

Design and create Lumera collection schemas. Use `pb.ensure_collection()` for idempotent create/update, stable IDs for automation references, and `lumera_file` fields for attachments.

---

## Create or Update a Collection

```python
from lumera import pb

pb.ensure_collection(
    "orders",
    schema=[
        {"name": "title", "type": "text", "required": True},
        {"name": "amount", "type": "number"},
        {"name": "is_active", "type": "bool"},
        {"name": "tags", "type": "select", "options": {"values": ["a", "b", "c"], "maxSelect": 3}},
        {"name": "customer", "type": "relation", "options": {"collectionId": "customers"}},
    ],
    id="orders",  # stable ID (survives renames)
    indexes=["CREATE INDEX idx_title ON orders (title)"],
)
```

**Declarative semantics:**
- `schema` replaces ALL existing user fields. Omit to preserve existing fields.
- `indexes` replaces ALL existing user indexes. Omit to preserve existing indexes.
- System fields/indexes are auto-managed — never include them.
- **Idempotent** — safe to call repeatedly with the same payload.

## Stable IDs

The optional `id` gives the collection a stable identifier that survives renames:

```python
pb.ensure_collection("Customer_Orders_Q1", schema=[...], id="orders")
# Renaming to "Customer_Orders_Q2" later won't break automations referencing "orders"
```

Cannot be changed after creation. Must be alphanumeric with underscores.

## Inspect Existing Collections

```python
collections = pb.list_collections()
for col in collections:
    print(col["name"], col["id"])

col = pb.get_collection("orders")
if col:
    print(col["schema"])  # current fields
```

## Delete a Collection

```python
pb.delete_collection("old_orders")
```

## Field Types

| Type | Options | Notes |
|------|---------|-------|
| `text` | — | String values |
| `number` | — | Numeric values |
| `bool` | — | Boolean values |
| `date` | — | Date/datetime |
| `select` | `{"values": [...], "maxSelect": N}` | Dropdown selection |
| `email` | — | Email addresses |
| `url` | — | URLs |
| `relation` | `{"collectionId": "target"}` | Reference to another collection |
| `lumera_file` | `{"maxSelect": 1, "maxSize": 10485760}` | File attachment (see below) |

## System Fields (Auto-Managed)

All collections automatically include — do **not** add these to your schema:

| Field | Description |
|-------|-------------|
| `id` | Auto-generated record ID |
| `created` / `updated` | Timestamps |
| `created_by` / `updated_by` | User IDs |
| `external_id` | Unique identifier for upsert operations |
| `lm_provenance` | System-only audit field |

## File Fields (`lumera_file`)

```python
pb.ensure_collection("invoices", schema=[
    {"name": "title", "type": "text", "required": True},
    {"name": "document", "type": "lumera_file", "options": {"maxSelect": 1, "maxSize": 10485760}},
])
```

Upload workflow: use `upload_lumera_file()` from SDK. See the "Using Lumera Files" skill.

## Platform Collections

Before creating new collections, check what already exists. These platform-managed collections are auto-provisioned and may already hold the data you need:

| Collection | Purpose |
|-----------|---------|
| `slack_messages` | Incoming Slack messages (auto-populated when Slack is integrated) |
| `lm_mailbox_messages` | Inbound emails with parsed fields and attachments |
| `lm_event_log` | Webhook events with payload snapshots |
| `lm_automation_runs` | Automation execution history (status, result, errors) |
| `lm_hook_runs` | Hook execution logs (event, status, duration) |
| `lm_email_logs` | Outbound email send logs |
| `lm_hooks` | Hook definitions |
| `lm_automations` | Automation definitions |
| `lm_webhook_endpoints` | Webhook endpoint configs |
| `lm_agents` | Agent definitions |
| `lm_record_history` | Record change history (versioned snapshots) |
| `lm_locks` | Distributed record locks |
| `lm_file_refs` | File attachment tracking |

Also list tenant collections with `pb.list_collections()` — users may already have custom collections you can reuse or extend rather than duplicating.

## Guidelines

- **Check existing collections first** — call `pb.list_collections()` and review platform tables above before proposing new ones
- Use lowercase names with underscores for collections
- Use `external_id` on records for upsert/sync workflows
- Use stable `id` on collections referenced by automations or hooks
- Keep schemas focused — one collection per domain concept
