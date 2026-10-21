# Custom dashboards plan

Let each user build their own dashboard from panels that already exist in the app: add, remove, move and resize them, and keep the layout between visits.

Status: **planned, not started.** Written 2026-10-21 from a read of the code at `38d7ab8`.

## What the code already gives us

- **Most panels are already self-contained.** The design passes split pages into named section components that fetch their own data, usually async server components with their own fallback. Examples: `GrowthCard` and `ReportingCard` (start), `SupplyRead`, `Prices` and `SuppliersSaying` (supply), `PeerKpis` and `ArrowCard` (share), `EndMarkets` and `DemandPlot` (customers), `ReportedCard` (performance). These can become widgets almost as they are.
- **One card frame.** `Panel` (and `Card`, `ChartCard` on top of it) gives every widget the same title, subtitle, actions and source/as-of footer.
- **Charts already fill their container.** Recharts `ResponsiveContainer` is used throughout, so charts follow a widget's width. Heights are mostly fixed props (`height = 240`) and will need to follow the widget instead.
- **A 12-column grid is already the rule** (DESIGN.md, "Grid and spacing"). The dashboard grid uses the same 12 columns and 16px gutters, so a custom dashboard looks like a native page.

## What is missing

1. **User identity.** The app has a shared password gate (`src/middleware.ts`, one cookie) and no users. A layout can only be "yours" if the app knows who you are.
2. **Somewhere to save layouts.** Nothing is saved on the server except line-card snapshots in local JSON (`src/lib/line-cards/store.ts`), which does not survive Vercel's read-only filesystem. The only saved preferences are `localStorage` (role tab, news watchlist).
3. **A drag and resize grid.** No library for it is installed.
4. **A widget registry.** No list of "panels you can add" exists.
5. **Some panels still need inputs or are too big.**
   - Needs props: TAM sections take `t: TamSummary` and `vintage`; `FeedCard` and `NextSteps` take `role`. Each needs a small wrapper that loads its own input, or a per-widget setting (for example, role).
   - Too big: `CycleView` (≈480 lines) and `SignalsView` are whole pages in one component. They need splitting into tiles (cycle phase, read tiles, indicator group) before they can be widgets.
   - Overview's panels are written inline in `overview/page.tsx` and would need extracting. It is a legacy page, so it is low priority.

## The key technical decision: server widgets inside a client grid

The widgets are **React Server Components** (async, streamed with Suspense). Drag and resize grids are **client components**. That is fine: a client component can take server-rendered children.

```
app/(terminal)/dashboard/page.tsx      (server)
  reads the user's layout
  renders <DashboardGrid layout={...}>  (client: drag, resize, edit mode)
    {layout.items.map(item =>
      <Suspense fallback={widget.fallback}><widget.Component {...item.config} /></Suspense>)}
  </DashboardGrid>
```

- **Moving and resizing** happens on the client and only changes `x, y, w, h`, so the server never re-renders.
- **Adding a widget** saves the new layout with a server action and calls `router.refresh()`, so the server renders the new widget. It streams in behind its fallback.
- **Removing** just drops the item on the client and saves.

So the existing panels can stay server components. Turning them into client components would lose the caching and streaming the live sources depend on.

## Decisions to make before starting

| Decision | Recommendation | Why |
|---|---|---|
| Grid library | **react-grid-layout** (check the current release supports React 19 before installing) | Drag, resize, collision, compaction and breakpoints out of the box; layout is plain JSON. Fallback if React 19 support is poor: **gridstack.js** in a client wrapper, or **dnd-kit** plus our own resize handles (more work, better keyboard support). |
| Where layouts live, v1 | **A cookie**, read on the server | Works today with no auth and no database, survives Vercel, and the server can read it to render the right widgets on the first request (`localStorage` can't, so the page would flash empty). A compact layout (`widgetId,x,y,w,h` × ~20) fits easily in 4 KB. Per browser, not per person. |
| Where layouts live, v2 | **Supabase `dashboards` table** once real sign-in exists | Per person, across devices, and allows several named dashboards and sharing. Build it in a dev/staging project; production Supabase is read-only. |
| Identity | Out of scope here. Plan v2 to go with whatever SSO the app adopts (likely Microsoft Entra ID for Avnet). | The layout store sits behind one interface, so swapping cookie for database is one file, the same pattern as `line-cards/store.ts`. |
| Where it lives in the nav | A new **"My dashboard"** item in the `home` pillar under Start Here. Start Here stays curated. | Keeps the curated, role-based page that new users need, and gives power users their own space. Later we can offer "Make Start Here my dashboard." |
| Edit model | **Explicit edit mode** (Edit → Done/Cancel) | Matches DESIGN.md's calm motion rules: nothing moves unless you asked for it. Prevents accidental drags while reading. |

## Data model

```ts
// src/lib/dashboard/model.ts
type WidgetId = string;                    // "supply.prices", "share.arrow", ...

interface LayoutItem {
  i: string;                               // instance id (a widget can appear twice with different config)
  widget: WidgetId;
  x: number; y: number; w: number; h: number;   // grid units: 12 columns, row height ~40px
  config?: Record<string, unknown>;        // validated by the widget's zod schema
}

interface Dashboard {
  version: 1;                              // bump and migrate when the shape changes
  items: LayoutItem[];
}
```

v2 table (Supabase, dev/staging only):

```sql
create table dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  name text not null default 'My dashboard',
  layout jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);
alter table dashboards enable row level security;
create policy "own dashboards" on dashboards using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Rules: validate every layout read with zod; ignore what fails rather than crashing. An unknown `widget` id renders a "This panel was removed" placeholder with a Remove button.

## Widget registry

```ts
// src/lib/dashboard/registry.tsx
interface WidgetDef {
  id: WidgetId;
  title: string;
  description: string;              // shown in the Add panel drawer
  pillar: Pillar;                   // groups the drawer like the nav
  Component: (props: { config?: unknown }) => Promise<React.ReactNode> | React.ReactNode;
  Fallback: () => React.ReactNode;
  size: { w: number; h: number; minW: number; minH: number; maxW?: number; maxH?: number };
  configSchema?: z.ZodType;         // e.g. role for the feed, company for earnings
  mock?: boolean;                   // keeps the hookup marker honest on a custom page
}
```

The registry imports server components, so it is server-only. The client drawer gets a plain list (`id, title, description, pillar, size`) passed as props.

### First widgets (about 12, all live or already self-contained)

| Widget | Source component | Work |
|---|---|---|
| Cycle banner | `start/CycleBanner` | none |
| Supply-chain growth | `start/GrowthCard` | none |
| Reporting this week | `start/ReportingCard` | none |
| What changed this week | `start/FeedCard` | `role` becomes a setting |
| Supply read | `supply/SupplyRead` | none |
| Prices | `supply/Prices` | none |
| What suppliers are saying | `supply/SuppliersSaying` | none |
| Avnet vs Arrow | `share/ArrowCard` | none |
| Peer KPIs | `share/PeerKpis` | none |
| End-market demand | `customers/EndMarkets`, `DemandPlot` | none |
| Reported results | `performance/ReportedCard` | none |
| Economic signals read | `signals/SignalsView` | split out the read tiles first |

Second wave: cycle tiles (split `CycleView`), TAM cards (wrapper that loads `TamSummary`), an earnings company card (company as a setting), top news stories, line-card moves.

## Changes to existing components

- **Height follows the widget.** `ChartCard` and the charts take a fixed `height`. Add a fill mode (`height="fill"`) so the chart takes the space left in the panel. Pages keep their fixed heights.
- **Widgets size to their box, not the window.** Panels that switch layout with `lg:` classes should switch on their own width instead: Tailwind 3.4's `@container` plugin (`@tailwindcss/container-queries`) gives `@lg:` classes. Convert as each panel becomes a widget.
- **No nested panels** (DESIGN.md). The widget *is* the `Panel`. The grid adds only a drag handle in the panel header and a resize corner, in edit mode.
- **Hookup markers stay.** A mock widget keeps its dashed marker on the dashboard.

## User experience

- **First visit**: start from a template rather than empty. Offer three (Seller, FAE, Leader), mirroring the Start Here role tabs.
- **Edit mode**: a drag handle in each panel header, a resize corner, an × to remove, an "Add panel" button that opens a drawer grouped by pillar with search, and "Reset to template."
- **Mobile (< 768px)**: one column in saved order; editing turned off, with "Edit on a larger screen."
- **Keyboard**: in edit mode, arrow keys move the focused panel and Shift+arrows resize it, with a live region that reads out the new position. react-grid-layout doesn't do this itself; it's a small handler on top.
- **Motion**: only the drag itself animates. Respect `prefers-reduced-motion`.

## Build phases

| Phase | Scope | Estimate |
|---|---|---|
| 0. Spike | Install the grid, confirm React 19 works, and prove server-rendered children inside it (move, resize, add with `router.refresh()`) on a throwaway route. **Stop if this fails** and switch library. | 0.5 day |
| 1. Foundation | `model.ts`, zod schema, cookie layout store behind a `getLayout` / `saveLayout` interface, registry with the 6 no-work widgets, `/dashboard` route and nav entry, view mode only | 2 days |
| 2. Editing | Edit mode, drag, resize, remove, Add panel drawer, save with a server action, reset, templates | 2–3 days |
| 3. Widget fit | `ChartCard` fill mode, container queries on the first 12 widgets, settings for `FeedCard`, split the signals read | 2–3 days |
| 4. Polish | Mobile stacking, keyboard moves, removed-widget placeholder, empty and error states, design pass against DESIGN.md, `web-design-guidelines` audit | 2 days |
| 5. Per-user (later) | Real sign-in, Supabase `dashboards` table with RLS, move cookie layouts over on first sign-in, several named dashboards | 3–4 days, after SSO |

**v1 (phases 0–4): about 9–11 working days.** Phase 5 depends on the sign-in work.

## Risks

- **React 19 support in the grid library.** That's why phase 0 is first.
- **Slow widgets.** Each widget streams on its own, so one slow source won't block the page. Several cold SEC or FRED sources on one dashboard could still feel slow on first load; the existing 6-hour caches mostly cover this.
- **Panels that look wrong small.** Set `minW`/`minH` per widget based on what it can actually show, not on a single default.
- **Cookie limits.** Cap a dashboard at 24 widgets and keep config small, or move to the database sooner.

## Tools to use when building

- **Superpowers** (brainstorm and plan, in plan mode): this is an architectural change across many files.
- **Stitch + UI UX Pro Max**: the edit-mode chrome and the Add panel drawer.
- **web-design-guidelines + Playwright CLI**: audit and click-test drag, resize and add before the PR.
- **Trail of Bits security review**: before phase 5, which adds user data and RLS.
