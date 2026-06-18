"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SourceChip } from "@/components/ui/source-chip";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/data/types";

interface Citation { label: string; source: DataSource }
interface Msg { role: "user" | "assistant"; text: string; citations?: Citation[] }

// Scripted, source-cited answers grounded in the terminal's displayed data. Keyword
// matching for the demo; production routes to the Claude API with tool-calling over
// the same data layer (so attribution is a property of retrieval, not a prompt).
const SCRIPTS: { match: string[]; text: string; citations: Citation[] }[] = [
  {
    match: ["forecast", "2026", "driving", "outlook"],
    text: "WSTS projects the 2026 market at ~$975.5B (+26% YoY), led by Logic ($295.9B, +39.9% in 2025) and Memory ($211.6B, +34.8%) on AI and data-center demand. Notably, WSTS revised the 2026 number up from $760.7B in Spring 2025 — a sharp upward revision.",
    citations: [{ label: "TAM / Forecast", source: "wsts" }, { label: "Segment growth", source: "sia" }],
  },
  {
    match: ["memory", "dram", "hbm"],
    text: "Memory was the 2nd-largest category at $211.6B in 2025 (+34.8% YoY), driven by HBM and DRAM pricing recovery tied to AI accelerators. It's the most cyclical segment — the stacked-area trend shows it swelling in up-cycles and contracting in 2023's correction.",
    citations: [{ label: "TAM by product", source: "wsts" }, { label: "2025 sales", source: "sia" }],
  },
  {
    match: ["avnet", "share", "channel", "distribut", "som"],
    text: "Avnet's distribution share is modeled at ~9.8% of the ~$176B authorized-distribution channel, ranking #4 globally behind WT, WPG and Arrow. Semiconductors are 78.6% of channel revenue. Note: Avnet's exact share is modeled here — production joins internal billings to the channel data.",
    citations: [{ label: "Channel size & mix", source: "ecia" }, { label: "Avnet share (modeled)", source: "mock" }],
  },
  {
    match: ["recession", "risk", "rate", "macro", "fed", "signal"],
    text: "Polymarket implies ~21% odds of an NBER-dated US recession in 2026 (down 3 points on the week). Coincident signals are mixed: ISM PMI is 49.1 (sub-50 = contraction), Fed funds at 4.50% and easing, and the semiconductor IP index is at a cycle high.",
    citations: [{ label: "Recession odds", source: "polymarket" }, { label: "PMI / rates / IP", source: "fred" }],
  },
  {
    match: ["region", "asia", "americas", "geograph"],
    text: "Asia-Pacific is the largest region by billings, with the Americas second; Europe and Japan follow. The region donut on the TAM page shows the full split for 2025.",
    citations: [{ label: "TAM by region", source: "wsts" }],
  },
];

const SUGGESTIONS = [
  "What's driving the 2026 forecast?",
  "How is memory trending?",
  "What is Avnet's channel share?",
  "What's the 2026 recession risk?",
];

function answer(q: string): Msg {
  const ql = q.toLowerCase();
  const hit = SCRIPTS.find((s) => s.match.some((m) => ql.includes(m)));
  if (hit) return { role: "assistant", text: hit.text, citations: hit.citations };
  return {
    role: "assistant",
    text: "That isn't on the terminal right now — I only answer from the data shown, and I'll flag when I can't. Try asking about the TAM, the 2026 forecast, a product segment (logic/memory/analog), Avnet's channel share, or the economic signals.",
  };
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "I'm Market Copilot. Ask me about the semiconductor market data on this terminal — I answer only from what's displayed and cite the source for every claim.",
    },
  ]);
  const [input, setInput] = useState("");

  function ask(q: string) {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }, answer(q)]);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col p-5">
      <PageHeader title="Market Copilot" subtitle="Ask the market data — grounded in what's on the terminal, with source attribution" />

      <Card className="mt-5 flex min-h-0 flex-1 flex-col" bodyClassName="flex min-h-0 flex-1 flex-col gap-4">
        {/* messages */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-card px-3.5 py-2.5 text-sm", m.role === "user" ? "bg-ink text-white" : "border border-line bg-canvas text-ink")}>
                {m.role === "assistant" && (
                  <span className="mb-1 flex items-center gap-1.5 font-display text-2xs uppercase tracking-wider text-avnet-greenDark">
                    <Sparkles className="h-3 w-3" /> Copilot
                  </span>
                )}
                <p>{m.text}</p>
                {m.citations && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-2xs uppercase tracking-wider text-muted">Sources:</span>
                    {m.citations.map((c, j) => (
                      <span key={j} className="flex items-center gap-1">
                        <SourceChip source={c.source} />
                        <span className="text-2xs text-muted">{c.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* suggestions */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line px-3 py-1 text-xs text-ink/80 transition-colors duration-200 hover:border-avnet-green hover:bg-avnet-green/5 cursor-pointer">
              {s}
            </button>
          ))}
        </div>

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the market data…"
            aria-label="Ask Market Copilot"
            className="flex-1 rounded border border-line px-3 py-2 text-sm placeholder:text-gray-medium focus:border-avnet-green focus:outline-none focus:ring-2 focus:ring-avnet-green/30"
          />
          <button type="submit" disabled={!input.trim()} className="flex items-center gap-1.5 rounded bg-avnet-green px-3 py-2 font-display text-sm uppercase tracking-wide text-white transition-colors duration-200 hover:bg-avnet-greenDark disabled:opacity-50 cursor-pointer">
            <Send className="h-4 w-4" /> Ask
          </button>
        </form>
      </Card>

      <p className="mt-3 text-2xs text-muted">
        Demo uses scripted, source-cited responses. Production routes to the Claude API with tool-calling over this terminal&apos;s
        data layer — so every answer is grounded in displayed figures, cites its source, and abstains when the data isn&apos;t shown.
      </p>
    </div>
  );
}
