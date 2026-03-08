---
name: using-lumera-files
description: Upload and download files attached to collection records. Use `upload_lumera_file` to attach files to records and `storage` for run-scoped files in automations.
---

# Using Lumera Files

Upload and download files attached to collection records. Use `upload_lumera_file` to attach files to records and `storage` for run-scoped files in automations.

---

## Attach Files to Records

```python
from lumera import upload_lumera_file, pb

# Upload and get file descriptor
descriptor = upload_lumera_file("invoices", "document", "/tmp/report.pdf")

# Create record with file attached
record = pb.create("invoices", {"title": "Q4 Report", "document": descriptor})

# Update existing record with new file
pb.update("invoices", record_id, {"document": descriptor})
```

## Download Files from Records

```python
from lumera import storage, pb

record = pb.get("invoices", record_id)
content = storage.download(record["document"]["object_key"])       # raw bytes
url = storage.get_download_url(record["document"]["object_key"])   # presigned URL
```

## Automation Storage (Run-Scoped Files)

Files uploaded via `storage` in automations are namespaced to the current run:

```python
from lumera import storage

result = storage.upload("exports/report.csv", csv_bytes, content_type="text/csv")
print(result["url"])  # presigned download URL

result = storage.upload_file("exports/data.xlsx", "/tmp/generated.xlsx")
files = storage.list_files()  # list files in this run
```

## Common Content Types

| Extension | Content Type |
|-----------|--------------|
| `.pdf` | `application/pdf` |
| `.csv` | `text/csv` |
| `.json` | `application/json` |
| `.png` | `image/png` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

## Key Points

- Presigned upload URLs expire in 15 minutes, download URLs in 1 hour
- Always store the full file descriptor in records (not just `object_key`)
- Files are auto-deleted from storage when removed from all records
- Multiple records can share the same uploaded file
