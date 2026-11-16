# YUKUN services implementation plan

**Goal:** Add real account, cloud journal, AI plan and one-time purchase integrations to the existing journal site while keeping anonymous local journaling available.

**Architecture:** Supabase Auth, Postgres RLS and private Storage own identity and user records. Vercel server routes hold OpenAI and Stripe secrets. The client keeps local IndexedDB separate from cloud records and asks before one-way migration. External features remain closed until configured and reviewed.

**Stack:** React, TypeScript, Vite, Supabase JS, Vercel Functions, OpenAI Responses API, Stripe Checkout.

**Product baseline:** `PRODUCT.md`, `docs/superpowers/specs/2026-10-24-yukun-product-design.md`, `docs/yukun-three-day-delivery-2026-11-16.md`.

## Tasks

1. Add environment contract, SQL RLS migration and automated checks for cloud data isolation.
2. Add email account flows, explicit local-to-cloud copy, cloud journal load/save, photo storage and conflict handling. Keep local data intact.
3. Add adult-only AI questionnaire, deterministic exclusion checks, consent, server-side generation and plan persistence; never send journal content by default. Keep generation disabled until clinical approval.
4. Add one-time Stripe Checkout, signed webhook and account-bound entitlement; keep checkout disabled until price, policies and payment review are set.
5. Update availability copy and setup guide. Run lint, tests and build; verify unavailable states without external credentials.

## Review focus

- Existing local entries and photos survive sign-in, sign-out and failed migration.
- An account can read/write only its own cloud records and photos.
- A stale cloud tab cannot overwrite newer data silently.
- Unsafe AI eligibility cannot reach the model endpoint.
- An unverified or repeated payment webhook cannot grant an entitlement.
