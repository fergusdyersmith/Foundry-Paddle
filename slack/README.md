# Slack: where phone messages land

When the Bland receptionist takes a message, `server/notify.js` posts it to a Slack
incoming webhook. This directory holds the app definition so the setup is reproducible
rather than remembered.

## Why the dashboard and not the Slack CLI

The Slack CLI (`slack login`) only authenticates against workspaces eligible for the
next-generation Slack platform, which free workspaces are not:

> This workspace is not eligible for the next generation Slack platform.

Since `slack api` also needs that login, the whole CLI path is closed on a free plan.
The classic app dashboard works fine and takes about five minutes. The CLI is installed
at `~/.local/bin/slack` and is harmless to leave there, but it cannot do this job.

## Setup

1. Create the channel first, so it can be picked during install. **`#front-desk`.**

2. Go to <https://api.slack.com/apps> → **Create New App** → **From an app manifest** →
   choose the workspace → paste `front-desk-manifest.json` → **Create**.

3. Left sidebar → **Incoming Webhooks** → toggle **Activate Incoming Webhooks** on →
   **Add New Webhook to Workspace** → choose `#front-desk` → **Allow**.

4. Copy the webhook URL (`https://hooks.slack.com/services/T…/B…/…`) and set it on
   Railway as `SLACK_WEBHOOK_URL`.

5. **Set the channel's mobile notifications to "All messages."** Slack defaults to
   mentions only, which would leave phone messages sitting there silently while callers
   wait for a callback that never comes. This is the highest-risk step in the setup and
   the only one no code can enforce.

## Scopes, and why two

`incoming-webhook` is what `notify.js` posts to today: a plain JSON POST to a URL, no
token handling, and the channel is fixed at install time so a bug cannot spray messages
across the workspace.

`chat:write` is requested at the same time purely so that adding threaded replies,
reactions or message edits later does not require reinstalling the app and re-approving
scopes. Nothing uses it yet.

## Checking it works

With `SLACK_WEBHOOK_URL` set:

```sh
railway run env PORT=4128 VOICE_TOOL_SECRET=… node server.js
curl -X POST http://127.0.0.1:4128/api/voice/message \
  -H "authorization: Bearer …" -H "content-type: application/json" \
  -d '{"name":"Test Caller","phone":"541 270 4585","reason":"Checking the plumbing","urgent":false}'
```

A message should appear in `#front-desk` within a second, with the number rendered as a
tappable `tel:` link. If delivery fails the endpoint returns `ok: false` and the agent
offers a transfer instead of promising a callback, which is the intended behaviour —
see the reasoning at the top of `server/notify.js`.
