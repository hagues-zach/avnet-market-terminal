"use client";

import { useState } from "react";
import { Panel, SourceLine } from "./panel";
import { Segmented } from "./tabs";

/**
 * A panel for one chart: title, the takeaway line, the chart, then source and
 * as-of. Pass `table` to give the chart a table view, which DESIGN.md requires
 * whenever chart colours fall below 3:1 without direct labels.
 */
export function ChartCard({
  title,
  subtitle,
  source,
  asOf,
  table,
  height = 240,
  footerExtra,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  source: string;
  asOf?: string;
  table?: React.ReactNode;
  /** Chart height in px; the chart should fill it. */
  height?: number;
  footerExtra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      className={className}
      actions={
        table ? (
          <Segmented
            label={`${title} view`}
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        ) : undefined
      }
      footer={
        <SourceLine source={source} asOf={asOf}>
          {footerExtra}
        </SourceLine>
      }
    >
      {view === "chart" || !table ? <div style={{ height }}>{children}</div> : table}
    </Panel>
  );
}
