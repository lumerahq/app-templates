# File Uploads and Downloads

Upload and download files using the `lumera_api` tool. Use presigned URLs for uploads, then confirm with the resource endpoint. Download files via `GET .../download-url?name=filename`. Supports sessions, agent runs, documents, and PocketBase files.

---

## Overview

The Lumera API uses presigned URLs for secure file uploads and downloads. The general workflow is:
1. Request a presigned upload/download URL from the API
2. Use the URL to upload (PUT) or download (GET) the file directly
3. For uploads, optionally confirm the upload with the resource

## Session Files

Sessions can have files attached for use in conversations.

### List session files
```
method: GET
path: /api/sessions/{session_id}/files
```

Returns an array of file metadata including `name`, `size`, `content_type`, and `created`.

### Upload a file to a session
```
method: POST
path: /api/sessions/{session_id}/files/upload-url
body: {
  "filename": "report.pdf",
  "content_type": "application/pdf",
  "size": 102400
}
```

Response:
```json
{
  "upload_url": "https://storage.example.com/presigned-upload-url",
  "object_key": "sessions/abc123/report.pdf",
  "expires_at": "2024-01-15T12:00:00Z"
}
```

After receiving the presigned URL, upload the file:
```
PUT {upload_url}
Content-Type: application/pdf
Body: <file contents>
```

### Download a session file
```
method: GET
path: /api/sessions/{session_id}/files/download-url?name=report.pdf
```

Response:
```json
{
  "download_url": "https://storage.example.com/presigned-download-url",
  "expires_at": "2024-01-15T12:00:00Z"
}
```

## Agent Run Files

Agent runs can have input and output files.

### List agent run files
```
method: GET
path: /api/agent-runs/{run_id}/files
```

### Upload a file to an agent run
```
method: POST
path: /api/agent-runs/{run_id}/files/upload-url
body: {
  "filename": "input.csv",
  "content_type": "text/csv",
  "size": 5000
}
```

### Download an agent run file
```
method: GET
path: /api/agent-runs/{run_id}/files/download-url?name=output.json
```

## Document Files

Documents are company-wide files with lifecycle management.

### Upload a document file
```
method: POST
path: /api/documents/{document_id}/upload-url
body: {
  "filename": "contract.pdf",
  "content_type": "application/pdf",
  "size": 250000
}
```

### Download a document file
```
method: GET
path: /api/documents/{document_id}/download-url
```

## PocketBase Collection Files

For files stored in PocketBase collection records.

### Upload to PocketBase
```
method: POST
path: /api/pb/uploads/presign
body: {
  "scope": "collection_files",
  "resource_id": "record_id_here",
  "filename": "image.png",
  "content_type": "image/png"
}
```

### Download from PocketBase
```
method: POST
path: /api/pb/uploads/download
body: {
  "object_key": "collections/my_collection/record_id/image.png"
}
```

## Generic Presigned Upload

For general-purpose uploads with custom scopes:
```
method: POST
path: /api/uploads/presign
body: {
  "scope": "session_files",
  "resource_id": "session_id_here",
  "filename": "data.json",
  "content_type": "application/json",
  "size": 1024
}
```

## Common Content Types

| Extension | Content Type |
|-----------|--------------|
| `.pdf` | `application/pdf` |
| `.json` | `application/json` |
| `.csv` | `text/csv` |
| `.txt` | `text/plain` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

## Guidelines

1. Always specify the correct `content_type` matching the file
2. Include `size` in bytes when known to enable upload validation
3. Presigned URLs expire (typically 15-60 minutes) - use them promptly
4. For large files, check size limits before uploading
5. Handle upload failures gracefully and retry if needed

## Example Workflow

1. **List existing files:**
   ```
   GET /api/sessions/sess_abc123/files
   ```

2. **Request upload URL:**
   ```
   POST /api/sessions/sess_abc123/files/upload-url
   {"filename": "data.csv", "content_type": "text/csv", "size": 2048}
   ```

3. **Upload the file** (client-side, using the presigned URL)

4. **Download a file:**
   ```
   GET /api/sessions/sess_abc123/files/download-url?name=data.csv
   ```
