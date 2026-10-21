"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEETING_LABELS, type Meeting } from "@/lib/qbr/setup";

interface Option {
  slug: string;
  name: string;
  group: string;
}

const field = "h-control border border-hairline bg-surface px-2.5 text-body-sm text-ink";

/** One row: company, meeting, date, focus, and the button that (re)builds the brief. */
export function SetupBar({
  companies,
  initial,
}: {
  companies: Option[];
  initial: { company: string; meeting: Meeting; date: string; focus: string };
}) {
  const router = useRouter();
  const [company, setCompany] = useState(initial.company);
  const [meeting, setMeeting] = useState<Meeting>(initial.meeting);
  const [date, setDate] = useState(initial.date);
  const [focus, setFocus] = useState(initial.focus);
  const groups = [...new Set(companies.map((c) => c.group))];
  const built = Boolean(initial.company);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    const q = new URLSearchParams({ company, meeting });
    if (date) q.set("date", date);
    if (focus.trim()) q.set("focus", focus.trim());
    router.push(`/tools/qbr?${q.toString()}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-sm border border-hairline bg-surface p-3 print:hidden" aria-label="Set up the brief">
      <label className="flex flex-col gap-1">
        <span className="font-display text-label uppercase text-ink-muted">Company</span>
        <select name="company" value={company} onChange={(e) => setCompany(e.target.value)} className={`${field} min-w-[12rem]`} required>
          <option value="">Choose a company…</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {companies
                .filter((c) => c.group === g)
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-display text-label uppercase text-ink-muted">Meeting</span>
        <select name="meeting" value={meeting} onChange={(e) => setMeeting(e.target.value as Meeting)} className={field}>
          {(Object.keys(MEETING_LABELS) as Meeting[]).map((m) => (
            <option key={m} value={m}>
              {MEETING_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-display text-label uppercase text-ink-muted">Date</span>
        <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </label>
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
        <span className="font-display text-label uppercase text-ink-muted">Focus</span>
        <input
          type="text"
          name="focus"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. allocation on 32-bit MCUs…"
          maxLength={200}
          autoComplete="off"
          className={`${field} placeholder:text-ink-muted`}
        />
      </label>
      <Button type="submit" variant={built ? "secondary" : "primary"} disabled={!company}>
        <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        {built ? "Rebuild" : "Build the brief"}
      </Button>
    </form>
  );
}
