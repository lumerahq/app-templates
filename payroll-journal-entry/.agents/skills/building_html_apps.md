---
name: building-html-apps
description: Build single-file HTML apps that query and modify Lumera collections. Use for quick visualizations, forms, reports, or tools without scaffolding a full React app.
---

# Building HTML Apps

Build single-file HTML apps that query and modify Lumera collections. Use for quick visualizations, forms, reports, or tools without scaffolding a full React app.

---

## How It Works

HTML files created with `create_artifact` render in a same-origin iframe. The parent page sends the API base URL via `postMessage`. API calls use the session cookie automatically — no token needed.

## Bridge Snippet

Include this in every HTML file that needs Lumera data:

```html
<script>
window.lumera = (() => {
  let _resolve;
  const _ready = new Promise(r => _resolve = r);
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'init') _resolve({ baseUrl: e.data.baseUrl || '' });
  });
  window.parent.postMessage({ type: 'bridge-ready' }, '*');

  async function _fetch(path, opts = {}) {
    const { baseUrl } = await _ready;
    const res = await fetch(`${baseUrl}${path}`, {
      ...opts, credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  return {
    ready: (fn) => _ready.then(() => fn(lumera)),
    sql: (query) => _fetch('/api/pb/sql', { method: 'POST', body: JSON.stringify({ query }) }),
    list: (collection, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return _fetch(`/api/pb/collections/${collection}/records${qs ? '?' + qs : ''}`);
    },
    create: (collection, data) =>
      _fetch(`/api/pb/collections/${collection}/records`, { method: 'POST', body: JSON.stringify(data) }),
    update: (collection, id, data) =>
      _fetch(`/api/pb/collections/${collection}/records/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (collection, id) =>
      _fetch(`/api/pb/collections/${collection}/records/${id}`, { method: 'DELETE' }),
  };
})();
</script>
```

## API Reference

| Method | Returns | Notes |
|--------|---------|-------|
| `lumera.ready(fn)` | Promise | Called once bridge is initialized |
| `lumera.sql(query)` | `{ rows }` | Read-only SQL |
| `lumera.list(collection, params?)` | `{ items, totalItems }` | `params`: filter, sort, perPage |
| `lumera.create(collection, data)` | record | Create a record |
| `lumera.update(collection, id, data)` | record | Partial update |
| `lumera.delete(collection, id)` | — | Delete a record |

## Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Expenses by Category</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; }
  </style>
</head>
<body>
  <h2>Expenses by Category</h2>
  <div id="loading">Loading…</div>
  <canvas id="chart" style="display:none"></canvas>

  <!-- Paste the bridge snippet here -->

  <script>
  lumera.ready(async () => {
    const { rows } = await lumera.sql(
      "SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC"
    );
    document.getElementById('loading').style.display = 'none';
    document.getElementById('chart').style.display = 'block';
    new Chart(document.getElementById('chart'), {
      type: 'doughnut',
      data: { labels: rows.map(r => r.category), datasets: [{ data: rows.map(r => r.total) }] },
    });
  });
  </script>
</body>
</html>
```

## Tips

- Always call `create_artifact` after writing the HTML file so it renders in chat
- Use CDN libraries (Chart.js, D3, Leaflet) — they work in single-file HTML
- `lumera.sql()` is read-only — use `create()`/`update()`/`delete()` for writes
- Wrap startup code in `lumera.ready()` to ensure the bridge is initialized
