"use client";

import type { ChartData, TabSpec } from "@/lib/chart-view/model";
import { chartSlideTitle, chartViewToPreview } from "@/lib/chart-view/to-preview";
import { chartItemId } from "@/lib/deck/tray";
import { AddToDeckButton } from "./add-to-deck-button";

// Add to deck for a table's chart view (the modal and the drawer): the view's
// current tab, as the slide it makes, from the page it was added on.

export function AddChartToDeck({ data, tab }: { data: ChartData; tab: TabSpec }) {
  const title = chartSlideTitle(data, tab);
  return (
    <AddToDeckButton
      itemId={chartItemId(data.eyebrow, data.title, tab.id)}
      label={`the ${title} chart`}
      make={() => ({
        id: chartItemId(data.eyebrow, data.title, tab.id),
        kind: "chart",
        title,
        from: {
          page: data.eyebrow.replace(/ · Mock$/, ""),
          href: `${window.location.pathname}${window.location.search}`.slice(0, 300),
        },
        preview: chartViewToPreview(data, tab.id),
      })}
    />
  );
}
