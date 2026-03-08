---
name: building-agents
description: Create and manage AI-powered chat agents with custom system prompts, skills, tool policies, and session management. Agents run in isolated sandboxes with built-in tools.
---

# Building Agents

Create and manage AI-powered chat agents with custom system prompts, skills, tool policies, and session management. Agents run in isolated sandboxes with built-in tools.

---

## Agent Concepts

- **Agent**: Definition with `name`, `system_prompt`, `skill_ids`, `model`, optional `policy_script`
- **Session**: Conversation context with message history (max 10 per agent)
- **Skill**: Reusable instruction set that extends agent capabilities
- **Tools**: Built-in: `read`, `bash`, `lumera_api` (platform API), `create_artifact` (file previews), `web_search`
- **Policy**: JavaScript guardrail that runs before every API call

## Local File Format

```
platform/agents/{agent_name}/
  config.json          # Agent metadata
  system_prompt.md     # System prompt (markdown)
  policy.js            # Optional policy guardrail
```

**config.json:**
```json
{
  "external_id": "my-app:support-agent",
  "name": "Support Agent",
  "description": "Handles customer support queries",
  "skills": ["using-collections", "using-integrations"],
  "policy_enabled": true
}
```

## CLI Commands

```bash
lumera plan agents                           # Preview changes (inline diffs)
lumera diff agents/support_agent             # Full diff local vs remote
lumera apply agents                          # Deploy all agents
lumera apply agents/support_agent            # Deploy single agent
lumera list agents                           # List with sync status
lumera run agents/support_agent "message"    # Test agent
lumera destroy agents/support_agent          # Delete from platform
```

## REST API

**List:** `GET /api/agents?q=search&limit=50`
**Get:** `GET /api/agents/{id}` (returns agent with expanded skills)
**Create:**
```
POST /api/agents
{
  "name": "Support Agent",
  "system_prompt": "You are a helpful support agent...",
  "description": "Handles customer queries",
  "skill_ids": ["skill_id_1", "skill_id_2"],
  "external_id": "my-app:support-agent",
  "model": "openai/gpt-5.3-codex",
  "policy_script": "if (ctx.method !== 'GET') throw new Error('read-only');",
  "policy_enabled": true
}
```

If `skill_ids` is omitted, default platform skills are auto-assigned. Pass `[]` for no skills.

**Update:** `PATCH /api/agents/{id}` — updatable: `name`, `description`, `system_prompt`, `skill_ids`, `external_id`, `model`, `policy_script`, `policy_enabled`
**Delete:** `DELETE /api/agents/{id}`

## Assigning Skills

When creating an agent, assign skills that match its purpose:

1. **List all available skills:** `pb.search("lm_agent_skills")` or `GET /api/lm_agent_skills`
2. **Default skills** (auto-assigned if `skill_ids` omitted): `using-collections`, `using-automations`, `using-lumera-files`
3. **Add managed skills** based on purpose — e.g., `using-integrations` for a Slack bot or API integration, `building-html-apps` for a reporting agent
4. **Include relevant user-defined skills** — tenants may have custom skills with domain knowledge (e.g., "company accounting rules", "vendor classification"). Match by name and summary relevance.
5. Pass the complete `skill_ids` array in the create/update call

## Invoke & Chat

**Synchronous invoke:**
```
POST /api/agents/{id}/invoke
{ "message": "What's our return policy?", "session_id": "optional-session" }
```

Returns `{ output, tool_calls[], usage, session_id, success }`.

**Invoke with file attachments:**
```python
from lumera import agents
result = agents.invoke("classifier", "Classify this invoice", files=["invoice.pdf", "receipt.png"])
print(result.output)
```

Files are uploaded to S3, synced to the agent sandbox at `/workspace/uploads/`, and referenced in the message. The agent can read them with the `read` tool or process them via `bash`.

**Upload file (UI / multipart):**
```
POST /api/agents/{id}/upload?session_id=default
Content-Type: multipart/form-data
```
Returns `{ filename, path, size, content_type }`. File is synced to `/workspace/uploads/{filename}`.

**Streaming chat:**
```
POST /api/agents/{id}/chat
{ "message": "Hello", "session_id": "my-session" }
```

NDJSON stream: `text_delta`, `tool_start`, `tool_end`, `usage`, `done`, `error`.

**History:** `GET /api/agents/{id}/history?session_id=my-session`

## Sessions

**Sessions are expensive to create.** Each new session loads up the system prompt, skills, and tools from scratch. If you want to preserve context across invocations, use the same session. More often than not, you want to reuse an existing session.

- If you omit `session_id` from `/invoke` or `/chat`, the **`default` session** is used automatically — this is the recommended approach.
- Only use a different `session_id` when you genuinely need isolated conversation contexts (e.g., per-customer threads, parallel workflows).
- **Be careful about creating many sessions** — it can blow up cost quickly since each one pays the full startup overhead.

**Good — reuse default session:**
```python
# All calls share the same session — context is preserved, no extra overhead
agents.invoke("support-agent", "What's the status of order 123?")
agents.invoke("support-agent", "And order 456?")
agents.invoke("support-agent", "Summarize both")
```

**Bad — accidentally creating many sessions:**
```python
# DON'T: each unique session_id pays the full startup cost
for order in orders:
    agents.invoke("support-agent", f"Process {order}", session_id=f"order-{order.id}")
```

```
GET    /api/agents/{id}/sessions                    # List
POST   /api/agents/{id}/sessions  { "name": "..." } # Create (max 10)
PATCH  /api/agents/{id}/sessions/{sid}               # Rename
DELETE /api/agents/{id}/sessions/{sid}               # Delete (not "default")
```

## Skills API

```
GET    /api/lm_agent_skills?q=search              # List all skills
POST   /api/lm_agent_skills                        # Create custom skill
PATCH  /api/lm_agent_skills/{id}                   # Update (slug immutable)
DELETE /api/lm_agent_skills/{id}                   # Delete
```

Create payload: `{ "name", "slug", "summary", "instructions" }`.

## Policies

JavaScript guardrails that run before every `lumera_api` call. Throw to block.

**Context:**
| Property | Description |
|----------|-------------|
| `ctx.method` | HTTP method |
| `ctx.path` | API path |
| `ctx.body` | Parsed JSON body (writes only) |
| `ctx.collection` | Collection name from path |
| `ctx.session` | Counters: `reads`, `writes`, `updates`, `deletes`, `total`, `collections_read[]`, `collections_written[]` |
| `ctx.dao` | Read-only: `findOne(collection, id)`, `find(collection, filter, limit)` |

**Examples:**

```javascript
// Read-only agent
if (ctx.method !== "GET") throw new Error("read-only agent");
```

```javascript
// Restrict writable collections + quota
export default function policy(ctx) {
  const writable = ["encodings", "audit_log"];
  if (ctx.method !== "GET" && ctx.collection && !writable.includes(ctx.collection))
    throw new Error("write denied: " + ctx.collection);
  if (ctx.session.writes >= 50)
    throw new Error("write quota exceeded");
}
```

```javascript
// Validate data before write
if (ctx.method === "POST" && ctx.collection === "encodings") {
  const ba = ctx.dao.findOne("bank_activity", ctx.body.bank_activity_id);
  if (Math.abs(ctx.body.amount) > Math.abs(ba.amount))
    throw new Error("amount exceeds bank activity");
}
```

Toggle with `policy_enabled: true/false`. State stored in `lm_agent_policy_state`.

## Best Practices

- Keep system prompts focused — one agent per domain/task
- Use skills to share capabilities across agents
- Use `external_id` for stable references (not internal IDs)
- **Reuse the default session** — omit `session_id` unless you need isolation
- Add policies to production agents — restrict collections and set write quotas
- Test with `lumera run` before building frontend integrations
- Store prompts in `system_prompt.md` and policies in `policy.js` for readable diffs
