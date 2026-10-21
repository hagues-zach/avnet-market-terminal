import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageBody } from "@/components/layout/app-shell";
import { PageTitle } from "@/components/ui/page-title";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip, DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { HighlightBar } from "@/components/ui/highlight-bar";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { EmptyState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { BillingsChart, ErrorDemo, FilterDemo, SegmentTable, ShareChart } from "./kit-demos";

export const metadata: Metadata = { title: "Design kit · Avnet Market Intelligence" };

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-section-title text-ink">{title}</h2>
        {note && <p className="text-caption text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

// The component kit from DESIGN.md (step 1.5). Every figure here is example data.
export default function DesignKitPage() {
  return (
    <PageBody>
      <PageTitle
        title="Design kit"
        subtitle="Every shared component from DESIGN.md, on the new shell. Figures are examples, not real data."
        breadcrumb={[{ label: "Setup", href: "/data-hookups" }, { label: "Design kit" }]}
        actions={
          <>
            <ButtonLink href="/data-hookups" variant="ghost">
              Data hookups
            </ButtonLink>
            <Button variant="primary">
              <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Export
            </Button>
          </>
        }
      >
        <Chip>Example data</Chip>
        <Chip>Light mode</Chip>
      </PageTitle>

      <Tabs
        current="/design-kit"
        items={[
          { label: "Components", href: "/design-kit" },
          { label: "Start Here", href: "/start" },
          { label: "Market Share", href: "/market-share" },
        ]}
      />

      <Section title="Highlight bar" note="One per page at most, for the single message that matters. Never on dense data pages.">
        <HighlightBar>Book-to-bill is above 1.1 in Asia for the second quarter running.</HighlightBar>
      </Section>

      <Section title="KPI tiles" note="Label, figure, change, source. One figure size per row; changes never wrap.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile label="Billings Q3 FY26" value="$5.9B" delta={{ value: 0.032, period: "QoQ" }} source={{ status: "mock" }} />
          <KpiTile label="Book-to-bill" value="1.04" delta={{ value: 0.03, display: "0.03", period: "QoQ" }} source={{ status: "mock" }} />
          <KpiTile label="Inventory days" value="198" delta={{ value: 12, display: "12", period: "YoY", invert: true }} source={{ status: "live", label: "SEC 10-Q" }} asOf="Oct 20" />
          <KpiTile label="Gross margin" value="56.8%" note="Non-GAAP" delta={{ value: 0, display: "0 bps", period: "QoQ" }} source={{ status: "live", label: "SEC 10-Q" }} />
        </div>
        <HookupMarker ids={["billings", "bookings"]} />
      </Section>

      <Section title="Filter bar" note="One row above what it filters. Selects are square; applied filters can be removed.">
        <FilterDemo />
      </Section>

      <Section title="Charts" note="Avnet is always green and Arrow always Dark Blue. Lines are labelled at their end; every chart has a source and as-of date.">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ShareChart />
          </div>
          <div className="lg:col-span-4">
            <BillingsChart />
          </div>
        </div>
      </Section>

      <Section title="Data table" note="Sticky header, sortable columns, right-aligned figures, compact or comfortable rows.">
        <Panel title="Share by segment" subtitle="Memory is the largest market where Avnet's share is low." footer={<SourceLine source="Example data" asOf="Oct 20, 2026" />}>
          <SegmentTable />
        </Panel>
      </Section>

      <Section title="Buttons, chips and changes">
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Remove</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
            <Chip>Franchised</Chip>
            <Chip>SEC filer</Chip>
            <Chip tone="positive">Improving</Chip>
            <Chip tone="negative">Weakening</Chip>
            <Chip tone="warning">Estimated</Chip>
            <DataChip status="live" label="SEC EDGAR" />
            <DataChip status="mock" />
            <DataChip status="planned" label="Gartner" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-hairline pt-4">
            <Delta value={0.032} period="QoQ" />
            <Delta value={-0.018} period="QoQ" />
            <Delta value={-4} display="4 days" period="QoQ" invert />
            <Delta value={0} display="0 bps" period="QoQ" />
          </div>
        </Panel>
      </Section>

      <Section title="Loading, empty and error" note="Loading is shaped like the final layout. Empty says why, with one action. Errors name the source and offer a retry.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Loading">
            <div className="space-y-3">
              <Skeleton className="h-7 w-24" />
              <LoadingBlock label="Loading filings" />
            </div>
          </Panel>
          <Panel title="Empty">
            <EmptyState
              title="No franchise changes this quarter"
              body="Line card snapshots are compared weekly. The next comparison runs on Monday."
              action={<ButtonLink href="/line-cards">Open line cards</ButtonLink>}
            />
          </Panel>
          <Panel title="Error">
            <ErrorDemo />
          </Panel>
        </div>
      </Section>
    </PageBody>
  );
}
