# Interactive explainers: ideas backlog

These ideas come from the 2026-11-26 session that started the KPI explain layer. The goal is to bring artifact-style visuals (interactive HTML and SVG with JS) into the terminal where they help people understand something, not as decoration.

**How to build them:** as React components inside the app, not embedded claude.ai artifacts. That way they get live data, theming, SSO and the Avnet brand rules, and they don't depend on anyone's personal Claude account.

**Rules that apply to all of them** (DESIGN.md):
- Motion is 2 of 10: nothing moves on its own, and only user-triggered changes animate, at 150 ms with reduced motion respected.
- Light only, semantic tokens, Avnet green for Avnet and dark blue for Arrow.
- No slash mark, middle dot or dash in copy.
- Every diagram needs a text alternative.
- Where it makes sense, give each diagram a static render so the deck tray can export it.

## 1. KPI explain layer (in progress)
A "what's this?" mark on KPI tiles that opens an interactive diagram filled with the company's own numbers.
- The pilot (Book-to-bill) is built on `claude/kpi-explain`.
- The plan for every other KPI is in `docs/design/kpi-explain/kpi-plan.md`.

## 2. Interactive technology primers (`/learn/[slug]`)
Replace each primer's static JPG with an explorable SVG:
- **Microcontrollers:** a chip block diagram. Clicking the core, flash or peripherals highlights it, says what it does and which spec matters, and links to that primer's "questions to ask".
- **SiC MOSFETs:** a comparison with silicon. A voltage or frequency slider shows the switching losses.
- **MLCCs:** a layer cutaway. Adding layers raises the capacitance.
- **FPGAs:** a grid of logic blocks you can "program" by clicking to wire up a small function.
- **Power management:** a power path from battery to rails, with the efficiency loss at each stage.
- **Connectors:** an exploded view with pitch and mating callouts.

Audience: FAEs and new sellers. Content lives in `src/lib/learn/content.ts` (`PRIMERS`), and the page is `src/app/(terminal)/learn/[slug]/page.tsx`. The A-Frame illustration style is allowed in the Learning Center.

## 3. Cycle position diagram (`/cycle`, `/signals`)
A cycle loop with a "you are here" marker and the stages labelled. Leading and lagging series sit as dots ahead of or behind the marker. A user-driven scrubber replays past cycles (the 2018 peak, the 2023 trough). It answers "where are we and what's next" in five seconds. The data is in `src/lib/cycle` and `data/cycle/output.json`.

## 4. Cycle engine walkthrough (`/signals/engine`)
A stepped walkthrough of the dense engine page: the reference cycle, which series lead it, how the composite index forms, and the backtest hits and misses. Each step changes the same chart, and the user steps through it (no scroll-triggered animation, to respect the motion rule). It builds trust in the methodology.

## 5. Supply chain flow map (`/supply-chain`, `/lead-times`)
A flow diagram from fab to OSAT to supplier to distributor to customer. Line thickness shows volume, and stretching lead times are marked. Hovering or focusing a node shows its lead time and allocation status. It answers "why is my customer's part late?"

## 6. Scenario Modeler cause-and-effect graph (`/forecast`)
Next to the sliders, a live node graph: end-market growth, then bookings, backlog and billings, with the edges updating as inputs change. It shows why the forecast moved, not just that it moved. Component: `src/components/scenario/modeler.tsx`.

## 7. Visual answers in Ask the Terminal (`/copilot`)
For conceptual questions ("what is a design registration?", "FPGA or ASIC?"), the answer includes a diagram picked from a library of approved templates. These are the explainer primitives from idea 1, not free-form HTML, so they stay on-brand and safe. Code: `src/lib/ask`, `src/components/ask/answer-view.tsx`.

## 8. Smaller ideas
- **Design Pipeline:** a funnel from registration to win to billing, showing where deals stall. This overlaps with the Phase 2 KPI funnel.
- **Line Cards:** an overlap matrix of distributors against suppliers, with white space highlighted.
- **Avnet vs Arrow:** an interactive head-to-head comparison.
- **TAM, SAM and SOM:** nested shapes that resize by segment. This overlaps with the Phase 3 KPI explainer.
- **Company profiles:** a "how this company makes money" diagram of segments to end markets.

## Suggested order after the KPIs
1. **Primers (2):** the most visible and the most like an artifact.
2. **Cycle position (3):** leaders' first question.
3. **Ask visual answers (7):** reuses the KPI primitives.
4. **Supply chain flow (5), cycle engine (4), scenario graph (6).**
5. **The smaller ideas (8)**, folded in where they overlap with KPI work.

## Known issues found along the way (proposed as separate tasks)
- The Add to deck button has a hydration mismatch (`disabled` and `aria-busy` differ between server and client).
- `text-body-strong` is used in about 15 files but never defined, so it has no effect.
