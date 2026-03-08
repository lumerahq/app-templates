---
name: building-hooks
description: Write JavaScript hooks on Lumera collection lifecycle events. Hooks run server-side on `before_create`, `after_update`, etc. Manage via `GET/POST/PATCH/DELETE /api/pb/hooks`.
---

# Building Hooks

Write JavaScript hooks on Lumera collection lifecycle events. Hooks run server-side on `before_create`, `after_update`, etc. Manage via `GET/POST/PATCH/DELETE /api/pb/hooks`.

---

## Hook Structure

```javascript
async function main(ctx) {
  if (ctx.record.status === 'pending') {
    ctx.record.status = 'approved';
  }
  ctx.log('processed', ctx.record.id);
}
return main(ctx);
```

## Triggers

| Trigger | When | Can abort? |
|---------|------|------------|
| `before_create` | Before insert | Yes (throw) |
| `after_create` | After insert | No |
| `before_update` | Before update | Yes (throw) |
| `after_update` | After update | No |
| `before_delete` | Before delete | Yes (throw) |
| `after_delete` | After delete | No |

## Context (`ctx`)

| Property | Description |
|----------|-------------|
| `ctx.record` | Current record (read/write in before_*, read in after_*) |
| `ctx.original` | Previous state (`null` on create) |
| `ctx.event` | Event string |
| `ctx.collection` | `{ id, name }` |
| `ctx.metadata` | Static config from hook's Metadata tab |
| `ctx.dao` | Data access for other collections |
| `ctx.user` | `{ id, name, email, apiName }` or `null` for system triggers |
| `ctx.company` | `{ id, apiName }` or `null` for system triggers |
| `ctx.log/warn/error` | Logging (captured in `lm_hook_runs`) |

> `ctx.metadata` is static config (API tokens, IDs), not request context. Use `ctx.user` / `ctx.company` for the current request.

## Data Access (`ctx.dao`)

```javascript
await ctx.dao.create('audit_log', { source_id: ctx.record.id, action: ctx.event });
await ctx.dao.update('items', recordId, { status: 'done' });
await ctx.dao.delete('items', recordId);

// Find returns array directly (not { items: [...] })
const results = await ctx.dao.find('items', { filter: { status: 'active' }, sort: '-created', limit: 10 });
```

**Transaction behavior:**
- `before_*`: DAO ops share the parent transaction — if hook throws, everything rolls back
- `after_*`: DAO ops are independent transactions

**Managed collections:** Hooks can only create `lm_automation_runs` among `lm_*` collections. All `lm_*` are readable.

## Triggering Automations

Hooks can't call automations directly. Create a queued run:

```javascript
async function main(ctx) {
  const [automation] = await ctx.dao.find('lm_automations', {
    filter: { external_id: ctx.metadata.automation_external_id }, limit: 1
  });
  if (!automation) return ctx.error('automation not found');

  await ctx.dao.create('lm_automation_runs', {
    automation_id: automation.id,
    company_id: ctx.company?.id || ctx.record.company_id,
    owner_id: ctx.user?.id || automation.owner_id,
    inputs: JSON.stringify({ record_id: ctx.record.id }),
    status: 'queued',
    trigger: 'hook'
  });
}
return main(ctx);
```

Set `automation_external_id` in hook metadata for stable references.

## Hook Management

Hooks are managed via the REST API. Use `pb.search()` to find existing hooks before creating new ones.

```python
from lumera import pb

# List hooks for a collection
hooks = pb.search("lm_hooks", filter={"collection_id": "abc123"})
```

Create/update hooks via API:
```
POST   /api/pb/hooks
PATCH  /api/pb/hooks/{id}
DELETE /api/pb/hooks/{id}
POST   /api/pb/hooks/compile             # Validate script
```

**Create/Update payload:**
```json
{
  "collection_id": "abc123",
  "event": "after_create",
  "name": "Process New Order",
  "script": "async function main(ctx) { ... } return main(ctx);",
  "enabled": true,
  "timeout_ms": 30000,
  "metadata": { "automation_external_id": "my-app:process-order" },
  "external_id": "my-app:order-hook"
}
```

## Field Types in Hooks

| Field Type | JS Type | Notes |
|------------|---------|-------|
| Text, Email, URL | `string` | |
| Number | `number` | |
| Bool | `boolean` | Use `=== true` |
| Select (multi) | `string[]` | |
| JSON | `object/array` | Nested access: `ctx.record.config?.theme` |
| Date | `string` | ISO format, parse with `new Date()` |
| LumeraFile | `object[]` | `{ object_key, original_name, size, content_type }` |

## Best Practices

- Always use the `async function main(ctx) { ... } return main(ctx);` pattern
- Use `ctx.log()` not `console.log`
- Store secrets in metadata, not in the script
- Throw in `before_*` to abort; log errors in `after_*`
- Use `external_id` for stable references to automations and hooks
- Keep hooks fast — delegate heavy work to automations
- No HTTP from hooks — use automations for external API calls
- Debug via `lm_hook_runs`: `pb.search("lm_hook_runs", filter={"hook_id": hook_id}, sort="-ran_at")`
