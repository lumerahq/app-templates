# Lumera Automations

Create, run, and manage Lumera automations (background Python scripts). Create automations with `POST /api/automations`. Run them with `POST /api/automation-runs`. Monitor via `GET /api/automation-runs/{id}` or stream logs with `GET /api/automation-runs/{id}/logs/live`.

---

## Overview

Automations are background jobs defined in `lm_automations`. Each automation has Python code, an input schema, and can run on-demand or on a schedule. Runs are tracked in `lm_automation_runs`.

## Key Concepts

- **Automation**: A definition with `name`, `code`, `description`, `input_schema`, `schedule`, `schedule_preset_id`
- **Run**: A single execution instance with `status`, `inputs`, `result`, `error`, timestamps
- **Preset**: Saved input payloads for quick re-runs stored in `lm_automation_presets`
- **Trigger**: How the run was initiated (`manual`, `webhook`, `schedule`, `assistant`)

## Run Statuses

| Status | Description |
|--------|-------------|
| `queued` | Run created, waiting for executor |
| `running` | Execution in progress |
| `succeeded` | Completed successfully |
| `failed` | Completed with error |
| `cancelled` | Manually cancelled |
| `timeout` | Exceeded time limit |

## API Reference

### List Automations
```
GET /api/automations?limit=50&offset=0&sort=created&dir=desc&q=search
```
Returns `{ total, automations[] }`. Use `q` for case-insensitive name/description search.

### Get Automation Details
```
GET /api/automations/{id}
```
Returns full automation including `code`, `input_schema`, `schedule`, `last_run_status`.

### Create Automation
```
POST /api/automations
Content-Type: application/json

{
  "name": "My Automation",
  "description": "Optional description of what this automation does",
  "code": "from lumera import sdk\n\ndef main(param1: str):\n    print(f'Hello {param1}!')\n    return {'status': 'done'}",
  "input_schema": {
    "function": {
      "name": "main",
      "parameters": {
        "type": "object",
        "properties": {
          "param1": {"type": "string", "description": "A greeting name"}
        },
        "required": ["param1"]
      }
    }
  }
}
```
- `name` (required): Display name for the automation
- `description` (optional): Human-readable description
- `code` (required): Python code with the entrypoint function
- `input_schema` (required): Defines the entrypoint function and its parameters:
  - `function.name`: Name of the Python function to call (e.g., `"main"`)
  - `function.parameters`: JSON Schema for the function's kwargs
- Returns the created automation with `id`

## Defining Automation Inputs

There are two approaches for defining automation inputs:

### Approach 1: Pydantic Models (Recommended)

Use Pydantic for type-safe inputs with built-in validation:

```python
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ProcessOrderInputs(BaseModel):
    """Input model for order processing."""
    order_id: str = Field(..., description="The order ID to process")
    priority: Priority = Priority.MEDIUM
    notify_customer: bool = False
    max_retries: int = Field(default=3, ge=1, le=10)

def main(inputs: ProcessOrderInputs):
    print(f"Processing {inputs.order_id} with priority {inputs.priority.value}")
    if inputs.notify_customer:
        # send notification
        pass
    return {"status": "processed", "order_id": inputs.order_id}
```

**Benefits:**
- Type validation happens automatically before your code runs
- Rich constraints: `ge`, `le`, `min_length`, `max_length`, `pattern`, etc.
- Clear error messages on invalid inputs
- IDE autocomplete on `inputs.field`
- Single source of truth (no separate `input_schema` needed)

**Setting `input_schema` for Pydantic automations:**
Generate schema from model: `ProcessOrderInputs.model_json_schema()` and wrap in function format:
```json
{
  "type": "function",
  "function": {
    "name": "main",
    "parameters": { ...schema from model_json_schema()... }
  }
}
```

### Approach 2: Type Hints with JSON Schema (Legacy)

Define inputs as function parameters with type hints, plus an `input_schema`:

```python
def main(order_id: str, priority: str = "medium", notify: bool = False):
    print(f"Processing {order_id}")
    return {"status": "done"}
```

With corresponding `input_schema`:
```json
{
  "function": {
    "name": "main",
    "parameters": {
      "type": "object",
      "properties": {
        "order_id": {"type": "string", "description": "Order ID"},
        "priority": {"type": "string", "default": "medium"},
        "notify": {"type": "boolean", "default": false}
      },
      "required": ["order_id"]
    }
  }
}
```

Type coercion handles common conversions (strings to int/bool/float, ISO strings to datetime).

### Update Automation
```
PATCH /api/automations/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "code": "# updated code",
  "description": "Updated description"
}
```
Updatable fields: `name`, `description`, `code`, `input_schema`, `schedule`, `schedule_tz`, `schedule_preset_id`

### Delete Automation
```
DELETE /api/automations/{id}
```
Permanently deletes the automation. Returns 204 on success.

### Clone Automation
```
POST /api/automations/{id}/clone
```
Creates a copy of the automation with "(Copy)" appended to the name. Schedule is cleared on clones.

### Start a Run
```
POST /api/automation-runs
Content-Type: application/json

{
  "automation_id": "abc123",
  "inputs": "{\"key\": \"value\"}",
  "trigger": "manual",
  "external_id": "optional-correlation-id"
}
```
- `inputs` must be a JSON string (not object)
- Returns the created run with `id` and initial `status: queued`

### Check Run Status
```
GET /api/automation-runs/{id}
```
Returns run with current `status`, `started_at`, `finished_at`, `result`, `error`.

### List Runs
```
GET /api/automation-runs?automation_id=abc123&limit=100&sort=created&dir=desc
```
Filter by `automation_id` or `automation_ids` (comma-separated). Returns `{ data[], total, limit, offset }`.

### Stream Live Logs
```
GET /api/automation-runs/{id}/logs/live
Accept: text/event-stream
```
Server-sent events for real-time log streaming. Query parameter `offset` to resume from byte position.

**Event types:**
- `status` - status updates with `status`, `error`, `finished_at`, `log_pointer`
- `chunk` - log data with `offset` (int) and `data` (base64-encoded content)
- `complete` - signals run finished, includes final `status` and `log_pointer`

### Get Archived Logs
When a run completes, logs are archived to S3. Access via `log_pointer` in the run response:
```json
{
  "log_pointer": {
    "bucket": "bucket-name",
    "key": "automation_runs/{run_id}/run.log",
    "size": 123456,
    "stored_at": "2026-01-11T12:00:00Z",
    "content_type": "application/x-ndjson",
    "truncated": false
  }
}
```
- `truncated: true` indicates logs exceeded 50MB limit
- Download via: `GET /api/automation-runs/{id}/files/download-url?name=run.log`

### Cancel a Run
```
POST /api/automation-runs/{id}/cancel
```
Attempts to cancel a running job. Returns the updated run (may already be terminal).

## Working with Files

Automations can upload files during execution. Files are stored in S3 under `automation_runs/{run_id}/`.

### Generate Upload URL (for executors)
```
POST /api/automation-runs/{id}/files/upload-url
{ "filename": "output.csv", "content_type": "text/csv" }
```
Returns presigned upload URL, download URL, local_path, object_name, expires_at.

### List Run Files
```
GET /api/automation-runs/{id}/files
```
Returns:
```json
{
  "files": [
    {
      "name": "output.csv",
      "local_path": "/lumera-files/automation_runs/{runID}/output.csv",
      "size": 1024,
      "content_type": "text/csv",
      "created": "2026-01-11T12:00:00Z"
    }
  ]
}
```

### Download File
```
GET /api/automation-runs/{id}/files/download-url?name=output.csv
```
Returns presigned download URL with expiration.

## Run Response Structure

```json
{
  "id": "run_id",
  "automation_id": "automation_id",
  "inputs": "{}",
  "status": "succeeded",
  "error": "error message if failed",
  "trigger": "manual",
  "result": { },
  "log_pointer": { },
  "artifacts": [ ],
  "external_id": "optional-correlation-id",
  "created": "2026-01-11T12:00:00Z",
  "started_at": "2026-01-11T12:00:01Z",
  "finished_at": "2026-01-11T12:00:05Z"
}
```

**Key fields:**
- `result` - Executor-defined JSON object (max 20KB). Contains return value from automation.
- `error` - Error message string when `status` is `failed`
- `log_pointer` - S3 location of archived logs (populated after completion)
- `artifacts` - Array of output files created during execution:
  ```json
  {
    "type": "file",
    "name": "export.csv",
    "object": "automation_runs/{run_id}/export.csv",
    "size_bytes": 1024,
    "content_type": "text/csv"
  }
  ```

## Working with Presets

Presets store reusable input configurations:

```
GET /api/automations/{id}/presets
POST /api/automations/{id}/presets  { "name": "Daily Report", "inputs": {...} }
PATCH /api/automation-presets/{id}  { "name": "...", "inputs": {...} }
DELETE /api/automation-presets/{id}
```

### Linking a Preset to a Schedule

To specify which inputs a scheduled run should use, set `schedule_preset_id` on the automation:

```
PATCH /api/automations/{id}
{
  "schedule": "0 9 * * *",
  "schedule_tz": "America/New_York",
  "schedule_preset_id": "preset_abc123"
}
```

**How scheduled runs resolve inputs:**
1. If `schedule_preset_id` is set → uses that preset's `inputs`
2. Else → falls back to `default` values from `input_schema`
3. If neither → empty inputs `{}`

**Notes:**
- A preset cannot be deleted while referenced by `schedule_preset_id`
- The preset must belong to the same automation
- To clear the preset link, set `schedule_preset_id` to `null` or `""`

**Valid timezones:**
`UTC`, `America/New_York`, `America/Chicago`, `America/Denver`, `America/Phoenix`, `America/Los_Angeles`, `America/Anchorage`, `Pacific/Honolulu`, `Asia/Kolkata`

**Cron format:** 5 fields - `minute hour day month weekday`
- `*` = every value
- `*/n` = every n units (e.g., `*/15` = every 15 minutes)
- `a,b,c` = specific values (e.g., `1,15,30`)
- Ranges: minute (0-59), hour (0-23), day (1-31), month (1-12), weekday (0-6, 0=Sunday)

## Example Workflow

1. **Find the automation:**
   ```
   GET /api/automations?q=invoice
   ```

2. **Check input schema** from the automation's `input_schema` field

3. **Start a run:**
   ```
   POST /api/automation-runs
   { "automation_id": "...", "inputs": "{\"invoice_id\": \"INV-001\"}" }
   ```

4. **Monitor progress:**
   ```
   GET /api/automation-runs/{run_id}
   ```
   Or stream logs: `GET /api/automation-runs/{run_id}/logs/live`

5. **Check results** in the `result` field once `status` is `succeeded`

## Best Practices

- Always validate inputs against `input_schema` before starting a run
- Use `external_id` for correlation with external systems
- Poll status every 2-5 seconds for short jobs, use SSE logs for long-running jobs
- Check `error` field when status is `failed` for diagnostics
- Use presets for frequently-used input combinations
- Access `result` field for automation return values after `status` is `succeeded`
- Use `log_pointer` to download complete logs after run finishes
- List files via `/files` endpoint to see all outputs created during execution
