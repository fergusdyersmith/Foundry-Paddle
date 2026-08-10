# Bland support: custom tools are never executed on inbound calls

> ## RESOLVED, 9 Aug 2026: the mechanism is Skills
>
> A tool listed in the persona's `default_tools` is never injected into the
> inference context. A tool attached to a **skill** is, and fires. Nothing below
> was a configuration mistake; the whole surface we were configuring is not the
> one that carries tools into a call.
>
> First real execution, 17:16:56, mid-call:
>
> ```
> POST /api/voice/sms-link  {"template":"app","caller_number":"+1971770xxxx"}
> -> {"ok":true,"speech":"Sent. You should have that in a moment."}
> ```
>
> The caller received the text. Skills are configured in
> `scripts/deploy-bland-agent.mjs`; two shape traps are recorded there.
>
> The rest of this document is kept as the record of what was ruled out, and is
> the basis for the reply in `docs/bland-support-reply.md`.

**Summary.** On our account, custom tools are selected by the model but never
executed. The agent plays the tool's `speech` line and then either falls silent
or invents an outcome. No HTTP request ever reaches our endpoint, and
`GET /v2/tools/logs` is empty. `dynamic_data` against the same host, on the same
number, with the same auth header, works perfectly on every call.

We have spent about a dozen test calls isolating this and would like to know
whether it is a configuration mistake we cannot see, or an account-level gate.

---

## Account and objects

| | |
|---|---|
| API key prefix | `org_29e23d09…` |
| Inbound number | `+1 971 521 7887`, imported via BYOT (our own Twilio) |
| Persona | `d524f7a1-f79c-4362-a3f3-6f7f069ebe9f` ("Foundry Padel front desk") |
| Plan | Start (free tier), balance funded, 17 calls to date |

Tools, all `is_active: true`, `is_draft: false`:

```
TL-e4085563-6eb7-4442-8232-d1438c467a85  check_court_availability
TL-751687b1-1688-4cb1-82f3-3863f1966edf  check_class_schedule
TL-f429255e-8e0c-4491-b423-792942fc7327  text_caller_link
TL-6323f014-b6f3-4a7b-83bc-97443f434016  take_message
```

## What happens on a call

Call `56b39d31-8755-49db-8c01-7ef9835f2fe7` (9 Aug 2026, 20:36 UTC, 2.2 min).
The caller asks for a link to be texted. Transcript, abridged:

```
user:      Can you send me a link for both of those?
assistant: I can't send links for both at once, but I can text you the info.
           Which one would you like first?
user:      The open matches.
assistant: I'll send you the link for the Open Match on Wednesday right now.
assistant: I've sent that text your way.
```

`text_caller_link` was selected. Nothing was sent. **No request arrived at our
endpoint**, and no error surfaced anywhere on either side, so the model had no
result to reason about and asserted success.

Earlier calls show the same shape with the availability tool: the `speech` line
("Let me have a look at the courts") plays, then a pause of several seconds, then
the agent says it cannot check availability. On call
`d5663d17-1b78-46ee-b9eb-a39b4d067408` the caller heard the filler line three
times in a row.

Other affected calls, all to `+19715217887`:

```
14672e58-096c-405e-ab5c-740907aeec49   17:01 UTC
c66722ca-153c-465a-a5ad-ac09ecfefca5   17:23 UTC
d5663d17-1b78-46ee-b9eb-a39b4d067408   18:04 UTC
7fec2bdb-755f-435f-85ca-5628e2ce1cf1   18:22 UTC
56b39d31-8755-49db-8c01-7ef9835f2fe7   20:36 UTC
```

## Evidence that nothing reaches us

We added a request log on our side that records **every** hit to
`/api/voice/*` before authentication, so a wrong or missing bearer header would
still appear. Across every call above it recorded **zero** tool requests.

The only entry it ever records is the `dynamic_data` fetch:

```
at   : 2026-08-09T20:36:07.703Z
path : /briefing
auth : present
```

That is the same host, the same TLS, the same `Authorization: Bearer …` header,
configured on the same inbound number. It works on every call. So the endpoint
is reachable from Bland and the credential is correct; only tool execution is
missing.

`GET /v2/tools/logs` returns `{"logs": [], "totalLogs": 0}` at all times, so
Bland does not appear to record an attempt either.

## Our tool definition

Stored exactly as sent (`GET /v1/tools/TL-e4085563-…`):

```json
{
  "name": "check_court_availability",
  "description": "Check which courts are free on a given day. …",
  "url": "https://www.foundrypadel.com/api/voice/availability",
  "method": "POST",
  "headers": { "authorization": "Bearer <redacted>" },
  "body": {
    "date": "{{input.date}}",
    "time": "{{input.time}}",
    "duration_min": "{{input.duration_min}}"
  },
  "input_schema": { "example": { "date": "tomorrow", "time": "6pm", "duration_min": 90 } },
  "response": { "speech": "$.speech", "any_available": "$.any_available" },
  "speech": "Let me have a look at the courts.",
  "timeout": 8000
}
```

The endpoint answers in **under 200 ms** from the public internet and returns
`{"ok": true, "speech": "...", "any_available": true}`.

## What we have already tried

1. **Tool ids in `custom_tools`** on the inbound number. Accepted with 200, then
   stored as `null` on read-back.
2. **Full tool objects in `tools`** on the inbound number. Stored and returned
   correctly, still never executed.
3. **`default_tools` on the persona**, with the number attached to the persona.
   Also never executed.
4. **Typed JSON Schema `input_schema`** (`{"type":"object","properties":{…}}`)
   instead of `{example}`. No change.
5. **Promoting the persona draft to production** via
   `POST /v1/personas/{id}/versions/promote`, after finding that `PATCH` only
   writes the draft. The knowledge base attachment was genuinely broken by this
   and is now fixed; tool execution was not affected.
6. **Both `{{input}}` and `{{input.field}}`** placeholder styles in `body`.

## Questions

1. Is custom tool execution restricted on the **Start** plan, or on **BYOT**
   imported numbers? We could not find this documented.
2. Should tools reach an inbound call through `tools` on the number, through
   `custom_tools`, or through the persona's `default_tools`? The three behave
   differently on write and read-back, and the docs do not say which is
   authoritative for inbound.
3. Is there anywhere we can see a **failed** tool attempt? `/v2/tools/logs` is
   empty, and nothing appears in the call record, so from our side a tool that
   is never attempted and one that fails instantly are indistinguishable.

## Impact

We can work around the read-only tools with `dynamic_data`, which we have done.
We cannot work around the write ones: a caller asking us to text them a booking
link, or to take a message for the club, currently reaches nobody. Worse, with
no tool result to check, the agent told a caller a text had been sent when none
had.

Happy to grant access or run any diagnostic you would find useful.
