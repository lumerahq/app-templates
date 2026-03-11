# How to Use Lumera

Build event-driven automation pipelines using collections, hooks, and automations. Each step is an automation, hooks connect the steps, and collections store state.

---

## Core Pattern

```
Data Change → Hook Fires → Automation Runs → Data Updated → Next Hook → ...
```

| Component | Purpose |
|-----------|---------|
| **Collections** | Store structured data (like tables) |
| **Hooks** | React to data changes (JavaScript triggers) |
| **Automations** | Execute complex logic (Python in a sandbox) |

## Architecture Example

```
documents (uploaded)
    │  HOOK: after_create
    ▼
[Step 1: Extract] → extracted_data (created)
    │  HOOK: after_create
    ▼
[Step 2: Classify] → extracted_data (updated, status='classified')
    │  HOOK: after_update
    ▼
[Step 3: Match] → matches (created)
```

Each box is an automation. Each arrow is a hook. Steps are independent and testable.

## Use `external_id` Everywhere

Platform IDs change if you delete and recreate resources. `external_id` is stable — you control it.

```
external_id: "my-app:step1-extract"
external_id: "my-app:step2-classify"
```

In hooks, look up automations by `external_id` at runtime:
```javascript
const [automation] = await ctx.dao.find('lm_automations', {
  filter: { external_id: 'my-app:step1-extract' }, limit: 1
});
```

## Testing Strategy

1. **Test automations first** — run each in isolation with test data
2. **Test hooks individually** — deploy disabled (`enabled: false`), enable one at a time
3. **Enable full pipeline** — create a test record and watch the chain
4. **Debug**: check `lm_hook_runs` and `lm_automation_runs` for logs and errors

## Condition Checks in Hooks

```javascript
// Only trigger on specific status
if (ctx.record.status !== 'pending') return;

// Skip if field didn't change
if (ctx.original && ctx.original.file_key === ctx.record.file_key) return;
```

## Lumera CLI

Deploy resources from local files:

```bash
lumera plan           # Preview changes (inline diffs)
lumera apply          # Deploy all resources
lumera apply collections/users  # Deploy single resource
lumera list           # See resource status
lumera pull           # Download remote state
lumera dev            # Start dev server
```

## Idempotent Deployment

Use `external_id` on automations, hooks, and collections. Deploy scripts can run repeatedly without duplicating resources. Use `upsert` patterns for records:

```python
external_id = f"{source_id}:{version}"
pb.upsert("results", {"external_id": external_id, **data})
```

## Project Namespacing

All resources (collections, automations, hooks) are scoped to a project. The platform handles namespacing automatically:

- **Collections** are stored as `{project}__orders` but you always use bare names like `orders` in code, schemas, and CLI commands.
- **Automations and hooks** have a `project_id` field set automatically by `lumera apply`.
- **The Python SDK** reads `LUMERA_PROJECT_EXTERNAL_ID` from the environment and sends the project context header on every API call.
- **The CLI** reads the project name from `package.json` and sends it on every request.

**Never manually prefix collection names.** Two projects can each have `orders` — they are isolated at the database level. Pre-existing bare-named collections remain accessible for backward compatibility.
