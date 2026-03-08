---
name: building-automations
description: Create and manage Lumera automations — background Python scripts with the Lumera SDK. Define inputs with Pydantic or type hints, set schedules, and manage via `from lumera import automations`.
---

# Building Automations

Create and manage Lumera automations — background Python scripts with the Lumera SDK. Define inputs with Pydantic or type hints, set schedules, and manage via `from lumera import automations`.

---

## Create an Automation

```python
from lumera import automations

auto = automations.create(
    name="Process Invoices",
    description="Extract and classify uploaded invoices",
    external_id="my-app:process-invoices",
    code='''from lumera import pb

def main(status: str = "pending"):
    records = list(pb.iter_all("invoices", filter={"status": status}))
    return {"count": len(records)}
''',
    input_schema={
        "function": {
            "name": "main",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "default": "pending"}
                }
            }
        }
    }
)
```

## Defining Inputs

### Pydantic (Recommended)

```python
from pydantic import BaseModel, Field
from enum import Enum

class Priority(Enum):
    LOW = "low"
    HIGH = "high"

class Inputs(BaseModel):
    order_id: str = Field(..., description="Order to process")
    priority: Priority = Priority.LOW
    max_retries: int = Field(default=3, ge=1, le=10)

def main(inputs: Inputs):
    print(f"Processing {inputs.order_id}")
    return {"status": "done", "order_id": inputs.order_id}
```

Benefits: auto-validation, rich constraints (`ge`, `le`, `min_length`, `pattern`), clear error messages.

Generate `input_schema` from model: wrap `Inputs.model_json_schema()` in function format:
```json
{ "function": { "name": "main", "parameters": { ...model_json_schema()... } } }
```

### Type Hints (Simple)

```python
def main(order_id: str, priority: str = "low", notify: bool = False):
    return {"status": "done"}
```

With `input_schema`:
```json
{
  "function": {
    "name": "main",
    "parameters": {
      "type": "object",
      "properties": {
        "order_id": {"type": "string"},
        "priority": {"type": "string", "default": "low"},
        "notify": {"type": "boolean", "default": false}
      },
      "required": ["order_id"]
    }
  }
}
```

## Update / Delete / Upsert

```python
automations.update("abc123", name="New Name", code="...", input_schema={...})
automations.delete("abc123")

# Upsert by external_id (create if not found, update if exists)
automations.upsert(
    external_id="my-app:process-invoices",
    name="Process Invoices",
    code="...",
    input_schema={...}
)
```

## Schedules

```python
automations.update("abc123", schedule="0 9 * * *", schedule_tz="America/New_York")
```

Cron: `minute hour day month weekday` (e.g., `*/15 * * * *` = every 15 min).

## File Inputs

Use `LumeraFile` / `LumeraFiles` types to enable file picker UI:

```python
from pydantic import BaseModel, Field
from lumera import LumeraFile, LumeraFiles

class Inputs(BaseModel):
    report: LumeraFile = Field(..., description="Excel file to process")
    attachments: LumeraFiles = Field(default=[], description="Additional files")
```

At runtime these resolve to file paths. Read with `from lumera.sdk import open_file`.
