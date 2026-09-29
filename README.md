# CRISP - Cyber Resilience Intelligence & Scoring Platform

Partner login, customer intake, and an AI-generated Cyber Resilience
Readiness report.

## Setup

1. Create a Supabase project. Run `supabase/migrations/0001_init.sql`
   against it (Supabase SQL editor, or the Supabase CLI).
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase project settings > API
   - `SUPABASE_SERVICE_ROLE_KEY` - same page, service_role key. Server-only, never expose to the browser.
   - `ANTHROPIC_API_KEY` - from a **commercial** Claude API account, not a personal claude.ai login. See the compliance notes below before this touches real partner data.
3. Create your own account in Supabase Auth, then manually set its
   `profiles.role` to `'admin'` in the table editor (there's no
   sign-up flow yet - see "Still to build").
4. `npm install && npm run dev`

## Still to define (blocking a real pilot, not blocking local dev)

- The actual Cyber Resilience Readiness assessment questions and
  scoring model. The intake form in `app/partner/customers/new/page.tsx`
  and the report schema in
  `app/api/submissions/[id]/generate-report/route.ts` are both
  placeholders - swap the fields/schema, not the underlying structure.
- Real Commvault product names and positioning for the
  `suggested_products` part of the report. The Claude prompt currently
  has no product knowledge - it needs that fed in explicitly.
- Data retention period for submissions/reports (see compliance notes).

## Still to build

- Partner sign-up / invite flow (currently: create manually in Supabase Auth)
- Draft-save on the intake form so a partner can leave and resume
- Admin: create partner accounts from the Admin UI, not just Supabase directly
- PDF export of a report

## Compliance notes

This handles personal and commercially sensitive data about partners'
customers. Before any real partner uses this:

- `ANTHROPIC_API_KEY` must come from a commercial Claude API account
  (Console), which carries Anthropic's Data Processing Addendum
  (Standard Contractual Clauses + UK International Data Transfer
  Addendum). A personal/free Claude account does not.
- The intake form is designed to avoid free-text fields that invite
  personal data (names, emails) - keep new fields structured
  (dropdowns/selects) rather than open text where possible.
- No retention/deletion policy is implemented yet - `reports` and
  `submissions` rows are kept indefinitely as this stands.
- This has not been reviewed by Commvault's data protection function.
  Do that before any real partner or customer data goes in, even in
  pilot form.
