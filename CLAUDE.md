# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Express + Vite HMR via tsx watch)
pnpm build        # Build for production (vite build + esbuild server bundle)
pnpm start        # Serve production build
pnpm check        # TypeScript type checking (tsc --noEmit)
pnpm format       # Format code with Prettier
pnpm test         # Run all tests with Vitest
pnpm db:push      # Generate Drizzle migrations and apply to DB
```

Run a single test file:

```bash
pnpm vitest run server/forensic.test.ts
```

## Architecture

This is a full-stack TypeScript monorepo: **React frontend + Express/tRPC backend + MySQL via Drizzle ORM**.

### Layer Overview

```
client/src/        → React 19 SPA (Wouter routing, TanStack Query, shadcn/ui)
server/_core/      → Express setup, tRPC context/middleware, LLM wrapper, OAuth
server/routers/    → tRPC API endpoints (cases, evidence, analyses, reports, stripe, comparison)
server/*.ts        → Business logic modules (forensicAI, imageAnalysis, imageComparison, notification)
shared/            → Types re-exported from drizzle/schema.ts, shared constants
drizzle/           → MySQL schema + SQL migrations
```

### tRPC + React Query

The API is entirely tRPC. The client uses `httpBatchLink` to `/api/trpc` with SuperJSON serialization. All mutations and queries are type-safe end-to-end. Authentication is cookie-based (OAuth/JWT); `requireUser` middleware on the server side enforces it.

### Database

MySQL with Drizzle ORM. `drizzle/schema.ts` is the single source of truth for types — `shared/types.ts` just re-exports from there. Core tables: `users`, `subscriptions`, `cases`, `evidence`, `analyses`, `reports`, `stripe_events`, `image_comparisons`.

### AI Modules

- **`server/forensicAI.ts`** — Orchestrates LLM calls to analyze case evidence: expert opinion, prosecution/defense theories, inconsistency detection, timeline generation, relationship mapping.
- **`server/imageAnalysis.ts`** — Computer vision: EXIF metadata extraction, OCR, forgery/manipulation detection.
- **`server/imageComparison.ts`** — Side-by-side differential analysis of two images with 5-tab results panel.

The LLM invocation abstraction lives in `server/_core/llm.ts`.

### File Storage

Evidence files are uploaded to AWS S3. Storage quota is tracked in the `subscriptions` table. Presigned URLs are used for direct client uploads.

### SaaS Subscriptions

Three tiers (free/premium/enterprise) with per-plan limits on analyses/month, cases, and storage. Stripe handles payments; `stripe_events` table enforces idempotent webhook processing. The Stripe webhook route registers before body-parser to preserve raw body for signature verification.

### Frontend Routing

Wouter handles client-side routing. Two layouts: public (landing, payment result pages) and protected (dashboard, cases, analyses, reports, subscription, image comparison, admin). Auth state comes from `useAuth()` (tRPC query); 401 responses redirect to login.

### Theme

Dark mode by default. Black + red OKLCH color scheme via CSS variables. UI built on shadcn/ui (Radix UI primitives) + Tailwind CSS 4.

### Testing

Vitest with ~85 tests across: `forensic.test.ts`, `imageAnalysis.test.ts`, `imageComparison.test.ts`, `stripe.test.ts`, `auth.logout.test.ts`. Tests live alongside the server modules they test.
