import { Suspense } from "react";
import Link from "next/link";
import { aiConfigured } from "@/lib/ai/claude";
import { answer } from "@/lib/ask/answer";
import { askClaude } from "@/lib/ask/claude";
import { ANSWERERS, route } from "@/lib/ask/route";
import { PageBody } from "@/components/layout/page-body";
import { DataChip } from "@/components/ui/chip";
import { PageTitle } from "@/components/ui/page-title";
import { LoadingBlock } from "@/components/ui/states";
import { AnswerView } from "@/components/ask/answer-view";
import { AskedThisSession } from "@/components/ask/history";
import { cn } from "@/lib/utils";

// Ask the Terminal (PRD 10.2): a question goes to the answerer that covers it
// (src/lib/ask), and the answer comes back from the app's own data with its
// sources and page. The question lives in the URL (?q=), so answers can be shared.
// Questions the rules can't route go to Claude (step 3.2), which answers with the
// same answerers as tools; "Ask Claude instead" (?claude=1) sends a routed one too.

export const dynamic = "force-dynamic";

const link = "text-ink underline-offset-2 hover:underline";
const ask = (q: string) => `/copilot?q=${encodeURIComponent(q)}`;

async function Answered({ q, byClaude }: { q: string; byClaude: boolean }) {
  return <AnswerView a={await (byClaude ? askClaude(q) : answer(q))} claudeOn={aiConfigured()} />;
}

export default async function AskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = params.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 200) ?? "";
  const intent = q ? route(q)?.intent : undefined;
  const claudeOn = aiConfigured();
  const byClaude = Boolean(q) && claudeOn && (!intent || params.claude === "1");
  const next = ANSWERERS.filter((a) => a.intent !== intent).slice(0, 3);

  return (
    <PageBody>
      <PageTitle title="Ask the Terminal" subtitle="Straight answers from the app's data, each with its source and the page it came from" />

      <p className="text-pretty text-xl leading-snug text-ink">
        Ask about a company, Avnet against Arrow, the cycle, the economy, supply, the earnings season, news or line cards.
      </p>

      <form action="/copilot" method="get" role="search" className="rounded-sm border border-hairline bg-surface px-4 py-3">
        <label htmlFor="ask-q" className="font-display text-label uppercase text-ink-muted">
          Your question
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="ask-q"
            name="q"
            type="search"
            defaultValue={q}
            autoComplete="off"
            maxLength={200}
            placeholder="How is Microchip doing?…"
            className="h-control min-w-0 flex-1 border-0 border-b border-hairline bg-surface-sunken px-3 font-body text-body text-ink focus:border-ink"
          />
          <button type="submit" className="h-control bg-primary px-4 font-body text-button text-primary-fg hover:brightness-95 active:brightness-90">
            Ask
          </button>
        </div>
        <p className="mt-2 text-caption text-ink-muted">
          {claudeOn
            ? "Answers come from the app's live data. Questions the rules can't match go to Claude, which reads the same data."
            : "Answers are written by rules from the app's live data. Nothing is generated."}
        </p>
      </form>

      {q && (
        <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
          <div className="space-y-3 xl:col-span-8">
            <Suspense
              key={`${q} ${byClaude}`}
              fallback={
                <LoadingBlock
                  label={
                    byClaude
                      ? "Claude is reading the app's data… This can take half a minute."
                      : "Reading the app's data… The first answer after a restart can take a minute."
                  }
                  lines={6}
                />
              }
            >
              <Answered q={q} byClaude={byClaude} />
            </Suspense>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
              <span className="text-ink-muted">Ask next:</span>
              {next.map((a) => (
                <Link key={a.intent} href={ask(a.example)} className={cn(link, "underline")}>
                  {a.example}
                </Link>
              ))}
            </p>
          </div>
          <div className="xl:col-span-4">
            <AskedThisSession current={q} />
          </div>
        </div>
      )}

      <section aria-labelledby="what" className="space-y-3">
        <h2 id="what" className="font-display text-section-title text-ink">
          What you can ask
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ANSWERERS.map((a) => (
            <li key={a.intent} className="flex flex-col rounded-sm border border-hairline bg-surface px-4 py-3">
              <h3 className="text-body-strong text-ink">{a.title}</h3>
              <p className="mt-0.5 flex-1 text-body-sm text-ink-muted">{a.what}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Link href={ask(a.example)} className={cn(link, "text-body-sm underline")}>
                  {a.example}
                </Link>
                <DataChip status={a.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {!claudeOn && (
        <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
          <DataChip status="planned" />
          Claude answers free questions from the same data once ANTHROPIC_API_KEY is set. Claude text already written for the app (earnings
          summaries, why a story matters) is quoted where it exists and labelled as Claude&apos;s.
        </p>
      )}
    </PageBody>
  );
}
