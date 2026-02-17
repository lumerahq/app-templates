# Lumera Webhooks

Receive events from external services (Stripe, GitHub, Slack, etc.) via webhooks. Create endpoints with `webhooks.create()`, get the public URL with `webhooks.url()`, and process events from `lm_event_log`. Trigger automations via hooks on `lm_event_log.after_create`.

---

## Overview

Webhooks let external services push data into Lumera in real-time. Each webhook endpoint has a public URL that accepts POST requests, validates the JSON payload, and writes an event to `lm_event_log`. From there, hooks or automations process the data.

**Flow:**
```
External Service → POST /webhooks/{company_id}/{external_id} → lm_event_log → Hook → Automation/Record
```

## Key Concepts

| Concept              | Description                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| **Endpoint**         | A named receiver with a URL slug (`external_id`) stored in `lm_webhook_endpoints` |
| **Event**            | Each incoming webhook creates a `webhook.received` event in `lm_event_log`        |
| **Payload Snapshot** | The event stores the full request (payload, headers, source IP, timestamp)        |
| **Idempotency**      | `X-Idempotency-Key` header prevents duplicate processing                          |

## SDK Reference (Python)

### Import
```python
from lumera import webhooks
```

### Create an Endpoint
```python
endpoint = webhooks.create(
    name="Stripe Events",
    external_id="stripe-events",
    description="Receives Stripe payment webhooks"
)
```

### external_id Rules

The `external_id` is used as the URL slug:

- 3-50 characters
- Lowercase alphanumeric and hyphens only
- Must start with a letter
- Cannot end with hyphen or have consecutive hyphens

**Valid:** `stripe-events`, `github-webhooks`, `acme-orders-v2`
**Invalid:** `1-start`, `end-`, `double--hyphen`

### Get Public URL
```python
url = webhooks.url("stripe-events")
# Returns: https://app.lumerahq.com/webhooks/{company_id}/stripe-events
```

Use this URL when configuring webhooks in external services.

### List All Endpoints
```python
for ep in webhooks.list():
    print(ep["name"], ep["external_id"])
```

### Get Endpoint Details
```python
endpoint = webhooks.get("stripe-events")
```

### Update Endpoint
```python
webhooks.update("stripe-events", description="Updated description")
```

### Delete Endpoint
```python
webhooks.delete("old-endpoint")
```

## REST API Reference

For `lumera_api` tool users.

### Manage Endpoints (via REST API)
```
GET    /api/pb/collections/lm_webhook_endpoints/records
POST   /api/pb/collections/lm_webhook_endpoints/records
PATCH  /api/pb/collections/lm_webhook_endpoints/records/{id}
DELETE /api/pb/collections/lm_webhook_endpoints/records/{id}
```

### Create Endpoint
```
method: POST
path: /api/pb/collections/lm_webhook_endpoints/records
body: {
  "name": "Stripe Events",
  "external_id": "stripe-events",
  "description": "Payment webhooks from Stripe"
}
```

### Public Webhook URL (No Auth Required)
```
method: POST
path: /webhooks/{company_id}/{external_id}
headers:
  Content-Type: application/json
  X-Idempotency-Key: optional-unique-key
body: { ...any JSON payload... }
```

**Response (202 Accepted):**
```json
{
  "event_id": "uuid-generated-or-from-header",
  "status": "accepted"
}
```

**Constraints:**
- Max payload size: 1MB
- Must be valid JSON
- `X-Idempotency-Key` header enables deduplication

**Error Responses:**

| Status | Description                   |
| ------ | ----------------------------- |
| 400    | Invalid JSON payload          |
| 404    | Company or endpoint not found |
| 413    | Payload too large (>1MB)      |
| 500    | Internal error                |

## Event Structure

When a webhook arrives, Lumera creates an `lm_event_log` record:

| Field               | Value                                           |
| ------------------- | ----------------------------------------------- |
| `event_type`        | `webhook.received`                              |
| `event_id`          | From `X-Idempotency-Key` or auto-generated UUID |
| `source_identifier` | The endpoint's `external_id`                    |
| `triggered_at`      | UTC timestamp                                   |
| `payload_snapshot`  | Full request data (see below)                   |

### Payload Snapshot Structure
```json
{
  "payload": { ...original JSON body... },
  "headers": {
    "Content-Type": "application/json",
    "X-Stripe-Signature": "...",
    "X-Custom-Header": "..."
  },
  "source_ip": "203.0.113.42",
  "endpoint_id": "rec_abc123",
  "external_id": "stripe-events",
  "received_at": "2024-01-13T12:34:56.789Z"
}
```

**Note:** All `X-*` headers are captured except `Authorization`.

## Processing Webhook Events

Create a hook on `lm_event_log` → `after_create` to process incoming webhooks:

```javascript
async function main(ctx) {
  // Only process webhook events
  if (ctx.record.event_type !== 'webhook.received') return;

  // Filter by source endpoint
  if (ctx.record.source_identifier !== 'stripe-events') return;

  const snapshot = ctx.record.payload_snapshot;
  const payload = snapshot.payload;

  // Process based on event type
  if (payload.type === 'payment_intent.succeeded') {
    await ctx.dao.create('payments', {
      stripe_id: payload.data.object.id,
      amount: payload.data.object.amount,
      status: 'succeeded',
      external_id: `stripe:${payload.id}`,
      raw_event: JSON.stringify(payload)
    });
  }

  ctx.log('processed stripe event', 'type', payload.type);
}
return main(ctx);
```

For complex processing, trigger an automation from the hook instead. See `write_hooks.md` for the pattern.

## Example: Slack to Task Management

### Step 1: Create Webhook Endpoint
```python
from lumera import webhooks

endpoint = webhooks.create(
    name="Slack Commands",
    external_id="slack-commands",
    description="Receives /task slash commands from Slack"
)

print(f"Configure Slack with URL: {webhooks.url('slack-commands')}")
```

### Step 2: Create Processing Hook

**Collection:** `lm_event_log`
**Event:** `after_create`
**Script:**
```javascript
async function main(ctx) {
  if (ctx.record.event_type !== 'webhook.received') return;
  if (ctx.record.source_identifier !== 'slack-commands') return;

  const snapshot = ctx.record.payload_snapshot;
  const payload = snapshot.payload;

  const text = payload.text || '';
  const userId = payload.user_id;
  const channelId = payload.channel_id;

  if (!text.trim()) {
    ctx.log('empty task text, skipping');
    return;
  }

  await ctx.dao.create('tasks', {
    title: text.trim(),
    status: 'pending',
    slack_user: userId,
    slack_channel: channelId,
    external_id: `slack:${ctx.record.event_id}`
  });

  ctx.log('task created from slack', 'title', text.trim());
}
return main(ctx);
```

## Debugging

### View Webhook Events
```python
from lumera import pb

events = pb.list(
    "lm_event_log",
    filter={"event_type": "webhook.received"},
    sort="-triggered_at",
    per_page=20
)

for e in events:
    print(f"{e['triggered_at']}: {e['source_identifier']}")
```

## Signature Verification

Most webhook providers sign payloads for authenticity. Signatures are captured in `payload_snapshot.headers`. Verify in your hook before processing.

### Example: Stripe (HMAC-SHA256)

```javascript
async function main(ctx) {
  if (ctx.record.event_type !== 'webhook.received') return;
  if (ctx.record.source_identifier !== 'stripe-events') return;

  const snapshot = ctx.record.payload_snapshot;
  const sigHeader = snapshot.headers['Stripe-Signature'];
  if (!sigHeader) {
    ctx.log('missing stripe signature');
    return;
  }

  // Get secret from settings
  const settings = await ctx.dao.findFirst('lm_settings', {
    filter: { key: 'stripe_webhook_secret' }
  });
  if (!settings?.value) {
    ctx.log('stripe webhook secret not configured');
    return;
  }

  // Parse header: t=timestamp,v1=signature
  const parts = {};
  sigHeader.split(',').forEach(p => {
    const [k, v] = p.split('=');
    parts[k] = v;
  });

  // Verify HMAC-SHA256
  const signedPayload = `${parts['t']}.${JSON.stringify(snapshot.payload)}`;
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', settings.value)
    .update(signedPayload).digest('hex');

  if (parts['v1'] !== expected) {
    ctx.log('invalid stripe signature');
    return;
  }

  ctx.log('stripe signature verified');
  // ... process payload ...
}
return main(ctx);
```

### Other Providers

| Provider | Header | Algorithm | Data Format |
|----------|--------|-----------|-------------|
| Slack | `X-Slack-Signature` | HMAC-SHA256 | `v0:{timestamp}:{body}` |
| GitHub | `X-Hub-Signature-256` | HMAC-SHA256 | raw payload |
| Payhawk | `X-Payhawk-Signature` | RSA | `{timestamp}:{path}:{body}` |

Store secrets in `lm_settings` and follow each provider's documentation for exact signature format.

## Guidelines

1. **Filter by source_identifier** - Always check `source_identifier` in hooks to route events to the correct processor

2. **Use external_id for idempotency** - When creating records from webhooks, include a derived `external_id` (e.g., `stripe:{event_id}`) to prevent duplicates on replays

3. **Verify signatures** - For services that sign webhooks (Stripe, GitHub, Slack, Payhawk), verify the signature header in your hook before processing

4. **Implement replay protection** - Check timestamps in signature headers; reject requests older than 5 minutes

5. **Keep hooks thin** - For complex processing (AI calls, multiple API requests), trigger automations instead of doing everything in the hook

6. **Store raw events** - Keep the original payload in related records for audit trails and debugging
