---
name: using-collections
description: Query and manage records in Lumera collections. Use `from lumera import pb` for all record operations and `from lumera import query_sql` for complex reads.
---

# Using Collections

Query and manage records in Lumera collections. Use `from lumera import pb` for all record operations and `from lumera import query_sql` for complex reads.

---

## Records

```python
from lumera import pb

# Search with filter and sort
results = pb.search("orders", filter={"status": "pending"}, sort="-created", per_page=100)
for order in results["items"]:
    print(order["id"], order["amount"])

# Iterate all (auto-pagination)
for order in pb.iter_all("orders", filter={"status": "active"}):
    process(order)

# Get by ID or external_id
record = pb.get("orders", "rec_abc123")
record = pb.get_by_external_id("orders", "order-2024-001")

# Create
pb.create("orders", {"external_id": "ord-001", "amount": 1000, "status": "pending"})

# Update (partial)
pb.update("orders", record_id, {"status": "shipped"})

# Upsert (create or update by external_id)
pb.upsert("orders", {"external_id": "ord-001", "amount": 2000})

# Delete
pb.delete("orders", "rec_abc123")
```

## Bulk Operations

Max 1000 records per request. Use `transaction=True` for all-or-nothing.

```python
pb.bulk_insert("orders", [{"amount": 500}, {"amount": 750}])
pb.bulk_update("orders", [{"id": "rec_1", "status": "done"}, {"id": "rec_2", "status": "done"}])
pb.bulk_upsert("orders", [{"external_id": "o-1", "amount": 100}])
pb.bulk_delete("orders", ["rec_1", "rec_2"])

# All-or-nothing
result = pb.bulk_insert("orders", records, transaction=True)
if result.get("rolled_back"):
    print(f"Rolled back: {result['errors']}")
```

## SQL Queries (Read-Only)

Best for joins, aggregates, and complex filters.

```python
from lumera import query_sql

result = query_sql("SELECT status, COUNT(*) as cnt FROM orders GROUP BY status")
# Returns { columns, rows, durationMs }

# With parameters (prevents injection)
result = query_sql(
    "SELECT id, amount FROM orders WHERE status = {:s} AND amount > {:min}",
    params={"s": "pending", "min": 1000}
)
```

Table names = collection names. Every table has `id`, `created`, `updated`, `external_id` plus custom fields.

## Filter Syntax

Filters are dicts passed to `pb.search()`, `pb.iter_all()`, and bulk operations.

| Pattern | Example |
|---------|---------|
| Equality | `{"status": "pending"}` |
| Greater than | `{"amount": {"gt": 1000}}` |
| Range | `{"amount": {"gte": 100, "lte": 500}}` |
| OR | `{"or": [{"status": "a"}, {"status": "b"}]}` |
| AND (implicit) | `{"status": "pending", "amount": {"gt": 1000}}` |
| Date comparison | `{"created": {"gte": "2024-01-01T00:00:00Z"}}` |

## List Collections

```python
collections = pb.list_collections()
for col in collections:
    print(col["name"])
```
