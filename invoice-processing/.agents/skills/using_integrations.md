---
name: using-integrations
description: Connect to third-party services from automations. Use `get_credentials()` for any provider, or dedicated helpers for Slack.
---

# Using Integrations

Connect to third-party services from automations. Use `get_credentials()` for any provider, or dedicated helpers for Slack.

---

## Any Provider — Generic Credentials

Works with every connected integration (OAuth or custom API key).

```python
from lumera import get_credentials

creds = get_credentials("my_provider")
resp = requests.get(url, headers=creds.as_header_dict())
```

The `Credentials` object has: `type` (`"bearer_token"`, `"basic_auth"`), `token`, `header_name`, `header_value`, `username` (basic auth only), `expires_at`.

## API Proxy

Proxy requests through Lumera to provider APIs — Lumera handles auth and token refresh.

```
POST /api/connections/api_proxy
{
  "provider": "netsuite",
  "method": "GET",
  "url": "https://1234.suitetalk.api.netsuite.com/rest/v1/record/invoice",
  "headers": {"Accept": "application/json"},
  "body": {}
}
```

Supported providers: `google` (*.googleapis.com), `slack` (api.slack.com), `netsuite` (*.suitetalk.api.netsuite.com), `xero` (api.xero.com), `sharefile` (*.sf-api.com), `hubspot` (api.hubapi.com), `plaid` (*.plaid.com).

## Custom API Key Integrations

Users can add their own integrations for any service via the Integrations page (bearer token or basic auth). Then use `get_credentials()`:

```python
creds = get_credentials("my_erp")
resp = requests.get("https://api.myerp.com/invoices", headers=creds.as_header_dict())
```

## Slack

```python
from lumera.integrations import slack

slack.send_message("#general", "Hello from Lumera!")
slack.reply_in_thread("#general", thread_ts, "Got it!")
slack.add_reaction(channel_id, message_ts, "white_check_mark")
slack.upload_file("#general", file_path="/tmp/report.csv")
history = slack.get_channel_history("#general", limit=50)

# Direct WebClient for advanced calls
client = slack.get_client()
client.conversations_list(types="public_channel")
```

### Slack Messages Collection

Incoming Slack messages automatically land in the **`slack_messages`** collection. Attach hooks to auto-process them.

Fields: `team_id`, `channel_id`, `channel_name`, `user_id`, `user_name`, `message_ts`, `thread_ts`, `text`, `raw_payload`, `files`, `external_id` (format: `{team}:{channel}:{ts}`).

**Process and reply pattern:**
```python
from lumera import pb
from lumera.integrations import slack

def main(message_external_id: str):
    result = pb.search("slack_messages", filter={"external_id": message_external_id}, per_page=1)
    msg = result["items"][0]
    thread_ts = msg.get("thread_ts") or msg["message_ts"]
    slack.reply_in_thread(msg["channel_id"], thread_ts, "Processing...")
    # ... do work ...
    slack.reply_in_thread(msg["channel_id"], thread_ts, "Done!")
    slack.add_reaction(msg["channel_id"], msg["message_ts"], "white_check_mark")
```

## Inbound Data Collections

External events automatically land in platform collections — query and hook into them instead of creating new tables.

| Source | Collection | Key fields |
|--------|-----------|------------|
| Slack messages | `slack_messages` | `channel_id`, `user_name`, `text`, `message_ts`, `thread_ts`, `files` |
| Inbound email | `lm_mailbox_messages` | `mailbox_id`, `from_address`, `subject`, `body_plain`, `body_html`, `received_at`, `attachment_files` |
| Webhook events | `lm_event_log` | `event_type`, `event_id`, `triggered_at`, `payload_snapshot` |

All are hookable — attach `after_create` hooks to trigger automations when new data arrives.

## Prerequisites

- Integration must be connected on the Lumera Integrations page (OAuth flow or custom API key)
- Slack bot token scopes: `chat:write`, `files:write`, `reactions:write`, `channels:history` as needed
