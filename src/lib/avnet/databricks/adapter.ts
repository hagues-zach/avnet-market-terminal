import { databricksQuery, databricksSettings, type DatabricksParam } from "@/lib/databricks/client";
import type {
  AccountFigures,
  Confidence,
  Funnel,
  HistoryEvent,
  Mapping,
  MapStatus,
  PipelineData,
  PipelineRow,
  PipelineStage,
  Rating,
  Region,
  Source,
} from "../contracts";
import type { AvnetData } from "../source";
import { QUERIES, viewOf, type QueryName } from "./queries";

export type Row = Record<string, unknown>;
/** Runs one statement: databricksQuery in the app, a fake in tests. */
export type RunQuery = (sql: string, params?: Record<string, DatabricksParam>) => Promise<Row[]>;

/** A view's rows don't match the contract: a missing column, a wrong type, a missing row. */
export class ContractError extends Error {
  readonly code = "CONTRACT";
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

/** The Databricks settings plus the schema the terminal_* views live in: AVNET_DATA_CATALOG.AVNET_DATA_SCHEMA, gold.market_intelligence unless set. Read-only; the store's writable tables are DATABRICKS_CATALOG.DATABRICKS_SCHEMA. */
export function defaultRun(env: Record<string, string | undefined> = process.env): RunQuery {
  const settings = { ...databricksSettings(env), catalog: env.AVNET_DATA_CATALOG || "gold", schema: env.AVNET_DATA_SCHEMA || "market_intelligence" };
  return (sql, params) => databricksQuery(sql, params, { settings, timeoutMs: 120_000 });
}

// The Databricks adapter: each method runs its query (queries.ts) and maps the
// view's rows to the contract. A missing column or a value of the wrong type
// fails loudly, naming the view, row and column, rather than showing a page
// with holes in it. Created with no settings, it fails at once (see index.ts).

/** Reads typed values out of one view's rows. */
function reader(view: string) {
  const value = (r: Row, _i: number, col: string) => {
    if (!(col in r)) throw new ContractError(`${view}: column ${col} is missing`);
    return r[col];
  };
  const bad = (i: number, col: string, want: string, got: unknown) =>
    new ContractError(`${view} row ${i + 1}: ${col} should be ${want}, got ${JSON.stringify(got)}`);
  const num = (r: Row, i: number, col: string): number => {
    const v = value(r, i, col);
    if (typeof v !== "number" || !Number.isFinite(v)) throw bad(i, col, "a number", v);
    return v;
  };
  const optNum = (r: Row, i: number, col: string) => (value(r, i, col) === null ? undefined : num(r, i, col));
  const str = (r: Row, i: number, col: string): string => {
    const v = value(r, i, col);
    if (typeof v !== "string") throw bad(i, col, "text", v);
    return v;
  };
  const optStr = (r: Row, i: number, col: string) => (value(r, i, col) === null ? null : str(r, i, col));
  const bool = (r: Row, i: number, col: string): boolean => {
    const v = value(r, i, col);
    if (typeof v !== "boolean") throw bad(i, col, "true or false", v);
    return v;
  };
  const json = <T>(r: Row, i: number, col: string, fallback: T): T => {
    const v = value(r, i, col);
    if (v === null) return fallback;
    try {
      return JSON.parse(String(v)) as T;
    } catch {
      throw bad(i, col, "JSON", v);
    }
  };
  return { num, optNum, str, optStr, bool, json };
}

const STAGES: PipelineStage[] = ["submitted", "approved", "production", "billing"];

export function databricksSource(run: RunQuery = defaultRun()): AvnetData {
  /** Run a named query; `one` insists on exactly one row (settings and summary views). */
  const rows = async (name: QueryName, params?: Record<string, DatabricksParam>) => ({ rows: await run(QUERIES[name], params), r: reader(viewOf(name)) });
  const single = async (name: QueryName) => {
    const got = await rows(name);
    if (got.rows.length !== 1) throw new ContractError(`${viewOf(name)} should have one row, has ${got.rows.length}`);
    return { row: got.rows[0], r: got.r };
  };

  async function pipeline(): Promise<PipelineData> {
    const [funnel, summary, quarterly, groups, regs] = await Promise.all([
      rows("pipelineFunnel"),
      single("pipelineSummary"),
      rows("pipelineQuarterly"),
      rows("pipelineGroups"),
      rows("pipelineRegistrations"),
    ]);
    const stageOf = (s: string, view: string): PipelineStage => {
      if (!STAGES.includes(s as PipelineStage)) throw new ContractError(`${view}: unknown stage "${s}"`);
      return s as PipelineStage;
    };
    const total = {} as Funnel;
    funnel.rows.forEach((row, i) => {
      total[stageOf(funnel.r.str(row, i, "stage"), "terminal_pipeline_funnel")] = { count: funnel.r.num(row, i, "registrations"), value: funnel.r.num(row, i, "value_usd_m") };
    });
    for (const s of STAGES) if (!total[s]) throw new ContractError(`terminal_pipeline_funnel: no row for stage ${s}`);

    // Long rows (one per group and stage) to one row per group, in first-seen order.
    const views: Record<string, Map<string, PipelineRow>> = { supplier: new Map(), segment: new Map(), vertical: new Map() };
    groups.rows.forEach((row, i) => {
      const g = groups.r;
      const grouping = g.str(row, i, "grouping");
      const view = views[grouping];
      if (!view) throw new ContractError(`terminal_pipeline_groups row ${i + 1}: grouping "${grouping}" isn't supplier, segment or vertical`);
      const name = g.str(row, i, "name");
      const entry = view.get(name) ?? { name, funnel: {} as Funnel, pipeline: 0, change: g.num(row, i, "pipeline_change"), billings: g.num(row, i, "billings_usd_m"), stalled: g.num(row, i, "stalled") };
      entry.funnel[stageOf(g.str(row, i, "stage"), "terminal_pipeline_groups")] = { count: g.num(row, i, "registrations"), value: g.num(row, i, "value_usd_m") };
      view.set(name, entry);
    });
    const finish = (m: Map<string, PipelineRow>) =>
      [...m.values()].map((p) => {
        for (const s of STAGES) if (!p.funnel[s]) throw new ContractError(`terminal_pipeline_groups: ${p.name} has no ${s} row`);
        return { ...p, pipeline: p.funnel.approved.value - p.funnel.billing.value };
      });

    const s = summary;
    const q = quarterly;
    const reg = regs.r;
    const base = (row: Row, i: number) => ({
      reg: reg.str(row, i, "registration"),
      supplier: reg.str(row, i, "supplier"),
      segment: reg.str(row, i, "segment"),
      value: reg.num(row, i, "value_usd_m"),
    });
    return {
      funnel: total,
      approvedPipelineYearAgo: s.r.num(s.row, 0, "approved_pipeline_year_ago_usd_m"),
      newRegistrations: { thisQuarter: s.r.num(s.row, 0, "new_registrations_quarter"), yearAgo: s.r.num(s.row, 0, "new_registrations_year_ago") },
      approvalRateYearAgo: s.r.num(s.row, 0, "approval_rate_year_ago"),
      monthsToBilling: s.r.num(s.row, 0, "months_to_billing"),
      byQuarter: q.rows
        .map((row, i) => ({ quarter: q.r.str(row, i, "fiscal_quarter"), pipeline: q.r.num(row, i, "pipeline_usd_m"), designBillings: q.r.num(row, i, "design_billings_usd_m") }))
        .reverse(),
      bySupplier: finish(views.supplier),
      bySegment: finish(views.segment),
      byVertical: finish(views.vertical),
      stalled: regs.rows.flatMap((row, i) => (reg.str(row, i, "list") === "stalled" ? [{ ...base(row, i), months: reg.num(row, i, "months_since_approval") }] : [])),
      recent: regs.rows.flatMap((row, i) => (reg.str(row, i, "list") === "recent" ? [{ ...base(row, i), daysAgo: reg.num(row, i, "days_since_approval") }] : [])),
    };
  }

  return {
    name: "databricks",

    async fiscalCalendar() {
      const { rows: rs, r } = await rows("fiscalCalendar");
      return rs.map((row, i) => ({ label: r.str(row, i, "fiscal_quarter"), start: r.str(row, i, "start_date"), end: r.str(row, i, "end_date") }));
    },

    async performance() {
      const { rows: rs, r } = await rows("performance");
      if (!rs.length) throw new ContractError("terminal_performance has no rows");
      // Newest first from the query, so the latest quarter's design-approved share is the first row's.
      return {
        designApprovedShare: r.num(rs[0], 0, "design_approved_share"),
        quarters: rs
          .map((row, i) => ({
            quarter: r.str(row, i, "fiscal_quarter"),
            billings: r.num(row, i, "billings_usd_m"),
            bookings: r.num(row, i, "bookings_usd_m"),
            backlog: r.num(row, i, "backlog_usd_m"),
            bookToBill: r.num(row, i, "book_to_bill"),
          }))
          .reverse(),
      };
    },

    async segments() {
      const { rows: rs, r } = await rows("segments");
      if (!rs.length) throw new ContractError("terminal_segments has no rows");
      return {
        mappedShare: r.num(rs[0], 0, "mapped_share"),
        rows: rs.map((row, i) => ({
          segment: r.str(row, i, "segment"),
          semi: r.bool(row, i, "is_semi"),
          billings: r.num(row, i, "billings_usd_m"),
          growth: r.num(row, i, "growth"),
          confidence: r.str(row, i, "confidence") as Rating,
        })),
      };
    },

    async regions() {
      const { rows: rs, r } = await rows("regions");
      return rs.map((row, i) => ({
        region: r.str(row, i, "region") as Region,
        billings: r.num(row, i, "billings_usd_m"),
        ttm: r.num(row, i, "ttm_usd_m"),
        growth: r.num(row, i, "growth"),
        bookToBill: r.num(row, i, "book_to_bill"),
        backlog: r.num(row, i, "backlog_usd_m"),
      }));
    },

    async suppliers() {
      const { rows: rs, r } = await rows("suppliers");
      return rs.map((row, i) => ({
        name: r.str(row, i, "supplier"),
        share: r.num(row, i, "share"),
        growth: r.num(row, i, "growth"),
        revenue: r.optNum(row, i, "revenue_usd_b") ?? 0,
        confidence: r.optStr(row, i, "revenue_confidence") ?? "",
        billings: r.num(row, i, "billings_usd_m"),
      }));
    },

    async verticals() {
      const { rows: rs, r } = await rows("verticals");
      return rs.map((row, i) => ({ name: r.str(row, i, "vertical"), share: r.num(row, i, "share"), growth: r.num(row, i, "growth"), billings: r.num(row, i, "billings_usd_m") }));
    },

    pipeline,

    async customers() {
      const [c, top] = await Promise.all([single("concentration"), rows("topCustomers")]);
      const n = (col: string) => c.r.num(c.row, 0, col);
      return {
        concentration: {
          top10: { now: n("top10_share"), yearAgo: n("top10_share_year_ago") },
          top100: { now: n("top100_share"), yearAgo: n("top100_share_year_ago") },
          active: n("active_customers"),
          newCustomerGrowth: n("new_customer_growth"),
        },
        top: top.rows.map((row, i) => ({
          name: top.r.str(row, i, "customer"),
          vertical: top.r.str(row, i, "vertical"),
          region: top.r.str(row, i, "region") as Region,
          billings: top.r.num(row, i, "billings_usd_m"),
          growth: top.r.num(row, i, "growth"),
          backlog: top.r.num(row, i, "backlog_usd_m"),
          pipeline: top.r.num(row, i, "pipeline_usd_m"),
        })),
      };
    },

    async codeMap(): Promise<Mapping[]> {
      const { rows: rs, r } = await rows("codeMap");
      return rs.map((row, i) => ({
        id: r.str(row, i, "category_id"),
        source: r.str(row, i, "source") as Source,
        segment: r.str(row, i, "segment"),
        name: r.str(row, i, "category"),
        codes: r.json<string[]>(row, i, "codes", []),
        pcc: r.optStr(row, i, "pcc"),
        billings: r.optNum(row, i, "billings_usd_m") ?? 0,
        confidence: r.optStr(row, i, "confidence") as Confidence | null,
        status: r.str(row, i, "status") as MapStatus,
        waitsOn: r.optStr(row, i, "waits_on"),
        definition: r.optStr(row, i, "definition") ?? "",
        reason: r.optStr(row, i, "reason"),
        parts: r.json<string[]>(row, i, "parts", []),
        history: r.json<{ days_ago: number; event: string; by: string }[]>(row, i, "history", []).map((h): HistoryEvent => ({ daysAgo: h.days_ago, event: h.event, by: h.by })),
      }));
    },

    async supply() {
      const { rows: rs, r } = await rows("supply");
      return {
        leadTimes: rs.map((row, i) => ({ category: r.str(row, i, "category"), weeks: r.num(row, i, "lead_time_weeks"), change: r.num(row, i, "lead_time_change_weeks") })),
        purchasing: rs.flatMap((row, i) => {
          const poValue = r.optNum(row, i, "po_value_usd_m");
          return poValue === undefined ? [] : [{ category: r.str(row, i, "category"), poValue, change: r.num(row, i, "po_change") }];
        }),
      };
    },

    async markets() {
      const [segs, regs, settings, devices] = await Promise.all([rows("segmentMarkets"), rows("regionMarkets"), single("marketSettings"), rows("aiDevices")]);
      const sr = segs.r;
      const forecast: Record<string, number[]> = {};
      const segments = segs.rows.map((row, i) => {
        const segment = sr.str(row, i, "segment");
        forecast[segment] = [1, 2, 3, 4].map((y) => sr.num(row, i, `forecast_y${y}`));
        return { segment, market: sr.num(row, i, "market_usd_m"), marketGrowth: sr.num(row, i, "market_growth") };
      });
      const s = settings;
      return {
        segments,
        regions: regs.rows.map((row, i) => ({ region: regs.r.str(row, i, "region") as Region, market: regs.r.num(row, i, "market_usd_b"), growth: regs.r.num(row, i, "growth") })),
        supplierRevenueGrowth: s.r.num(s.row, 0, "supplier_revenue_growth"),
        forecast,
        spread: [1, 2, 3, 4].map((y) => s.r.num(s.row, 0, `spread_y${y}`)),
        aiDevices: devices.rows.map((row, i) => ({ device: devices.r.str(row, i, "device"), usdM: devices.r.num(row, i, "sales_usd_m"), yoy: devices.r.num(row, i, "growth") })),
      };
    },

    async account({ name, supplier }): Promise<AccountFigures | null> {
      const { rows: rs, r } = await rows("account", { name, supplier });
      if (!rs.length) return null;
      const row = rs[0];
      return {
        billings: r.num(row, 0, "billings_usd_m"),
        backlog: r.num(row, 0, "backlog_usd_m"),
        ...(supplier ? { openRegistrations: r.optNum(row, 0, "open_registrations") } : { openQuotes: r.optNum(row, 0, "open_quotes") }),
      };
    },
  };
}
