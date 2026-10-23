import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import {
  ByCategory,
  ChainInventory,
  OrderBook,
  Prices,
  SectionFallback,
  SuppliersSaying,
  SupplyNews,
  SupplyRead,
  SupplyReadFallback,
} from "@/components/supply/sections";

// Rendered per request; the signals, filings and news underneath are cached.
export const dynamic = "force-dynamic";

export default function SupplyChainPage() {
  return (
    <PageBody>
      <PageTitle title="Supply Chain" subtitle="Whether component supply is tightening or easing, and what it means for Avnet's order book" />
      <Suspense fallback={<SupplyReadFallback />}>
        <SupplyRead />
      </Suspense>
      <Suspense fallback={<SectionFallback title="By category" />}>
        <ByCategory />
      </Suspense>
      <div className="grid gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Suspense fallback={<SectionFallback title="Inventory in the chain" className="xl:col-span-7" />}>
          <ChainInventory />
        </Suspense>
        <Suspense fallback={<SectionFallback title="Prices and inputs" className="xl:col-span-5" />}>
          <Prices />
        </Suspense>
      </div>
      <div className="grid gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Suspense fallback={<SectionFallback title="What suppliers are saying" className="xl:col-span-7" />}>
          <SuppliersSaying />
        </Suspense>
        <Suspense fallback={<SectionFallback title="Supply news" className="xl:col-span-5" />}>
          <SupplyNews />
        </Suspense>
      </div>
      <OrderBook />
      <p className="text-caption text-ink-muted">
        The read scores three live signals on a year ago: chip capacity utilisation (tighter above +1 point, looser below −1), semiconductor producer
        prices (tighter above +2%, looser below −2%) and inventory days in the chain, the mean of the manufacturer and distributor medians (tighter
        when down more than 3 days, looser when up more than 3). Two or more tighter with none looser reads tightening; the reverse reads easing;
        anything else is mixed. Utilisation is from the Federal Reserve&apos;s G.17 release, prices from BLS and the IMF, inventory from SEC filings.
        Lead times, Avnet&apos;s purchase orders, backlog and book-to-bill are mock until they are hooked up. Supplier summaries are written by Claude
        from each earnings release.
      </p>
    </PageBody>
  );
}
