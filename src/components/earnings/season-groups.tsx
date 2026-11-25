import Link from "next/link";
import { getAllEarnings } from "@/lib/data/live/earnings";
import { getEarningsCalendar } from "@/lib/data/live/earnings-calendar";
import { COHORT_LABELS, isUsFiler } from "@/lib/data/live/earnings-model";
import { previousQuarter, seasonByGroup } from "@/lib/earnings/leaderboard";
import { seasonQuarter } from "@/lib/earnings/season";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Delta } from "@/components/ui/delta";
import { NA, format } from "./format";

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
const days = (v: number) => {
  const n = Math.abs(Math.round(v));
  return `${n} ${n === 1 ? "day" : "days"}`;
};

/** Server component: the season group by group, from every US filer's filed quarters. */
export async function SeasonByGroup() {
  const [earnings, calendar] = await Promise.all([getAllEarnings(), getEarningsCalendar()]);
  const all = earnings.filter((e) => isUsFiler(e.company));
  // The calendar's date, so this and the season overview agree on the quarter.
  const quarter = seasonQuarter(calendar.today);
  const groups = seasonByGroup(all, quarter);
  const prior = previousQuarter(quarter);

  return (
    <Panel
      title="Season by group"
      subtitle={`${quarter} against ${prior}. Growth is the median company's revenue on a year ago; a group's name opens it in the leaderboard`}
      bodyClassName="p-0"
      footer={<SourceLine source="SEC filings, GAAP as reported" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse font-body text-table">
          <caption className="sr-only">Each group's progress through the {quarter} season and its median figures</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={`${TH} text-left`}>
                Group
              </th>
              <th scope="col" className={`${TH} text-left`}>
                Filed the quarter
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Median growth, {quarter}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {prior}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Growing
              </th>
              <th scope="col" className={`${TH} text-right`} title="Median change in inventory days on a year ago, among those filed">
                Inventory days, YoY
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const change = g.medianGrowth !== undefined && g.priorMedianGrowth !== undefined ? g.medianGrowth - g.priorMedianGrowth : undefined;
              return (
                <tr key={g.cohort} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    <Link href={`/earnings?view=leaderboard&group=${g.cohort}`} className="text-ink underline-offset-2 hover:underline">
                      {COHORT_LABELS[g.cohort]}
                    </Link>
                  </th>
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-2">
                      <span className="w-14 tabular-nums text-ink">
                        {g.filed} of {g.total}
                      </span>
                      <span className="block h-1.5 w-24 bg-hairline" aria-hidden>
                        <span className="block h-full bg-ink-muted" style={{ width: `${(g.filed / g.total) * 100}%` }} />
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                    {g.filed ? format("growth", g.medianGrowth) : <span className="text-ink-muted">none filed</span>}
                    {change !== undefined && g.filed > 0 && (
                      <span className="ml-2 text-caption">
                        <Delta value={change} display={`${Math.abs(change * 100).toFixed(1)} pts`} />
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">{format("growth", g.priorMedianGrowth)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                    {g.shareGrowing === undefined ? NA : `${Math.round(g.shareGrowing * 100)}%`}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                    {g.inventoryDaysChange === undefined ? (
                      NA
                    ) : (
                      <Delta value={g.inventoryDaysChange} display={days(g.inventoryDaysChange)} invert />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
