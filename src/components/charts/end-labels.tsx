import type { ReactElement } from "react";
import { Customized } from "recharts";
import { CHART } from "@/lib/colors";

// End-of-line labels for line charts, placed from the chart's own computed
// points so they can be spaced apart: each label starts at its line's last
// value, then labels are pushed apart until there is a small gap between them,
// staying inside the plot. Recharts reads Customized from the chart's direct
// children, so this returns the element: {endLabels(...)}, after the lines.

type Point = { x?: number; y?: number; value?: unknown };
type Item = { item: { props: { dataKey?: unknown; hide?: boolean } }; props: { points?: Point[] } };
type LayerProps = { formattedGraphicalItems?: Item[]; offset?: { top: number; height: number } };

/** Label text for a series' last value, or null for no label. */
export type EndLabelText = (dataKey: string, value: number) => string | null;

/** Centres (px, larger is lower) moved apart to at least `gap`, kept within [lo, hi] where they fit. */
export function spread(ys: number[], gap: number, lo = -Infinity, hi = Infinity): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed = order.map((o) => o.y);
  for (let n = 0; n < placed.length; n++) placed[n] = Math.max(placed[n], n === 0 ? lo : placed[n - 1] + gap);
  // Pushed past the bottom: walk back up from the bottom edge.
  for (let n = placed.length - 1; n >= 0; n--) placed[n] = Math.min(placed[n], n === placed.length - 1 ? hi : placed[n + 1] - gap);
  const out = new Array<number>(ys.length);
  order.forEach((o, n) => (out[o.i] = placed[n]));
  return out;
}

function EndLabelLayer({ formattedGraphicalItems = [], offset, text, fontSize }: LayerProps & { text: EndLabelText; fontSize: number }) {
  const ends = formattedGraphicalItems.flatMap((g) => {
    if (g.item.props.hide) return [];
    const last = [...(g.props.points ?? [])].reverse().find((p) => typeof p.value === "number" && typeof p.y === "number");
    const label = last && text(String(g.item.props.dataKey), last.value as number);
    return last && label ? [{ x: last.x ?? 0, y: last.y!, label }] : [];
  });
  if (!ends.length) return null;
  const half = fontSize / 2;
  const ys = spread(
    ends.map((e) => e.y),
    fontSize + 5,
    offset ? offset.top + half : -Infinity,
    offset ? offset.top + offset.height - half : Infinity,
  );
  return (
    <g>
      {ends.map((e, i) => (
        <text key={i} x={e.x + 8} y={ys[i]} dy={fontSize * 0.35} fontSize={fontSize} fill={CHART.label}>
          {e.label}
        </text>
      ))}
    </g>
  );
}

/** Spaced end-of-line labels for every line in the chart. */
export function endLabels(text: EndLabelText, { fontSize = CHART.tickFontSize }: { fontSize?: number } = {}): ReactElement {
  return <Customized key="end-labels" component={(p: LayerProps) => <EndLabelLayer {...p} text={text} fontSize={fontSize} />} />;
}
