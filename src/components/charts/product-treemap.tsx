"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { CHART, chartSeriesColor, labelOn } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import { PRODUCT_LABEL, type ProductCategory } from "@/lib/data/types";

interface CellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name?: string;
  value?: number;
}

function TreemapCell(props: CellProps) {
  const { x, y, width, height, index, name, value } = props;
  if (width <= 0 || height <= 0) return null;
  const fill = chartSeriesColor(index);
  const ink = labelOn(fill);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} />
      {width > 64 && height > 32 && (
        <>
          <text x={x + 8} y={y + 18} fontSize={12} fill={ink} style={{ fontFamily: "var(--font-oswald)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            {name}
          </text>
          <text x={x + 8} y={y + 33} fontSize={11} fill={ink} style={{ fontVariantNumeric: "tabular-nums" }}>
            {value != null ? formatUsdMillions(value) : ""}
          </text>
        </>
      )}
    </g>
  );
}

export function ProductTreemap({ data }: { data: { product: ProductCategory; usdM: number }[] }) {
  const nodes = [...data]
    .sort((a, b) => b.usdM - a.usdM)
    .map((d) => ({ name: PRODUCT_LABEL[d.product], size: d.usdM }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <Treemap data={nodes} dataKey="size" nameKey="name" isAnimationActive={false} content={<TreemapCell {...({} as CellProps)} />}>
        <Tooltip formatter={(v: number) => [formatUsdMillions(v), "2025 market"]} contentStyle={CHART.tooltip} />
      </Treemap>
    </ResponsiveContainer>
  );
}
