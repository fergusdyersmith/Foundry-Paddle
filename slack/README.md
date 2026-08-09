# Slack: where phone messages land

When the Bland receptionist takes a message, `server/notify.js` posts it to
`#front-desk`. This directory holds the app definition so the setup is reproducible
rather than remembered.

## Why the dashboard and not the Slack CLI

The Slack CLI (`slack login`) only authenticates against workspaces eligible for the
next-generation Slack platform, which a free workspace is not:

> This workspace is not eligible for the next generation Slack platform.

Since `slack api` also needs that login, the whole CLI path is closed on a free plan.
The classic app dashboard works fine. The CLI is installed at `~/.local/bin/slack` and is
harmless to leave there, but it cannot do this job.

## How it posts: bot token, not webhook

The app was installed with `channels:history` and `chat:write`, and **`incoming-webhook`
was not granted**, so there is no webhook URL to use. `notify.js` therefore posts via
`chat.postMessage` with the bot token.

That turned out to be the better transport anyway: one secret, the channel is
configurable without reinstalling, and threads, reactions and message edits are available
later without touching the app's scopes.

The webhook path is still in `notify.js` as a fallback. Set `SLACK_WEBHOOK_URL` instead
of `SLACK_BOT_TOKEN` and it is used automatically.

One sharp edge worth knowing: **the Slack Web API answers HTTP 200 with `{"ok": false}`
on failure.** Checking the status code alone reports every error as a success, which
would let the agent promise a caller a callback that never happens. `notify.js` checks
the body.

## Environment

| Variable | Purpose |
|---|---|
| `SLACK_BOT_TOKEN` | `xoxb-…` token with `chat:write` |
| `SLACK_CHANNEL` | Defaults to `#front-desk` |
| `SLACK_WEBHOOK_URL` | Only used when there is no bot token |

## Setup

1. Create the channel: **`#front-desk`**.

2. <https://api.slack.com/apps> → **Create New App** → **From an app manifest** → choose
   the workspace → paste `front-desk-manifest.json` → **Create**.

3. **Install to Workspace**, then copy the **Bot User OAuth Token** (`xoxb-…`) from
   *OAuth & Permissions*.

4. **Invite the bot to the channel.** In `#front-desk`:

   ```
   /invite @Foundry Front Desk
   ```

   Without this every post fails with `not_in_channel`. The app being installed to the
   workspace is not the same as it being a member of the channel, and the bot has no
   `channels:join` scope to add itself.

5. Set `SLACK_BOT_TOKEN` on Railway.

6. **Set the channel's mobile notifications to "All messages."** Slack defaults to
   mentions only, which would leave phone messages sitting silently while callers wait
   for a callback that never comes. This is the highest-risk step in the setup and the
   only one no code can enforce. Urgent messages carry `<!channel>` precisely as a
   backstop against this being forgotten.

## Checking it works

```sh
railway run env PORT=4128 VOICE_TOOL_SECRET=… node server.js
curl -X POST http://127.0.0.1:4128/api/voice/message \
  -H "authorization: Bearer …" -H "content-type: application/json" \
  -d '{"name":"Test Caller","phone":"541 270 4585","reason":"Checking the plumbing"}'
```

A message should appear in `#front-desk` within a second, with the number rendered as a
tappable `tel:` link. If delivery fails the endpoint returns `ok: false` and the agent
offers a transfer instead of promising a callback, which is intended — see the reasoning
at the top of `server/notify.js`.
