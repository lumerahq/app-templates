# Write Hooks

Author Lumera collection hooks in JavaScript. Hooks run on lifecycle events (`before_create`, `after_update`, etc.). Manage via `GET/POST/PATCH/DELETE /api/pb/hooks`.

---

## Hook Structure

```javascript
async function main(ctx) {
  // Access record as plain object
  if (ctx.record.status === 'pending') {
    ctx.record.status = 'approved';
  }
  ctx.log('processed: ' + ctx.record.id);
}
return main(ctx);
```

## Hook Triggers

| Trigger | When | Can abort? |
|---------|------|------------|
| `before_create` | Before insert | Yes (throw) |
| `after_create` | After insert | No |
| `before_update` | Before update | Yes (throw) |
| `after_update` | After update | No |
| `before_delete` | Before delete | Yes (throw) |
| `after_delete` | After delete | No |

## Context Object (`ctx`)

| Property | Description |
|----------|-------------|
| `ctx.record` | Plain object - read/write fields directly: `ctx.record.name`, `ctx.record.status = 'done'` |
| `ctx.original` | Previous state (plain object): `null` on create, previous values on update, deleted record on delete |
| `ctx.event` | Event string (`after_create`, etc.) |
| `ctx.collection` | `{ id, name }` |
| `ctx.hook` | `{ id, name, version }` |
| `ctx.metadata` | **Static config** from the hook's Metadata tab (set at deploy time, same every run) |
| `ctx.env` | Environment vars (e.g., `ctx.env.LUMERA_API_TOKEN`) |
| `ctx.dao` | Data access for other collections |
| `ctx.user` | `{ id, name, email, apiName }` — the authenticated user who triggered the request, or `null` for webhook/system triggers |
| `ctx.company` | `{ id, apiName }` — the company from the request, or `null` for webhook/system triggers. Fallback: `ctx.record.company_id` |
| `ctx.log/warn/error` | Logging (captured in `lm_hook_runs.logs`) |

> **`ctx.metadata` is NOT the request context.** It is static JSON configured in the hook's Metadata tab (e.g., API tokens, external IDs). For the current user/company, use `ctx.user` and `ctx.company`. For chained hooks (triggered by `ctx.dao.create()`), `ctx.user` and `ctx.company` are inherited from the parent hook's request.

## Field Types

| Field Type | JS Type | Notes |
|------------|---------|-------|
| Text, Email, URL | `string` | |
| Number | `number` | |
| Bool | `boolean` | Use `=== true` / `=== false` |
| Select (single) | `string` | |
| Select (multi) | `string[]` | |
| JSON | `object` / `array` | Nested access works: `ctx.record.config.settings?.theme` |
| Date | `string` | ISO format, parse with `new Date(ctx.record.due_date)` |
| LumeraFile | `object[]` | Array of `{ object_key, original_name, size, content_type, uploaded_at }` |

## Runtime Helpers

### HTTP (`$http`)
```javascript
const res = await $http.send({
  url: 'https://api.example.com/notify',
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + ctx.metadata.api_token },
  body: JSON.stringify({ id: ctx.record.id })
});
if (res.statusCode >= 400) throw new Error('failed: ' + res.statusCode);
```

### Data Access (`ctx.dao`)
```javascript
// Create
await ctx.dao.create('audit_log', { source_id: ctx.record.id, action: ctx.event });

// Update
await ctx.dao.update('items', recordId, { status: 'processed' });

// Delete
await ctx.dao.delete('items', recordId);

// Find (returns array directly, not { items: [...] })
const results = await ctx.dao.find('items', {
  filter: { status: 'active' },  // or { created: { gt: '2024-01-01' } }
  sort: '-created',
  limit: 10
});
const first = results[0];  // Access first result directly
```

**Managed collection restrictions:** Hooks can only create `lm_automation_runs` among `lm_*` collections. All `lm_*` are readable.

**`lm_automation_runs` required fields** (unknown fields are rejected):

| Field | Required | Description |
|-------|----------|-------------|
| `automation_id` | Yes | ID of the automation to run |
| `company_id` | Yes | Tenant company ID |
| `owner_id` | Yes | User/membership ID |
| `status` | Yes | `queued`, `preparing`, `running`, `succeeded`, `failed`, `cancelled` |
| `inputs` | No | JSON string of input parameters |
| `trigger` | No | Grouping label (e.g., `hook`, `batch:123`) |
| `executor` | No | Executor type (e.g., `e2b`) |
| `executor_run_id` | No | Executor session ID |
| `external_id` | No | Idempotency key |
| `metadata` | No | JSON passthrough context (callback_url, trace, etc.) |

### Transaction Behavior

- **before_* hooks**: DAO operations run in the same transaction as the parent record. If the hook throws or the parent operation fails, DAO changes are rolled back.
- **after_* hooks**: The parent record is already committed. DAO operations are independent transactions.

Example: In a `before_create` hook, if you create a related record via `ctx.dao.create()` and then throw an error, both the parent and the related record are rolled back.

## Hook Management API

```
GET    /api/pb/hooks                    # List (filter: ?collection_id=, ?external_id=)
GET    /api/pb/hooks/{id}               # Get
POST   /api/pb/hooks                    # Create
PATCH  /api/pb/hooks/{id}               # Update
DELETE /api/pb/hooks/{id}               # Delete
POST   /api/pb/hooks/compile            # Validate script
```

### Create/Update payload
```json
{
  "collection_id": "abc123",
  "event": "after_create",
  "name": "My Hook",
  "script": "async function main(ctx) { ... } return main(ctx);",
  "enabled": true,
  "timeout_ms": 30000,
  "metadata": { "api_token": "secret" },
  "external_id": "deploy:my_hook:v1"
}
```

## Examples

### Validate before insert
```javascript
async function main(ctx) {
  if (!ctx.record.email) throw new Error('email required');
  if (!ctx.record.name?.trim()) throw new Error('name required');
}
return main(ctx);
```

### Sync to external API
```javascript
async function main(ctx) {
  const { api_url, api_token } = ctx.metadata || {};
  if (!api_url) throw new Error('missing api_url in metadata');

  await $http.send({
    url: api_url + '/webhook',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + api_token },
    body: JSON.stringify({ event: ctx.event, record: ctx.record })
  });
}
return main(ctx);
```

### Create related record
```javascript
async function main(ctx) {
  await ctx.dao.create('audit_log', {
    source_id: ctx.record.id,
    action: ctx.event,
    snapshot: JSON.stringify(ctx.record)
  });
}
return main(ctx);
```

### Trigger automation
```javascript
async function main(ctx) {
  const { automation_external_id } = ctx.metadata;
  const [automation] = await ctx.dao.find('lm_automations', {
    filter: { external_id: automation_external_id },
    limit: 1
  });
  if (!automation) return ctx.error('automation not found');

  await ctx.dao.create('lm_automation_runs', {
    automation_id: automation.id,
    company_id: ctx.company?.id || ctx.record.company_id,  // ctx.company null for webhooks
    owner_id: ctx.user?.id || automation.owner_id,         // ctx.user null for webhooks
    inputs: JSON.stringify({ record_id: ctx.record.id }),
    status: 'queued',
    trigger: 'hook'
  });
}
return main(ctx);
```

### Process webhook events (hook on lm_event_log)

Hooks on `lm_event_log` process incoming webhooks. Key fields in `ctx.record`:

| Field | Description |
|-------|-------------|
| `ctx.record.event_type` | `'webhook.received'` for webhooks |
| `ctx.record.source_identifier` | The endpoint's `external_id` |
| `ctx.record.company_id` | Company that owns the endpoint |
| `ctx.record.payload_snapshot.external_id` | Webhook endpoint external_id |
| `ctx.record.payload_snapshot.payload` | Actual webhook payload (e.g., Stripe event) |
| `ctx.record.payload_snapshot.headers` | Request headers (for signature verification) |

```javascript
async function main(ctx) {
  if (ctx.record.event_type !== 'webhook.received') return;
  if (ctx.record.source_identifier !== 'stripe-events') return;

  const payload = ctx.record.payload_snapshot.payload;

  // Trigger automation for complex processing
  const [automation] = await ctx.dao.find('lm_automations', {
    filter: { external_id: 'process-stripe-event' },
    limit: 1
  });
  if (!automation) return ctx.error('automation not found');

  await ctx.dao.create('lm_automation_runs', {
    automation_id: automation.id,
    company_id: ctx.record.company_id,        // Use record's company_id
    owner_id: automation.owner_id,            // Use automation's owner as fallback
    inputs: JSON.stringify({
      event_type: payload.type,
      event_data: payload.data
    }),
    status: 'queued',
    trigger: 'hook'
  });
}
return main(ctx);
```

## Debugging

Query `lm_hook_runs` for logs, errors, and side effects:
```
GET /api/pb/collections/lm_hook_runs/records?filter=hook_id='{id}'&sort=-ran_at
```

Key fields: `status`, `error_message`, `logs`, `side_effects`, `duration_ms`.

## Best Practices

1. Use `async function main(ctx) { ... } return main(ctx);` pattern
2. Use `ctx.log()` not `console.log`
3. Store secrets in metadata, not script
4. Throw in `before_*` to abort; log errors in `after_*`
5. Check `ctx.original` is not null before accessing (it's null on create)
6. Use `external_id` for stable automation references
