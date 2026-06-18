# HomeQuote Network — Design System

The standards every screen follows. All UI work must use the Claude Frontend
Design skill and conform to this document. Reusable primitives live in
`components/ui/` — prefer them over re-implementing layout.

## Design language

- **Foundation:** shadcn/ui (new-york) on Tailwind v4, `zinc` base, Manrope.
- **Signature — money is the only color.** Monetary values (revenue, commission,
  amounts owed, won-sale amounts) render in **emerald**. Everything else stays
  neutral zinc. Color marks money and nothing else, so the numbers that matter
  most are the first thing the eye finds.
- **Calm by default, bold in one place.** Strong hierarchy through size, weight,
  and spacing — not through decoration.

## Page layout standards

- Page root: vertical rhythm of `space-y-6` (dense admin pages) to `space-y-8`
  (dashboards). Dashboards may use `mx-auto max-w-7xl`.
- Every page opens with `<PageHeader>` (title + optional description + actions).
- Primary action sits top-right in the header as a solid button; secondary
  actions are `variant="outline"`.
- Detail/sub pages use the header `backHref`/`backLabel` for the back link.

## PageHeader (`components/ui/page-header.tsx`)

- `title` — `text-2xl font-semibold tracking-tight`.
- `description` — one muted line; explain the page's job, not the schema.
- `children` — right-aligned action buttons.

## Card standards (`components/ui/card.tsx`)

- Use `Card` for every grouped surface. Section title via `CardTitle`
  (`text-base` for sub-sections, default for primary).
- Add `border-b` to `CardHeader` only when the card contains a table.
- Tables inside cards: wrap with `<Card className="p-0">`.

## KPI card standards (`components/ui/kpi-card.tsx`)

- 3–4 primary KPIs per row maximum. Never crowd a row with 6–7 tiles.
- Label: `text-xs font-medium uppercase tracking-wider text-muted-foreground`.
- Value: `text-3xl font-semibold tabular-nums tracking-tight`.
- Monetary KPI: pass `accent="money"` (emerald value + emerald icon chip + tint).
- Optional `sub` line for context (e.g. "12% close rate").
- Grid: `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4`.

## Table standards (`components/ui/table.tsx`)

- Headers: uppercase, `text-xs`, tracked, muted, on `bg-muted/40`.
- Cells: `px-4 py-3`, comfortable row height, hover highlight on rows.
- Money columns: right-aligned, `tabular-nums`; emerald when it's earned money.
- First column links to the record (`font-medium hover:underline`); a muted
  sub-line underneath carries secondary detail (email, vertical · city).
- Status shown via `Badge` / `StatusBadge`, never raw text.

## Form standards

- Group fields in `Card`s by topic (Contact, Property, Service, …).
- Field: `<Label>` + control, stacked, `space-y-1.5`; grids `sm:grid-cols-2`.
- Required fields marked with `*`. Helper text is `text-xs text-muted-foreground`.
- Submit is a solid button; show inline `text-destructive` errors and a brief
  `text-emerald-600` "Saved." confirmation.
- Use `useActionState` for create/edit; void server actions for inline updates.

## Empty state standards (`components/ui/empty-state.tsx`)

- Dashed-border card, centered: icon chip, short title, one directive line, and
  (where useful) the primary action. Copy invites action — never a dead end.

## Button hierarchy

- **Primary** (`default`, solid): the one main action per view.
- **Secondary** (`outline`): supporting actions.
- **Tertiary** (`ghost`): low-emphasis / icon actions (row menus, deletes).
- **Destructive**: only behind a `ConfirmAction` dialog (suspend/disable/delete).
- Buttons carry a leading icon where it aids scanning; sentence-case labels that
  name the outcome ("Create user", "Record sale").

## Typography rules

- Display/headings: Manrope, `font-semibold`, `tracking-tight`.
- Page title `text-2xl`; card/section titles `text-base`–default.
- Body `text-sm`; secondary/meta `text-xs text-muted-foreground`.
- All numeric/metric values use `tabular-nums`.

## Spacing rules

- Page sections: `space-y-6`/`space-y-8`. Grid gaps: `gap-4` (KPIs), `gap-6`
  (main content columns). Card padding: `p-5`/`p-6`.
- Avoid horizontal crowding: give wide layouts room; cap dashboards at `max-w-7xl`.

## Mobile / responsive rules

- KPI grids: 2 cols on mobile → 4 on `lg`.
- Main content: single column on mobile; multi-column splits at `lg`
  (e.g. `lg:grid-cols-10` → 7/3, or `lg:grid-cols-3` → 2/1).
- Tables scroll horizontally on small screens (built into `Table`).
- Targets stay tappable; keyboard focus visible; respect reduced motion.
