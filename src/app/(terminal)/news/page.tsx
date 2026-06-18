"use client";

import { useMemo, useState } from "react";
import { Newspaper } from "lucide-react";
import { dataProvider } from "@/lib/data/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NewsPage() {
  const { value: n } = dataProvider.getNews();
  const [tag, setTag] = useState<string>("All");

  const articles = useMemo(
    () => (tag === "All" ? n.articles : n.articles.filter((a) => a.tag === tag)),
    [n.articles, tag],
  );
  const tabs = ["All", ...n.tags];
  const [featured, ...rest] = articles;

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Market News" subtitle="Curated, source-attributed coverage of the semiconductor market" />

      {/* filter tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={cn(
              "rounded px-2.5 py-1 font-display text-2xs uppercase tracking-wider transition-colors duration-200 cursor-pointer",
              tag === t ? "bg-ink text-white" : "text-muted hover:bg-canvas",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {articles.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-muted">No articles for this filter.</p>
        </Card>
      ) : (
        <>
          {/* featured */}
          {featured && (
            <Card source="mock">
              <div className="flex items-start gap-3">
                <span className="rounded border border-line px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-avnet-greenDark">
                  {featured.tag}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg uppercase tracking-wide text-ink">{featured.title}</h2>
                  <p className="mt-1 text-sm text-muted">{featured.summary}</p>
                  <p className="mt-1.5 text-2xs text-gray-medium">{featured.outlet} · {featured.date}</p>
                </div>
              </div>
            </Card>
          )}

          {/* list */}
          <Card title="Latest" subtitle={`${articles.length} stories`} source="mock">
            <ul className="divide-y divide-line">
              {rest.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 w-24 shrink-0">
                    <span className="rounded border border-line px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-muted">
                      {a.tag}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="mt-0.5 text-2xs text-muted">{a.summary}</p>
                    <p className="mt-1 text-2xs text-gray-medium">{a.outlet} · {a.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <p className="flex items-center gap-1.5 px-1 text-2xs text-muted">
        <Newspaper className="h-3.5 w-3.5" />
        Demo feed is curated mock; production pulls source-attributed headlines filtered to Avnet&apos;s served segments.
      </p>
    </div>
  );
}
