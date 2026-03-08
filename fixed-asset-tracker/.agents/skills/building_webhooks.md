---
name: building-webhooks
description: Create webhook endpoints to receive events from external services. Events land in `lm_event_log` and can be processed by hooks or automations.
---

# Building Webhooks

Create webhook endpoints to receive events from external services. Events land in `lm_event_log` and can be processed by hooks or automations.

---

## How Webhooks Work

```
External Service → POST /webhooks/{company_id}/{external_id} → lm_event_log → Hook → Automation
```

Each endpoint has a public URL. Incoming JSON payloads are validated and stored as events.

## Create an Endpoint

```python
from lumera import webhooks

endpoint = webhooks.create(
    name="Stripe Events",
    external_id="stripe-events",
    description="Payment webhooks from Stripe"
)
url = webhooks.url("stripe-events")
# https://app.lumerahq.com/webhooks/{company_id}/stripe-events
```

### external_id Rules
- 3-50 chars, lowercase alphanumeric + hyphens
- Must start with a letter, no trailing hyphen or consecutive hyphens

### Manage Endpoints

```python
webhooks.list()                                       # List all
webhooks.get("stripe-events")                         # Get details
webhooks.update("stripe-events", description="...")   # Update
webhooks.delete("old-endpoint")                       # Delete
webhooks.url("stripe-events")                         # Public URL
```

## Public Webhook URL

External services send events to:

```
POST /webhooks/{company_id}/{external_id}
Content-Type: application/json
X-Idempotency-Key: optional-unique-key

{ ...any JSON payload... }
```

Response: `202 Accepted` with `{ event_id, status: "accepted" }`.

Constraints: max 1MB payload, must be valid JSON.

## Processing Events with Hooks

Create a hook on `lm_event_log` → `after_create`:

```javascript
async function main(ctx) {
  if (ctx.record.event_type !== 'webhook.received') return;
  if (ctx.record.source_identifier !== 'stripe-events') return;

  const payload = ctx.record.payload_snapshot.payload;

  if (payload.type === 'payment_intent.succeeded') {
    await ctx.dao.create('payments', {
      stripe_id: payload.data.object.id,
      amount: payload.data.object.amount,
      status: 'succeeded',
      external_id: `stripe:${payload.id}`
    });
  }
  ctx.log('processed', 'type', payload.type);
}
return main(ctx);
```

For complex processing, trigger an automation from the hook instead.

## Signature Verification

Most providers sign payloads. Verify in your hook using headers from `payload_snapshot.headers`:

```javascript
async function main(ctx) {
  if (ctx.record.source_identifier !== 'stripe-events') return;

  const snapshot = ctx.record.payload_snapshot;
  const sigHeader = snapshot.headers['Stripe-Signature'];
  if (!sigHeader) return ctx.log('missing signature');

  const settings = await ctx.dao.findFirst('lm_settings', { filter: { key: 'stripe_webhook_secret' } });
  const parts = {};
  sigHeader.split(',').forEach(p => { const [k, v] = p.split('='); parts[k] = v; });

  const signed = `${parts['t']}.${JSON.stringify(snapshot.payload)}`;
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', settings.value).update(signed).digest('hex');

  if (parts['v1'] !== expected) return ctx.log('invalid signature');
  // ... process verified payload ...
}
return main(ctx);
```

| Provider | Header | Algorithm |
|----------|--------|-----------|
| Stripe | `Stripe-Signature` | HMAC-SHA256 |
| Slack | `X-Slack-Signature` | HMAC-SHA256 |
| GitHub | `X-Hub-Signature-256` | HMAC-SHA256 |

## Guidelines

- Always filter by `source_identifier` in hooks to route events correctly
- Use derived `external_id` on created records (e.g., `stripe:{event_id}`) for idempotency
- Verify signatures before processing for providers that support it
- Keep hooks thin — trigger automations for complex logic
