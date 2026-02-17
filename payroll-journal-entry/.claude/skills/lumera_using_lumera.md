# Automating Business Processes in Lumera

Build event-driven automation pipelines using collections, hooks, and automations.

---

## Core Concepts

Lumera provides three building blocks for automation:

| Component | Purpose | Docs |
|-----------|---------|------|
| **Collections** | Store structured data (like database tables) | `lumera_collections.md` |
| **Hooks** | React to data changes (triggers) | `write_hooks.md` |
| **Automations** | Execute complex logic (Python scripts) | `lumera_automations.md` |

### How They Work Together

```
Data Change → Hook Fires → Automation Runs → Data Updated → Next Hook Fires → ...
```

This creates a reactive pipeline where each step automatically triggers the next.

---

## Architecture Pattern

### Event-Driven Pipeline

Instead of one monolithic script, break processing into discrete steps:

1. **Each step is an automation** - Focused, testable, reusable
2. **Hooks connect the steps** - Fire when data changes
3. **Collections store state** - Each step reads and writes data

**Benefits:**
- **Decoupled** - Steps are independent, easy to modify
- **Observable** - Each hook execution is logged
- **Reliable** - Server-side execution, not dependent on frontend
- **Replayable** - Re-run hooks for failed/missed records

---

## Example: Document Processing Pipeline

A typical document processing flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  documents (uploaded)                                           │
│       │                                                         │
│       │  HOOK: after_create, status='pending'                   │
│       ▼                                                         │
│  [Step 1: Extract] ─────────────────────────────────┐           │
│       │                                             │           │
│       │  Creates extracted_data record              │           │
│       ▼                                             │           │
│  extracted_data (created)                           │           │
│       │                                             │           │
│       │  HOOK: after_create                         │           │
│       ▼                                             │           │
│  [Step 2: Classify] ────────────────────────────────┤           │
│       │                                             │           │
│       │  Updates extracted_data with classification │           │
│       ▼                                             │           │
│  extracted_data (updated, status='classified')      │           │
│       │                                             │           │
│       │  HOOK: after_update, status='classified'    │           │
│       ▼                                             │           │
│  [Step 3: Match] ───────────────────────────────────┘           │
│       │                                                         │
│       │  Creates matches, updates statuses                      │
│       ▼                                                         │
│  matches (created)                                              │
│  target_records.status = 'ready_for_review'                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Each box is an automation. Each arrow is a hook.

---

## The Importance of `external_id`

**Always use `external_id` for stable references.**

### Why?

- **Platform IDs change** - If you delete and recreate an automation, its ID changes
- **Hooks break** - Any hook referencing the old ID stops working
- **`external_id` is stable** - You control it, it survives recreation

### Pattern

```
external_id: "my_app:step1_extract"
external_id: "my_app:step2_classify"
external_id: "my_app:step3_match"
```

**In hooks**, look up automations by `external_id` at runtime:
```javascript
const results = await ctx.dao.find('lm_automations', {
  filter: { external_id: 'my_app:step1_extract' },
  limit: 1
});
const automation = results[0];
// Use automation.id to trigger
```

This ensures hooks keep working even if automations are recreated.

---

## Testing Strategy

### Phase 1: Test Automations Directly

Before enabling hooks, test each automation in isolation:

1. **Prepare test data** - Create records in the relevant collections
2. **Run automation manually** - Use the Lumera UI or API
3. **Verify output** - Check that records were created/updated correctly
4. **Iterate** - Fix issues, re-run until working

### Phase 2: Test Hooks Individually

Deploy hooks in **disabled** state first:

1. **Deploy disabled** - `enabled: false` in hook config
2. **Review hook code** - Ensure conditions and filters are correct
3. **Enable one hook** - Test that it triggers correctly
4. **Verify chain** - Confirm the automation runs and produces expected output

### Phase 3: Enable Full Pipeline

Once individual components work:

1. **Enable all hooks** - Use deploy script with `--enable-all`
2. **Create test record** - Trigger the first step
3. **Watch the chain** - Each step should trigger the next
4. **Monitor execution logs** - Check `lm_hook_runs` for errors

### Debugging Tips

- **Check `lm_hook_runs`** - Every hook run is logged with status, errors, and timing
- **Check `lm_automation_runs`** - Every automation run is logged with inputs and outputs
- **Use `ctx.log()`** - Add logging in hooks for visibility

---

## Deployment Scripts

Create Python scripts to deploy automations and hooks idempotently:

### `deploy_automations.py`

- Reads automation code from local files
- Uses `external_id` for idempotent upsert
- Updates input schemas to match code parameters

### `deploy_hooks.py`

- Defines hook configurations (collection, event, script)
- Uses `external_id` for idempotent upsert
- Supports `--enable-all` and `--disable-all` flags

**Idempotent deployment** means you can run the script repeatedly without duplicating resources.

---

## Triggering Automations from Hooks

Hooks cannot call automations directly. Instead, create a run record:

```javascript
// In hook script
await ctx.dao.create('lm_automation_runs', {
  agent_id: automation.id,          // From external_id lookup
  company_id: ctx.metadata.company_id,
  owner_id: ctx.metadata.owner_id,
  inputs: JSON.stringify({ record_id: ctx.record.id }),
  status: 'queued',
  trigger: 'hook'
});
```

The Lumera executor picks up queued runs and executes them.

**Required metadata:**
```json
{
  "company_id": "your_company_id",
  "owner_id": "your_user_id",
  "automation_external_id": "my_app:step1_extract"
}
```

See `write_hooks.md` for complete examples.

---

## Common Patterns

### Condition Checks in Hooks

Only trigger on specific conditions:

```javascript
// Only process when status changes to 'pending'
if (ctx.record.get('status') !== 'pending') return;

// Prevent re-triggering on same file
const original = ctx.original;
if (original && original.get('file_key') === ctx.record.get('file_key')) return;
```

### Version Tracking

Track processing versions for iterating on logic:

- Add `processing_version` field to output collections
- Filter by version in queries and matching
- Allows A/B testing and rollback

### Upsert Pattern

Use `external_id` for idempotent record creation:

```python
external_id = f"{source_id}:{processing_version}"
existing = pb.search("results", filter={"external_id": external_id})
if existing["items"]:
    pb.update("results", existing["items"][0]["id"], data)
else:
    pb.create("results", {**data, "external_id": external_id})
```

---

## Quick Reference

| Task | See |
|------|-----|
| Create/query collections | `lumera_collections.md` |
| Write hook scripts | `write_hooks.md` |
| Deploy automations | `lumera_automations.md` |
| Use `ctx.dao` in hooks | `write_hooks.md` (Data Access section) |
| Debug hook failures | `lm_hook_runs` collection |
| Debug automation failures | `lm_automation_runs` collection |
| Deploy from CLI | `lumera --help` |

---

## Summary

1. **Break processing into steps** - Each step is an automation
2. **Connect steps with hooks** - Hooks fire on data changes
3. **Use `external_id` everywhere** - Stable references survive recreation
4. **Test bottom-up** - Automations first, then hooks, then full pipeline
5. **Deploy idempotently** - Scripts should be safe to run repeatedly
6. **Monitor execution logs** - `lm_hook_runs` and `lm_automation_runs`

---

## Lumera CLI

Use the Lumera CLI to deploy collections, automations, hooks, and apps from local files.

```bash
# Install in your project
pnpm dlx @lumerahq/cli init

# See all commands
lumera --help

# Common workflows
lumera apply                    # Deploy all resources
lumera apply collections/users  # Deploy single collection
lumera list                     # See resource status
lumera pull                     # Download remote state
lumera dev                      # Start dev server
```

Run `lumera --help` for the full command reference.
