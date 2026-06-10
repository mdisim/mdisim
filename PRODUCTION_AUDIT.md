# ANGEL D.C. — Production Readiness Audit
_Sprint 7 audit — 2026-06-10_

---

## Features Complete

### Routes (44 total)

| Route | Type | Status |
|---|---|---|
| `/` | Dynamic | Auth redirect |
| `/login` | Static | ✅ |
| `/register` | Static | ✅ |
| `/dashboard` | Dynamic | ✅ with loading.tsx |
| `/projects` | Dynamic | ✅ with loading.tsx |
| `/projects/[id]` | Dynamic | ✅ with not-found.tsx |
| `/projects/[id]/boq` | Dynamic | ✅ |
| `/projects/[id]/budget-report` | Dynamic | ✅ |
| `/projects/[id]/cashflow` | Dynamic | ✅ |
| `/projects/[id]/certificates` | Dynamic | ✅ |
| `/projects/[id]/concrete` | Dynamic | ✅ |
| `/projects/[id]/contractors` | Dynamic | ✅ |
| `/projects/[id]/contracts` | Dynamic | ✅ |
| `/projects/[id]/costs` | Dynamic | ✅ |
| `/projects/[id]/documents` | Dynamic | ✅ |
| `/projects/[id]/gantt` | Dynamic | ✅ |
| `/projects/[id]/issues` | Dynamic | ✅ |
| `/projects/[id]/materials` | Dynamic | ✅ |
| `/projects/[id]/meetings` | Dynamic | ✅ |
| `/projects/[id]/phases` | Dynamic | ✅ |
| `/projects/[id]/procurement` | Dynamic | ✅ |
| `/projects/[id]/reports` | Dynamic | ✅ |
| `/projects/[id]/reports/[reportId]` | Dynamic | ✅ |
| `/projects/[id]/reports/new` | Dynamic | ✅ |
| `/projects/[id]/risks` | Dynamic | ✅ |
| `/projects/[id]/takeoff` | Dynamic | ✅ |
| `/projects/[id]/takeoff/[drawingId]` | Dynamic | ✅ |
| `/projects/[id]/takeoff/upload` | Dynamic | ✅ |
| `/projects/[id]/variations` | Dynamic | ✅ |
| `/executive` | Dynamic | ✅ with loading.tsx |
| `/infrastructure` | Dynamic | ✅ |
| `/tenders` | Dynamic | ✅ |
| `/tenders/[id]` | Dynamic | ✅ |
| `/contractors` | Dynamic | ✅ |
| `/contractors/[id]` | Dynamic | ✅ |
| `/calculators` | Dynamic | ✅ |
| `/boq-library` | Dynamic | ✅ |
| `/learn` | Dynamic | ✅ |
| `/learn/[course]` | Dynamic | ✅ |
| `/settings` | Dynamic | ✅ |
| `/notifications` | Dynamic | ✅ |
| `/api/auth/callback` | Dynamic | ✅ |
| `/api/takeoff/upload` | Dynamic | ✅ |
| `/_not-found` | Static | ✅ |

### Sprint 7 Enhancements
- ✅ Professional navy engineering color palette (CSS custom properties)
- ✅ Sidebar redesigned with deep navy (#1e3a5f), amber active states, section dividers
- ✅ Dashboard gradient banner header with date
- ✅ StatsCard left color border + hover shadow elevation
- ✅ EmptyState component (`src/components/ui/empty-state.tsx`)
- ✅ LoadingSkeleton component with shimmer animation (`src/components/ui/loading-skeleton.tsx`)
- ✅ LanguageProvider enhanced: Arabic/Hebrew RTL with proper font classes
- ✅ RTL utility class overrides in globals.css
- ✅ Arabic Google Font (Noto Sans Arabic) loaded
- ✅ ErrorBoundary component (`src/components/error-boundary.tsx`)
- ✅ Project 404 page (`/projects/[id]/not-found.tsx`)
- ✅ Global 404 page with ANGEL D.C. branding
- ✅ Loading pages: dashboard, projects, executive
- ✅ Print styles (hide nav/sidebar, full-width content)
- ✅ Webkit scrollbar styling
- ✅ Build: 0 TypeScript errors, 44 routes

---

## Known Limitations

- Mobile hamburger toggle relies on existing `SidebarContext` — the layout is already a server component importing client components correctly; no additional shell split was required.
- Google Fonts import requires internet access at build/runtime; offline environments need local font hosting.
- RTL utility overrides use CSS specificity workarounds for Tailwind utility classes; Tailwind v4 logical properties (`ms-*`, `me-*`) would be cleaner.
- The `not-found.tsx` files use static strings — no i18n for 404 messages yet.
- `loading.tsx` pages use `animate-pulse` (Tailwind) rather than the custom shimmer skeleton component to avoid server/client component import complexity.

---

## Missing for Enterprise Use

- **Role-based access control (RBAC)** — all routes visible to all authenticated users; no admin/viewer/editor roles enforced at route level.
- **Multi-tenancy isolation** — data queries use `user_id` but no org-level row-level security audit has been done.
- **Audit logging** — no immutable log of who changed what and when.
- **File storage limits** — takeoff upload API has no file size/type enforcement beyond client-side.
- **Email notifications** — notification bell is read-only; no outbound email (Resend/SendGrid) configured.
- **CI/CD pipeline** — no `.github/workflows` for automated test + deploy on push.
- **End-to-end tests** — zero Playwright/Cypress coverage.
- **Rate limiting** — API routes have no rate limiting middleware.
- **CSP / security headers** — no `next.config` security headers configured.
- **Offline / PWA** — no service worker or manifest.

---

## Recommended Next Steps

1. **Sprint 8 — RBAC**: Add role column to `profiles`, gate routes with middleware, add admin panel.
2. **Sprint 9 — Notifications**: Integrate Resend for transactional email; add push notifications via Supabase Realtime.
3. **Sprint 10 — Testing**: Add Playwright e2e tests for critical flows (auth, project creation, cost entry).
4. **Security hardening**: Add `next.config.ts` security headers (CSP, HSTS, X-Frame-Options), enable Supabase RLS audit.
5. **CI/CD**: GitHub Actions pipeline — lint, typecheck, build, Playwright smoke tests on every PR.
6. **Performance**: Add `next/image` for any user-uploaded images; profile bundle with `@next/bundle-analyzer`.
7. **Internationalisation**: Replace hardcoded English strings with an i18n library (next-intl) for full Hebrew/Arabic support.
8. **Observability**: Integrate Sentry for error tracking; add Vercel Analytics or PostHog for usage analytics.
