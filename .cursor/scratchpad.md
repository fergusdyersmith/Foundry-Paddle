# Background and Motivation

User requested executor-mode implementation to enforce E.164 format for mobile number input in the form component.
Update (2026-04-09): User now reports form submission failure with browser console logs. The critical error is a CORS block when frontend code posts directly to `https://hook.eu1.make.com/...`. Goal is to restore reliable form submission by routing requests through backend code and improving error observability.

# Key Challenges and Analysis

- There are two live form implementations in this repo with mobile fields; both need consistent E.164 behavior to avoid drift.
- Validation should happen both at input time (sanitization) and submit time (strict regex).
- Current architecture likely sends request directly from browser to Make webhook, which fails due to cross-origin restrictions.
- Noise from browser extensions (LastPass/Grammarly scripts) can distract debugging; plan must isolate first-party errors only.
- Security rule alignment is required: frontend should not directly call third-party automation endpoints when a backend relay is available.

# High-level Task Breakdown

1. Identify the current submit path for the failing "Stay In Touch" form.
   - Success criteria: exact component and network call location documented (where webhook URL is used).
2. Design backend relay endpoint for form submission (API route or server action).
   - Success criteria: one agreed backend entrypoint that accepts validated form payload and forwards to Make webhook server-side.
3. Add strict server-side validation and safer error responses.
   - Success criteria: payload schema validation exists on backend; invalid payload returns clear 4xx response; upstream failure returns controlled 5xx without exposing secrets.
4. Update frontend to call internal backend endpoint only.
   - Success criteria: frontend no longer calls `hook.eu1.make.com` directly; browser network panel shows request to same-origin endpoint.
5. Add debugging output and verification checks.
   - Success criteria: backend logs include non-sensitive diagnostics (status codes/error class), and manual submission succeeds end-to-end in browser.
6. Run lint/tests for touched files.
   - Success criteria: no new lint issues in edited files; relevant tests pass or, if absent, manual test checklist completed.

# Project Status Board

- [x] Locate the exact submit call used by the failing form.
- [x] Define backend relay contract (input/output + validation).
- [x] Implement backend relay that forwards to Make webhook server-side.
- [x] Switch frontend submit to internal endpoint.
- [ ] Validate with manual browser test and network inspection.
- [x] Run lint/tests for touched files.
- [ ] Await user manual verification and confirmation.

# Current Status / Progress Tracking

- Executor implementation complete for backend relay migration (previous task).
- **Event Signup Flow — OUTDATED (replaced 2026-04-25):**
  - ~~Created `event_signups` table in Neon DB~~ — removed, Neon no longer used for events.
  - ~~EventSignupForm.tsx, Admin.tsx~~ — deleted.
  - The entire Neon-backed events system has been replaced with Playtomic Third Party API integration.
- **Playtomic Events Integration — COMPLETE (2026-04-25):**
  - Replaced `GET /api/events` Express route: now calls Playtomic Third Party API instead of Neon.
  - Added OAuth token fetch + cache (client_credentials flow, ~1hr token, 5-min buffer refresh).
  - Added 30-day rolling bookings fetch with 5-min in-memory cache to respect 1 req/min rate limit.
  - Filters for Academy booking types: COURSE_CLASS, PUBLIC_CLASS, PRIVATE_CLASS, TOURNAMENT.
  - Maps Playtomic bookings to PadelEvent shape with UTC → local timezone conversion (America/Los_Angeles).
  - Updated EventsModal.tsx: removed signup form/dialog, replaced "SIGN UP" with "BOOK" link to Playtomic app, added price display and court name.
  - Deleted: EventSignupForm.tsx, Admin.tsx, /admin route, all Neon imports/routes/schemas.
  - Removed `@neondatabase/serverless` from package.json.

# Executor's Feedback or Assistance Requests

**Railway env vars needed for Playtomic integration:**
- `PLAYTOMIC_CLIENT_ID` — from Playtomic Manager > Settings > Developer Tools
- `PLAYTOMIC_CLIENT_SECRET` — from Playtomic Manager > Settings > Developer Tools
- `PLAYTOMIC_TENANT_ID` — optional, defaults to `70cae734-e32f-4e3a-9f72-516d9f025125`
- `CLUB_TIMEZONE` — optional, defaults to `America/Los_Angeles`

**Railway env vars that can be removed:**
- `DATABASE_URL` — Neon is no longer used by any route
- `ADMIN_PASSWORD` — admin panel has been removed

**Neon cleanup (manual):**
- Drop `event_signups` table, then `events` table from Neon DB
- If no other tables remain, the Neon project can be decommissioned

# Lessons

- If `.cursor/scratchpad.md` does not exist in the repo, create it with required sections before continuing executor tracking.
- For E.164 UX, auto-prepend `+` and strip non-digits on each keystroke to reduce user input friction.
- For US-only phone UX, fixed `+1` prefix in the field is clearer than asking users to type country code.
- When console logs contain many extension errors, isolate first-party origin/network failures first; fix CORS/HTTP path before extension warnings.
- For third-party webhook integrations from frontend, avoid direct browser calls; use same-origin backend relay to bypass CORS and centralize validation/logging.
- Neon serverless driver converts DATE and TIME columns to JS Date objects which causes timezone drift when serialized to JSON. Use `::text` cast in SQL SELECT queries to get plain string values (`YYYY-MM-DD`, `HH:MM:SS`).
- When running Vite dev server alongside Express backend, add a `proxy` entry in `vite.config.ts` for `/api` routes to forward to the backend port.
- Playtomic Third Party API base URL is `thirdparty.playtomic.io` (not `api.playtomic.io`). The OAuth token endpoint is ALSO at `thirdparty.playtomic.io/api/v1/oauth/token` (NOT `api.playtomic.io/oauth/token` as the help article incorrectly states). The body field is `secret` (not `client_secret`), and the response field is `token` (not `access_token`).
- Playtomic API rate limit is 1 req/min — must cache server-side. A 5-min TTL on a 30-day rolling window fetch is a safe strategy.
- Playtomic booking dates are UTC; use `Intl.DateTimeFormat` with the club's timezone to convert to local date/time for display.
