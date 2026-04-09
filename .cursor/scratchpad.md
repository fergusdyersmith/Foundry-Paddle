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

- Executor implementation complete for backend relay migration:
  - Added `POST /api/register-interest` in `server.js` with Zod validation for `name`, `email`, `mobile`, and optional `source`.
  - Added upstream forwarding to Make webhook server-side, with controlled error responses (`400` validation, `502` upstream failure, `500` unexpected).
  - Added non-sensitive debug logs for validation issues and upstream status/body preview.
  - Updated `src/components/RegisterSection.tsx` to submit to `/api/register-interest` and include `source: "home"`.
  - Updated `fullsite/src/components/StayInTouchForm.tsx` to submit to `/api/register-interest` (no direct Make call from browser).
  - Removed direct webhook URL export from `fullsite/src/lib/interestWebhook.ts`.
- Lint diagnostics run for all touched files; no linter errors found.

# Executor's Feedback or Assistance Requests

Manual verification requested:
- Submit the form on production/staging and confirm success toast appears.
- In browser DevTools Network tab, verify request target is same-origin `/api/register-interest` (not `hook.eu1.make.com`).
- If submission fails, share backend logs from Railway for `[register-interest]` entries to diagnose upstream errors quickly.

# Lessons

- If `.cursor/scratchpad.md` does not exist in the repo, create it with required sections before continuing executor tracking.
- For E.164 UX, auto-prepend `+` and strip non-digits on each keystroke to reduce user input friction.
- For US-only phone UX, fixed `+1` prefix in the field is clearer than asking users to type country code.
- When console logs contain many extension errors, isolate first-party origin/network failures first; fix CORS/HTTP path before extension warnings.
- For third-party webhook integrations from frontend, avoid direct browser calls; use same-origin backend relay to bypass CORS and centralize validation/logging.
