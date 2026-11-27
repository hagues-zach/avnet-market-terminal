# Add to deck: a server-side tray and per-user caps (design note)

Status: not built. Phases 1 to 3 keep the tray in the browser, because the app has no sign-in yet. This note says what the server-side version needs and where it would go, so it can be built with SSO (Step 3 of `docs/mvp-plan.md`).

## Why move it

- The tray, Claude's commentary, speaker notes, section titles and the executive summary live only in one browser's localStorage (`deck-tray-v1`, `deck-summary-v1`). A reader can't start a deck on a laptop and finish it on another machine, and clearing site data loses it.
- The Claude cap (`deckCallCap()` in `src/lib/deck/call-cap.ts`) is per server process: 20 uncached calls per 10 minutes, shared by everyone. One busy reader can use another's budget, and a restart resets it.
- Nobody's role is checked before a Claude call, because there is no user to check.

## What it needs from SSO

- A stable user id from the Entra ID token (the `oid` claim), available to route handlers. The middleware's password gate (`src/middleware.ts`, `src/lib/auth.ts`) is replaced by a session that carries it.
- The user's role (`global` or `market`, decision 4 in the MVP plan), from the same session.
- A server-side session check in each `/api/deck/tray/*` route: no session, 401; the page then sends the reader to sign in.

## Where it lives

- A new namespace in the existing store (`src/lib/store`, `Store` interface): `deck-tray-v2`, key = user id, value = `{ items: TrayItem[]; summary?: DeckSummary; updatedAt: string }`, validated with `TraySchema` and `DeckSummarySchema` on every read and write, the same schema the browser uses today. Works with the file, Databricks and Oracle adapters unchanged.
- One tray per user to start. Named decks ("Microchip QBR", "Board pack") would be `key = userId:deckId` with a small index entry per user; leave that for later.
- Oracle needs row-level security on the store table, or a dedicated `deck_trays` table with a `user_id` column and RLS, so a user only reads their own row (MVP decision 2). The generic key-value table can't enforce that by itself, so the dedicated table is the safer choice on Oracle.
- Routes: `GET /api/deck/tray` (the user's tray), `PUT /api/deck/tray` (the whole tray, with an `updatedAt` the client last saw, refused with 409 when the server's is newer, so two tabs don't overwrite each other). The commentary, storyline and export routes keep taking the tray in the body for now, then move to reading it from the store by user id, which removes the 1 MB body checks from the hot path.
- `src/components/deck/tray-provider.tsx` keeps its interface (`items`, `add`, `arrange`, `setCommentary`, `setSections` …). Only `readKey` and `writeKey` change: they talk to the routes, with localStorage kept as an offline cache.

## Migrating localStorage trays

- On the first signed-in load, if the server has no tray for the user and localStorage has one, the provider sends it with `PUT` (it passes `parseTray`, so a broken one is skipped) and, once the server answers 200, removes `deck-tray-v1` and `deck-summary-v1`.
- If both exist (a second browser signs in later), the server's wins and the page offers "Add the N slides from this browser" once, which appends them through `addItem` (duplicates by id are skipped, the 25-slide limit holds).
- Saved commentary keeps working as it is: every piece is re-grounded when a slide is built (`slidePreview`, `summaryPreview`, speaker notes), so moving it between stores doesn't widen what can ship.

## The per-user cap

- Replace the process-wide `deckCallCap()` with a cap keyed by user id, stored in the store (`deck-calls-v1`, key = user id, value = recent call times), so it survives restarts and is shared across server processes. Keep the process-wide cap as well, as a ceiling for the whole server.
- Suggested numbers to start: 20 uncached calls per user per hour, 200 per server per hour. A cache hit stays free.
- The 429 message names the user's own limit ("You've asked Claude for a lot in the last hour…").

## What role checks would gate

- Who may spend Claude calls on decks at all (Write commentary, Write again, Suggest an order): every signed-in role at launch; the check is the place to turn it off for a role if cost needs it.
- What Claude may read: a `market` user's tray can't hold Avnet performance slides, since those pages are hidden for that role (MVP decision 10). The tray routes should refuse an item whose `from.href` is a page the role can't open, so a slide added before a role change, or a forged one, isn't sent to Claude or shipped.
- The export: the same check before building the PowerPoint, so a `market` user can't ship a `global` slide from an old tray.

## Out of scope for this note

Sharing a deck with a colleague, comments on slides, and an audit log of what Claude wrote and who shipped it. Each would sit on the same `deck-tray-v2` record once it has a user id.
