---
name: using-webhooks
description: Query webhook endpoints and events received from external services. Events land in `lm_event_log` and can be queried with the SDK.
---

# Using Webhooks

Query webhook endpoints and events received from external services. Events land in `lm_event_log` and can be queried with the SDK.

---

## List Endpoints

```python
from lumera import webhooks

for ep in webhooks.list():
    print(ep["name"], ep["external_id"])
    print(webhooks.url(ep["external_id"]))  # full public URL
```

## Query Webhook Events

Events are stored in `lm_event_log` with `event_type = 'webhook.received'`.

```python
from lumera import pb, query_sql

# Recent events for a specific endpoint
events = pb.search("lm_event_log",
    filter={"event_type": "webhook.received", "source_identifier": "stripe-events"},
    sort="-triggered_at", per_page=20)

for event in events["items"]:
    payload = event["payload_snapshot"]["payload"]
    print(event["event_id"], event["triggered_at"], payload)
```

```python
# SQL for aggregates
result = query_sql("""
    SELECT source_identifier, COUNT(*) as cnt
    FROM lm_event_log
    WHERE event_type = 'webhook.received'
    GROUP BY source_identifier
""")
```

## Event Structure

| Field | Value |
|-------|-------|
| `event_type` | `webhook.received` |
| `event_id` | From `X-Idempotency-Key` header or auto-generated UUID |
| `source_identifier` | The endpoint's `external_id` |
| `triggered_at` | UTC timestamp |
| `payload_snapshot` | `{ payload, headers, source_ip, external_id, received_at }` |
