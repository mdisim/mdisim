# Angel D.C. — Interaction System

One set of rules for the whole product. A page that needs a different rule
doesn't get one — it's wrong, and it gets fixed. This document is the
reference; `src/components/workspace/workspace-shell.tsx` is the reference
implementation everything else is measured against.

## 1. Navigation philosophy

The canvas is the only permanent surface. Nothing else is ever docked —
panels are overlays that appear for a reason and disappear the moment that
reason is gone. Three tiers, and nothing moves between them:

- **Mode tabs** (icon strip, top) — which instrument you're using: Drawings,
  Takeoff, Measurement Book, QCS, BOQ, Pricing, Payments, Reports, AI.
  Always visible, always icon-only, tooltip carries the label.
- **⌘P quick switcher** — jump straight to an entity (a BOQ item, a drawing,
  a measurement) by code or description. This is the primary way to move
  around a project. See `quick-switcher.tsx`.
- **⌘K command palette** — a different tier, page-level, global across the
  whole app (dashboard, projects, settings). Lives outside the workspace.
  Don't blend the two: ⌘P never leaves the current project, ⌘K never knows
  about BOQ items.

## 2. Selection behavior

Exactly one thing can be "active" (drives the Inspector) at a time, scoped
by type: a BOQ item, a drawing, or a measurement (`workspace-context.tsx`'s
`WorkspaceSelection`). Clicking a row toggles it — click again to deselect.
Selecting cross-links everywhere: pick a BOQ item and its source drawing,
rate build-up and linked measurement all resolve automatically through
`linked*` in the workspace context, no manual "go find it" step.

Every selectable row gets the same visual: `SelectionBracket`
(`components/icons/marks.tsx`) — never a background tint alone, never a
different marker per page.

## 3. Multi-selection

Layered on top of single-select, not a replacement for it. Modifier-click
only:
- **Cmd/Ctrl+click** — toggle one row in or out of the bulk set.
- **Shift+click** — extend a contiguous range from the last-clicked row.
- A plain click always clears the bulk set and drives single-select instead.

One hook (`lib/hooks/use-multi-select.ts`), one visual (`bg-[var(--color-info-tint)]`
+ a lit `SelectionBracket` in `--color-info` instead of `--color-brand`, so
it never gets confused with "this is the active/inspected item"), one
floating action bar (`modes/selection-bar.tsx`) that appears at the bottom
center the instant count > 0 and vanishes at 0. See `boq-mode.tsx` for the
reference wiring.

## 4. Context menus / right-click

Every row that supports an action beyond "select it" gets a real
`onContextMenu`, not a hover-revealed "⋯" button. One primitive
(`components/ui/context-menu.tsx`, `useContextMenu()`), positioned at the
cursor, closes on click-away/scroll/Escape. Menu contents are per-mode
(BOQ's menu isn't Payment's menu) but the shell — position, dismissal,
styling, icon-then-label-then-shortcut layout — is always the same
component.

## 5. Drag & drop

Not implemented yet. When it lands (BOQ re-sequencing is the obvious first
case), it follows the grain of the dimension-sheet metaphor — reordering
inside a section, not fighting the section structure — and it goes through
the same undo mechanism as any other mutation (§13), not a silent reorder.

## 6. Floating panels & docking

There is no docking model. `components/ui/drawer.tsx` is the only panel
primitive: fixed-position, slides in from `start`/`end`/`bottom`, dismissed
by Escape, backdrop click, or its own close button. The Explorer, the
Inspector and the Insights dock are all the same `<Drawer>` from three
different edges — not three different implementations. None of them ever
change the canvas's width or height. If a new panel is needed, it's a
`<Drawer>` or it's wrong.

## 7. Search

Two distinct searches, never conflated:
- **In-panel filter** — the Explorer's filter field narrows the tree
  already in front of you. Cheap, instant, no navigation.
- **⌘P quick switcher** — searches across entity types and *takes you
  there*, switching mode and selection. See §1.

## 8. Command palette

⌘K, global, page/route-level (`components/ui/command-palette.tsx`). Lists
pages and app-level actions (toggle theme, go to a project section). It is
not project-entity-aware — that's what ⌘P is for.

## 9. AI interaction model

The AI is always scoped to what's on screen, never a blank chat. It states
what it's grounded in (`AiAssistantMode`'s empty state: "Grounded in this
project's drawings, measurements, BOQ, rates and payment history — nothing
is fabricated") and shows a context chip when a selection carries over.
The Inspector's "Ask AI about this" button is the one sanctioned handoff
pattern: it pre-fills a framed question and switches to AI mode, but never
sends on the user's behalf — a human always presses send. Any future
"ask AI" entry point anywhere else in the product follows this exact
shape: pre-fill, don't fire.

## 10. Notifications

`components/ui/toast.tsx`, one global `ToastProvider` (mounted once, root
layout), bottom-end stacked cards. Four variants only — `success`,
`danger`, `warning`, `info` — mapped to the same semantic tokens used
everywhere else, never a one-off color. A toast can carry a single
`action` (label + callback) for the undo pattern (§13) — never more than
one action, never a second button.

## 11. History / Undo / Redo

Mutating a row never asks "are you sure?" with a blocking dialog — it acts,
and offers the way back. The pattern: perform the change immediately, show
a toast with an `action: { label: 'Undo', onClick }` for a few seconds. No
global undo stack yet (nothing in the workspace mutates server data today —
every mode is a read model over live data); the moment a mode gains a real
mutation, it gets this exact toast-and-undo shape, not a confirmation
modal.

## 12. Loading states

`components/ui/skeleton.tsx`. Never a bare spinner for a full-screen wait —
the workspace's loading state is a skeleton of the actual shell (titlebar,
explorer, canvas rows) so the layout doesn't jump when data arrives. A
spinner is only acceptable for a small, sub-second, in-place wait (e.g. a
drawing URL resolving before the canvas mounts).

## 13. Empty states

`components/ui/empty-state.tsx` everywhere data legitimately doesn't exist
yet. Same shape always: a brand-tinted icon chip, one line of title, one
line of description framed as what to do about it — never just "No data."
`compact` for anything inside a panel narrower than the full canvas.

## 14. Error states

`components/ui/error-state.tsx`. Same shape as EmptyState but
danger-toned, always offers `onRetry` when the failure is retriable. Never
an inline red sentence with no way forward.

## 15. Keyboard

One registry per surface via `lib/hooks/use-keyboard-shortcuts.ts` — no
page rolls its own `document.addEventListener('keydown', …)`. Global
workspace bindings (`workspace-shell.tsx`): `1`–`9` switch mode, `⌘[` opens
the Explorer, `⌘]` dismisses the Inspector, `⌘P` opens the quick switcher,
`Shift+?` opens the shortcuts reference. Every shortcut is discoverable in
one place (`shortcuts-dialog.tsx`) — if it's not listed there, it doesn't
exist.

## 16. Consistency check

Before adding any interaction to a new mode, ask: does an existing mode
already answer this? Reuse that answer. The Measurement Book, QCS, BOQ,
Pricing and Payments modes should feel like five views of one machine, not
five products that happen to share a color palette.
