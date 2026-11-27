"use client";

import Link from "next/link";
import { columnHelp, type ColumnKey } from "@/lib/explain/columns";
import { isHidden } from "@/lib/visibility";
import { ExplainPopover } from "./explain-popover";

// The explainer mark for a numeric table column: how to read the column, the
// glossary definition and the formula. No diagram, since a column spans many
// rows. The panel floats, so the table's scrolling box doesn't clip it.

const LEARN = "/learn#glossary";

export function ExplainColumn({ column }: { column: ColumnKey }) {
  const h = columnHelp(column);
  return (
    <ExplainPopover label={`Explain ${/^Avnet\b/.test(h.name) ? h.name : h.name.charAt(0).toLowerCase() + h.name.slice(1)}`} title={h.name} float className="align-middle">
      <div data-explain-focus tabIndex={-1} className="space-y-3 px-4 pb-3 pt-3 focus-visible:outline-none">
        <p className="text-pretty text-body font-semibold text-ink">{h.read}</p>
        <div className="space-y-2 border-t border-hairline pt-2">
          <p className="text-caption text-ink-muted">{h.definition}</p>
          {h.formula && <p className="text-caption text-ink">{h.formula}</p>}
          {!isHidden(LEARN) && (
            <Link href={LEARN} className="text-caption text-ink underline underline-offset-2 hover:no-underline">
              More in the glossary
            </Link>
          )}
        </div>
      </div>
    </ExplainPopover>
  );
}
