# Angel D.C. Design System

The single source of truth for how every page and component should look, animate, and behave. Tokens live in `src/app/globals.css`; shared components live in `src/components/ui/`. **Every new UI surface must be built from these — no ad-hoc colors, spacing, or one-off components.**

---

## 1. Color System

All color must reference CSS custom properties defined in `globals.css` (`:root` for light, `.dark` for dark) — never hardcoded hex/Tailwind palette classes in component code.

| Token | Purpose |
|---|---|
| `--color-navy`, `--color-blue`, `--color-indigo` | Brand |
| `--color-success` / `-light` / `-bg` | Positive status |
| `--color-danger` / `-light` / `-bg` | Negative status |
| `--color-warning` / `-light` / `-bg` | Caution status |
| `--color-info` / `-light` / `-bg` | Informational status |
| `--background`, `--color-surface`, `--color-surface-elevated`, `--color-surface-hover`, `--color-surface-active`, `--color-surface-sunken`, `--color-surface-overlay` | Layered surfaces |
| `--color-border`, `--color-border-light`, `--color-border-strong`, `--color-border-focus` | Borders & focus |
| `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`, `--color-text-link` | Typography |

Gradients (used on icon badges, hero headers, KPI accents) are the only place Tailwind gradient utility classes (`from-* to-*`) are allowed directly, since they're decorative, not semantic.

**Rule:** if you reach for `bg-slate-800`, `text-blue-600`, etc. directly in a component, first check whether a token/Tailwind-mapped class already exists. `app-sidebar.tsx`'s hardcoded `bg-[#0B1120]` and `button.tsx`/`card.tsx`'s raw Tailwind palette classes are known violations to clean up over time.

## 2. Typography

Scale defined in `globals.css`: `--text-xs` (12px) → `--text-5xl` (48px), with `--leading-*` and `--tracking-*` companions. Headings (`h1`–`h6`) get global defaults.

- Page titles: `PageHeader` component (`text-2xl font-bold tracking-tight`)
- Section titles: `SectionCard` title slot (`text-[13px] font-semibold tracking-wide`)
- Body: `text-sm` / `text-[13px]`
- Labels/meta: `text-[10px]`–`text-xs` uppercase tracking-wider
- **Do not** use raw arbitrary sizes (`text-[13px]` is the one tolerated micro-label exception already baked into shared components) for new one-off page text — reuse the components above instead of inventing a new size per page.

## 3. Elevation (Shadows)

`--shadow-xs` → `--shadow-2xl`, plus `--shadow-card` (default card resting state) and `--shadow-dropdown` (popovers/menus/command palette). Hover states escalate one level (e.g. `shadow-sm` → `hover:shadow-xl` on cards), never more than two.

## 4. Glass / Surface Styles

Defined in `globals.css` and used via utility classes:
- `.glass`, `.glass-subtle`, `.glass-card` — backdrop-blur translucent panels (workspace panels, hero sections, premium KPI cards)
- `.premium-card` — solid elevated card with refined border/shadow
- `.hover-lift` — translateY + shadow on hover
- `.hover-glow` — soft colored glow on hover
- `.animated-border` — gradient-shifting border (sparingly, for hero/flagship elements only)

Use glass treatments for **hero/featured surfaces** (dashboard hero, KPI row, workspace panels). Use solid `premium-card`/default card styling for dense data (tables, forms) where translucency would hurt legibility.

## 5. Border Radius

`--radius-xs` (4px) → `--radius-2xl` (20px), `--radius-full` (pill).

- Buttons / inputs / badges: `rounded-lg` (12px)
- Cards / panels / modals: `rounded-2xl` (20px) for primary surfaces, `rounded-xl` for nested/secondary
- Avatars / icon chips / pills: `rounded-full`

## 6. Spacing

`--space-0` → `--space-16` (4px steps up to 16px, then 24/32/40/48/64px). Page containers use `p-6 md:p-8`; section internals use `p-5`; card grids use `gap-4`–`gap-6`.

## 7. Motion System

Powered by `framer-motion`. Standard patterns (copy from `dashboard/page.tsx`):

```ts
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }
```

- Page mount: wrap content in `motion.div variants={stagger} initial="hidden" animate="show"`, each section/card uses `variants={fadeUp}`.
- Cards: `whileHover={{ y: -3 }}`, transition `duration: 0.2`.
- Numbers: animated count-up via `StatCard` (framer-motion `animate()`).
- Respect `prefers-reduced-motion` (already handled globally in `globals.css`).
- Nothing should "pop" into existence with no transition — every new element on screen gets at minimum an opacity/y fade.

## 8. Components

| Component | File | Notes |
|---|---|---|
| `Button` | `ui/button.tsx` | variants: primary/secondary/danger/ghost/outline/accent; sizes sm/md/lg |
| `Card` | `ui/card.tsx` | low-level card primitive |
| `SectionCard` | `ui/section-card.tsx` | titled section, `glass` prop, icon, actions slot |
| `StatCard` | `ui/stat-card.tsx` | animated KPI tile, `glass`/`compact` props, trend indicator |
| `PageHeader` | `ui/page-header.tsx` | gradient icon + title + subtitle + actions |
| `Modal` | `ui/modal.tsx` | focus-trapped dialog, ESC/click-outside close |
| `Input` / `Textarea` / `Select` | `ui/input.tsx` etc. | label/error/helper-text pattern |
| `Table` | `ui/table.tsx` | semantic table primitives |
| `Badge` / `StatusBadge` | `ui/badge.tsx` | 5 semantic variants |
| `Skeleton` / `TableSkeleton` / `CardSkeleton` / `PageSkeleton` | `ui/skeleton.tsx` | loading states — always use these, never a one-off pulsing `div` |
| `EmptyState` | `ui/empty-state.tsx` | icon + title + description + optional action |
| `DonutChart` / `SimpleBarChart` / `ProgressRing` | `ui/mini-chart.tsx` | charts |
| `CommandPalette` | `ui/command-palette.tsx` | Cmd/Ctrl+K |

**Gaps to fill (tracked, not yet built):** Toast/Notification system, Tabs, Dropdown menu, Popover, Breadcrumbs, Pagination. Until built, do not improvise bespoke versions per-page — flag and reuse the nearest existing primitive, or escalate before inventing a new pattern.

## 9. Icons

`lucide-react` exclusively. Icon-only buttons must always carry `title` (tooltip) **and** `aria-label`. No emoji as UI iconography (replace any `⚡`/`🔧` found in code with the matching Lucide icon).

## 10. RTL / i18n

- Direction is toggled globally via `src/lib/i18n/context.tsx` (`document.documentElement.dir`, `ar`/`he` = RTL).
- **New component rule:** use logical Tailwind properties — `ms-`/`me-` (margin-start/end), `ps-`/`pe-`, `text-start`/`text-end`, `border-s`/`border-e` — instead of `ml-`/`mr-`/`text-left`/`text-right`/`border-l`/`border-r`. Physical-direction classes are only acceptable for elements that are inherently LTR regardless of locale (canvas/BIM viewer coordinate overlays, code/number formatting).
- Every user-facing string must go through `useI18n()` / `t.*` and exist in all three locale blocks in `src/lib/i18n/translations.ts`. No hardcoded English strings in JSX.

## 11. Accessibility Baseline

- All interactive elements reachable by keyboard (visible focus ring via `.focus-ring` / `focus-visible:` utilities already defined globally).
- Icon-only controls: `aria-label` + `title`.
- Expand/collapse and tab-like controls: `aria-expanded`/`aria-selected`/`role` as appropriate.
- Don't rely on color alone for status — pair with icon/text (already the pattern in `StatusBadge`).

## 12. Page Template

Every page should follow this shape (see `dashboard/page.tsx` as canonical reference):

1. Loading state → `PageSkeleton`/`CardSkeleton` grid, never a bespoke pulsing div.
2. Error state → centered icon + message + retry button (`Button` component).
3. Empty state → `EmptyState` with action CTA.
4. Success: `PageHeader` → stagger-animated grid of `StatCard`/`SectionCard` content, wrapped in the gradient page background (`bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f]`).

---

### Known violations (from the 2026-06 product audit — fix opportunistically per page, tracked here so they aren't lost)

- `quantities/page.tsx`, `evm/page.tsx`: zero i18n, fully hardcoded strings.
- Hardcoded section titles missing translation keys across dashboard, project overview, cost-control, payments.
- RTL-unsafe physical-direction classes: `rates/page.tsx`, `tenders/page.tsx` tables; `app-sidebar.tsx` nav border; `evidence-center.tsx`, `bottom-dock.tsx`.
- Dark-mode-invisible spinners: `drawings/[drawingId]/page.tsx`, `workspace/page.tsx`.
- Hardcoded brand hex in `app-sidebar.tsx` (`bg-[#0B1120]`, `bg-[#060A14]`).
- No Toast/Notification system anywhere in the app.
