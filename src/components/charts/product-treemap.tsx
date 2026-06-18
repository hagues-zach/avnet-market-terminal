"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { chartSeriesColor } from "@/lib/colors";
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
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} />
      {width > 64 && height > 32 && (
        <>
          <text x={x + 8} y={y + 18} fontSize={12} fill="#fff" style={{ fontFamily: "var(--font-oswald)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            {name}
          </text>
          <text x={x + 8} y={y + 33} fontSize={11} fill="#fff" opacity={0.92} style={{ fontVariantNumeric: "tabular-nums" }}>
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
        <Tooltip formatter={(v: number) => [formatUsdMillions(v), "2025 market"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
      </Treemap>
    </ResponsiveContainer>
  );
}
