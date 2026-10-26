import type {
  AccountFigures,
  AccountKey,
  CustomersData,
  FiscalQuarter,
  Mapping,
  MarketsData,
  PerformanceData,
  PipelineData,
  RegionRow,
  SegmentsData,
  SupplierRow,
  SupplyData,
  VerticalRow,
} from "./contracts";

// The one interface between the app and Avnet's data. An adapter implements every
// method (mock.ts today, databricks/adapter.ts at Avnet); src/lib/avnet/index.ts
// picks one from AVNET_DATA. Each method returns its contract, aggregated to the
// grain the contract states, and passes contract.ts.

export interface AvnetData {
  /** Which adapter this is, for source lines and errors. */
  readonly name: string;
  fiscalCalendar(): Promise<FiscalQuarter[]>;
  performance(): Promise<PerformanceData>;
  segments(): Promise<SegmentsData>;
  regions(): Promise<RegionRow[]>;
  suppliers(): Promise<SupplierRow[]>;
  verticals(): Promise<VerticalRow[]>;
  pipeline(): Promise<PipelineData>;
  customers(): Promise<CustomersData>;
  codeMap(): Promise<Mapping[]>;
  supply(): Promise<SupplyData>;
  markets(): Promise<MarketsData>;
  /** One company's business with Avnet; null when Avnet has none on record. */
  account(company: AccountKey): Promise<AccountFigures | null>;
}

export const METHODS = [
  "fiscalCalendar",
  "performance",
  "segments",
  "regions",
  "suppliers",
  "verticals",
  "pipeline",
  "customers",
  "codeMap",
  "supply",
  "markets",
] as const satisfies readonly (keyof AvnetData)[];
