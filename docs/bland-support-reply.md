# Reply to Bland support, ticket T-1001

Copy the block below. It closes the ticket, tells them what the fix was, and asks
the two things that would stop the next customer losing two days to this.

---

We found it, and I want to write it up properly since your logs confirmed the
symptom but not the cause.

**Tools attached to a persona's `default_tools` are never injected into the
inference context. Tools attached to a Skill are, and they execute.**

That matches exactly what your engineer saw server-side: no tool definition was
present in the context. The definitions existed, were `is_active: true`,
`is_draft: false`, and were correctly referenced by the persona. They simply were
not on the path that reaches the model.

Moving the same four unchanged tool ids into skills fixed it with no other
change. First live execution, mid-call:

```
POST /api/voice/sms-link  {"template":"app","caller_number":"+1971770xxxx"}
-> {"ok":true,"speech":"Sent. You should have that in a moment."}
```

The caller got the text. All four tools now fire.

Two things I would fix on your side, in order of how much time they cost us:

1. **Skills are not in the documentation.** They appear in the dashboard and on
   the persona object, and they are the only mechanism that actually delivers a
   tool to an inbound call, but nothing in the docs points there. Every page
   about custom tools describes `default_tools`, which does not work. We found
   skills by chance, clicking through the dashboard after your team had already
   told us the tools were absent from the context. If `default_tools` is
   deprecated or inbound-incompatible, saying so on the custom tools page would
   have saved us about a dozen paid test calls.

2. **The skills write schema rejects valid-looking input with
   `"Expected union value"`**, naming neither the field nor the reason. Two
   traps: `tools` takes objects (`[{"tool_id": "TL-…"}]`), not id strings, and
   `id` is required even when creating a new skill. The shape returned by GET
   also differs from the shape accepted by PATCH, so echoing back what you read
   does not work. An error that named the offending field would make this a
   one-minute fix instead of a guessing game.

One correction to something I said earlier in this thread: I claimed a
`BlandStatusCode: 200` in a call record indicated a tool had executed. That is
the call status, not a tool result, and my inference from it was wrong. Nothing
in the call record ever distinguished an attempted tool from an unattempted one,
which is really the substance of question 3 above and is still true.

Thanks for checking the server-side logs. That was the finding that let us stop
looking at our own configuration.
