---
name: using-automations
description: Find, run, and monitor automations. Use `from lumera import automations` to trigger runs, poll for results, and stream logs.
---

# Using Automations

Find, run, and monitor automations. Use `from lumera import automations` to trigger runs, poll for results, and stream logs.

---

## Find Automations

```python
from lumera import automations

# List all
for a in automations.list():
    print(a.name, a.id, a.external_id)

# Get by ID or external_id
auto = automations.get("abc123")
auto = automations.get_by_external_id("my-app:process-invoices")
print(auto.input_schema)  # Check required inputs before running
```

## Run an Automation

```python
run = automations.run("abc123", inputs={"invoice_id": "INV-001", "notify": True})

# Or by external_id (more stable)
run = automations.run_by_external_id("my-app:process-invoices", inputs={"invoice_id": "INV-001"})

print(run.id, run.status)  # run_xyz, queued
```

## Wait for Completion

```python
run = automations.run("abc123", inputs={"limit": 100})
run.wait(timeout=300)  # blocks until terminal status or timeout

if run.status == "succeeded":
    print(run.result)       # return value from the automation
    print(run.artifacts)    # output files created during execution
else:
    print(run.error)
```

## Poll Status

```python
run = automations.get_run("run_xyz")
print(run.status)   # queued, running, succeeded, failed, cancelled, timeout
print(run.result)   # available when succeeded
print(run.error)    # available when failed
```

## Stream Logs

```python
for entry in automations.stream_logs("run_xyz", timeout=60):
    print(entry.text)
```

## List Runs

```python
runs = automations.list_runs(automation_id="abc123", limit=20)
for r in runs:
    print(r.id, r.status, r.created)
```

## Run Statuses

| Status | Meaning |
|--------|---------|
| `queued` | Waiting for executor |
| `running` | In progress |
| `succeeded` | Done — check `result` |
| `failed` | Error — check `error` |
| `cancelled` | Manually cancelled |
| `timeout` | Exceeded time limit |
