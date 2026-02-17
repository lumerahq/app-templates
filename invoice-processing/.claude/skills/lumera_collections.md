# Lumera Collections API

Manage data collections and records via the `lumera_api` tool. Use `GET /api/pb/collections` to list collections, `PUT /api/pb/collections/{name}` to ensure a collection exists with a given schema, and the records API for data operations. Supports filtering, search, and upsert by `external_id`.

---

## Overview

You can use the `lumera_api` tool to interact with Lumera's data APIs on behalf of the user. This allows you to:
- List, create, update, and delete collections (schemas)
- List, create, update, and delete records within collections
- Search and filter records

## Collections API

### List all collections
```
method: GET
path: /api/pb/collections
```

### Get a collection
```
method: GET
path: /api/pb/collections/{collection_name_or_id}
```

Response includes:
- `schema`: User-defined fields only (what you can modify)
- `indexes`: User-defined indexes only (what you can modify)
- `systemInfo`: Read-only object with system-managed fields and indexes

Example response:
```json
{
  "id": "lmc_123",
  "name": "customers",
  "schema": [
    {"name": "title", "type": "text", "required": true},
    {"name": "email", "type": "text"}
  ],
  "indexes": ["CREATE INDEX idx_email ON customers (email)"],
  "systemInfo": {
    "fields": [
      {"name": "id", "type": "text", "system": true},
      {"name": "created", "type": "autodate", "system": true},
      {"name": "updated", "type": "autodate", "system": true},
      {"name": "created_by", "type": "text", "system": true},
      {"name": "updated_by", "type": "text", "system": true},
      {"name": "external_id", "type": "text", "system": true},
      {"name": "lm_provenance", "type": "json", "system": true}
    ],
    "indexes": [
      "CREATE UNIQUE INDEX idx_customers_external_id ON customers (external_id) WHERE external_id != ''",
      "CREATE INDEX idx_customers_updated ON customers (updated)"
    ]
  }
}
```

### Ensure a collection (create or update)
```
method: PUT
path: /api/pb/collections/{collection_name}
body: {
  "id": "orders",  // optional: stable ID for automations
  "schema": [
    {"name": "title", "type": "text", "required": true},
    {"name": "description", "type": "text"},
    {"name": "count", "type": "number"},
    {"name": "is_active", "type": "bool"},
    {"name": "tags", "type": "select", "options": {"values": ["a", "b", "c"], "maxSelect": 3}}
  ],
  "indexes": [
    "CREATE INDEX idx_title ON my_collection (title)"
  ]
}
```

**IMPORTANT - Declarative semantics:**
- `id`: Optional stable identifier. If provided on creation, this ID is used instead of auto-generated. The ID remains stable even if the collection is renamed. Must be alphanumeric with underscores only. Cannot be changed after creation.
- `schema`: The COMPLETE list of user fields you want. Replaces ALL existing user fields.
- `indexes`: The COMPLETE list of user indexes you want. Replaces ALL existing user indexes.
- System fields and indexes are automatically managed - do NOT include them.
- If you omit `schema`, existing fields are preserved. If you omit `indexes`, existing indexes are preserved.

**Idempotent:** Safe to call multiple times with the same payload.

**Stable IDs for Automations:**
When building automations or hooks, use a custom `id` to ensure references remain stable:
```
PUT /api/pb/collections/Customer_Orders_Q1
{
  "id": "orders",  // stable reference for automations
  "schema": [{"name": "amount", "type": "number"}]
}
```
Later, the collection can be renamed (e.g., "Customer_Orders_Q2") but automations using `orders` as the collection identifier will continue to work.

**To add a field:** Get collection, append to schema, PUT back:
```
GET /api/pb/collections/customers  → get current schema
schema.append({"name": "phone", "type": "text"})
PUT /api/pb/collections/customers with updated schema
```

### Delete a collection
```
method: DELETE
path: /api/pb/collections/{collection_name_or_id}
```

## Records API

### List records
```
method: GET
path: /api/pb/collections/{collection_id}/records
query params:
  - page: Page number (1-indexed, default 1)
  - perPage: Results per page (max 500, default 50)
  - sort: Sort expression (e.g., "-created" for newest first)
  - filter: JSON filter object (e.g., {"status":"active"})
```

Response:
```json
{
  "items": [...],
  "page": 1,
  "perPage": 50,
  "totalItems": 632,
  "totalPages": 13
}
```

### List with filter
```
method: GET
path: /api/pb/collections/{collection_id}/records?filter={"field":"value"}
```

### Create a record
```
method: POST
path: /api/pb/collections/{collection_id}/records
body: { "title": "Hello", "count": 42 }
```

### Update a record
```
method: PATCH
path: /api/pb/collections/{collection_id}/records/{record_id}
body: { "title": "Updated" }
```

### Upsert a record (by external_id)
```
method: POST
path: /api/pb/collections/{collection_id}/records/upsert
body: { "external_id": "unique-key", "title": "Value" }
```

### Search records
```
method: GET
path: /api/pb/collections/{collection_id}/search?q=search_term
query params:
  - q: Search query (required, min 2 characters)
  - page: Page number (1-indexed, default 1)
  - perPage: Results per page (max 500, default 50)
  - sort: Sort expression (e.g., "-created" for newest first)
```

Response (same as list):
```json
{
  "items": [...],
  "page": 1,
  "perPage": 50,
  "totalItems": 632,
  "totalPages": 13
}
```

## Bulk Operations

Bulk operations allow you to process multiple records in a single request. Maximum batch size is 1000 records.

### Transaction mode
All bulk operations support an optional `"transaction": true` flag for all-or-nothing semantics:
- **Default (false)**: Partial success allowed - some records may succeed while others fail
- **Transaction (true)**: All-or-nothing - if any record fails, all changes are rolled back

### Bulk delete by IDs
```
method: POST
path: /api/pb/collections/{collection_id}/records/bulk/delete
body: { "ids": ["rec_abc123", "rec_def456", "rec_ghi789"], "transaction": true }
```

### Bulk update
```
method: POST
path: /api/pb/collections/{collection_id}/records/bulk/update
body: {
  "records": [
    { "id": "rec_abc123", "status": "approved", "amount": 100 },
    { "id": "rec_def456", "status": "rejected", "amount": 200 }
  ],
  "transaction": true
}
```
Note: Each record must have an `id` field. Records must exist (returns error if not found).

### Bulk upsert (create or update by external_id)
```
method: POST
path: /api/pb/collections/{collection_id}/records/bulk/upsert
body: {
  "records": [
    { "external_id": "ext-001", "name": "Record 1", "status": "active" },
    { "external_id": "ext-002", "name": "Record 2", "status": "pending" }
  ],
  "transaction": true
}
```
Note: Each record must include an `external_id` value. The field itself is auto-added to all collections.

### Bulk insert (create multiple records)
```
method: POST
path: /api/pb/collections/{collection_id}/records/bulk/insert
body: {
  "records": [
    { "name": "New Record 1", "amount": 100 },
    { "name": "New Record 2", "amount": 200 }
  ],
  "transaction": true
}
```

### Bulk response format
All bulk operations return:
```json
{
  "succeeded": 5,
  "failed": 1,
  "errors": [{ "index": 3, "error": "validation failed" }],
  "records": [...],      // Only for insert/upsert operations
  "rolled_back": false   // Only present when transaction=true and operation failed
}
```

## System Fields (Auto-Managed)

**All collections automatically include these fields** - you CANNOT add them to your schema (the API will reject them):

| Field | Type | Description |
|-------|------|-------------|
| `id` | text | Auto-generated record ID (15-char alphanumeric) |
| `created` | autodate | Record creation timestamp |
| `updated` | autodate | Last update timestamp |
| `created_by` | text | User ID who created the record |
| `updated_by` | text | User ID who last updated |
| `external_id` | text | Stable external identifier for upsert operations (unique index where non-empty) |
| `lm_provenance` | json | Who/what triggered the write - **system-writable only**, cannot be set via API |

The `external_id` field enables upsert operations on any collection without needing to define it in your schema.

## System Indexes (Auto-Managed)

All collections automatically have these indexes - do NOT include them in your `indexes` array:
- `external_id` unique index (for upsert operations)
- `updated` index (for efficient sorting)

## Field Types

When creating collections, use these field types for your **custom fields**:

| Type | Description | Options |
|------|-------------|---------|
| `text` | String values | - |
| `number` | Numeric values | - |
| `bool` | Boolean values | - |
| `date` | Date/datetime values | - |
| `select` | Dropdown selection | `{"values": ["opt1", "opt2"], "maxSelect": 1}` |
| `email` | Email addresses | - |
| `url` | URLs | - |
| `relation` | Reference to another collection | `{"collectionId": "..."}` |
| `lumera_file` | File attachment | `{"maxSelect": 1, "maxSize": 10485760}` |

## File Uploads (lumera_file fields)

The `lumera_file` field type stores file attachments in cloud storage. Files can be uploaded **independently of record creation** - you don't need to create a record first.

### Upload Workflow

**Step 1: Get a presigned upload URL**
```
method: POST
path: /api/pb/uploads/presign
body: {
  "collection_id": "my_collection",
  "field_name": "document",
  "filename": "report.pdf",
  "content_type": "application/pdf",
  "size": 102400
}
```
Note: `record_id` is **optional**. If omitted, a temporary path is generated.

**Response:**
```json
{
  "upload_url": "https://storage.example.com/presigned-url...",
  "object_key": "pb/collection_id/temp-uuid/document/abc123_report.pdf"
}
```

**Step 2: Upload the file**
Upload directly to the `upload_url` using a PUT request with the file content.

**Step 3: Store the file descriptor in a record**
When creating or updating a record, provide the full file descriptor (not just the object_key):
```
method: POST
path: /api/pb/collections/my_collection/records
body: {
  "title": "Q4 Report",
  "document": {
    "object_key": "pb/collection_id/temp-uuid/document/abc123_report.pdf",
    "original_name": "report.pdf",
    "size": 102400,
    "content_type": "application/pdf",
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
}
```

### File Descriptor Fields

| Field | Required | Description |
|-------|----------|-------------|
| `object_key` | Yes | Storage path returned from presign |
| `original_name` | Yes | Original filename |
| `size` | Yes | File size in bytes |
| `content_type` | Yes | MIME type |
| `uploaded_at` | No | ISO 8601 timestamp (auto-set if missing) |

### Key Points

- **Upload first, create record later**: You can upload files before the record exists
- **Full descriptor required**: Store the complete descriptor object, not just the `object_key` string
- **Automatic cleanup**: Files are deleted from storage when removed from a record or when the record is deleted
- **Cannot import via CSV**: File fields return `null` during CSV imports; use the upload API separately

## Guidelines

1. Always list collections first to understand what's available
2. When creating collections, use descriptive names (lowercase, underscores)
3. Use `external_id` (auto-added to all collections) for upsert/sync operations on records
4. Use custom `id` when creating collections that will be referenced in automations/hooks - the ID remains stable even if the collection is renamed
5. Check API responses for errors and report them clearly
6. For bulk operations, use the bulk endpoints (max 1000 records per request)
7. Use PUT to ensure collections exist - it's idempotent and handles both create and update

## Example Workflow

1. **List existing collections:**
   ```
   GET /api/pb/collections
   ```

2. **Create or update a collection** (system fields and indexes are auto-managed):
   ```
   PUT /api/pb/collections/customers
   {
     "schema": [
       {"name": "name", "type": "text", "required": true},
       {"name": "email", "type": "email"},
       {"name": "status", "type": "select", "options": {"values": ["active", "inactive"]}}
     ]
   }
   ```

3. **Add records:**
   ```
   POST /api/pb/collections/customers/records
   {"external_id": "cust-001", "name": "Acme Corp", "email": "contact@acme.com", "status": "active"}
   ```

4. **Query records:**
   ```
   GET /api/pb/collections/customers/records?filter={"status":"active"}
   ```

5. **Add a field to an existing collection:**
   ```
   GET /api/pb/collections/customers  → get current schema
   # Append {"name": "phone", "type": "text"} to schema array
   PUT /api/pb/collections/customers with updated schema
   ```
