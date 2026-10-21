// The order the Avnet data team connects sources: phase 5 of
// docs/superapp-build-plan.md (5.1, querying Databricks in place, is decided).
// The test checks every step here is in the plan and every plan step is here.

export interface ConnectionStep {
  step: string;
  /** Short name for the step strip. */
  name: string;
  /** The step in a sentence, after "step 5.x,". */
  sentence: string;
  ids: string[];
}

export const CONNECTION_ORDER: ConnectionStep[] = [
  { step: "5.2", name: "Fiscal calendar and FX", sentence: "the fiscal calendar and exchange rates", ids: ["fiscal-calendar", "fx-rates"] },
  { step: "5.3", name: "Billings, bookings, backlog", sentence: "billings, bookings and backlog", ids: ["billings", "bookings", "backlog"] },
  { step: "5.4", name: "Material master, code map", sentence: "the material master and the code map", ids: ["material-master", "code-map"] },
  {
    step: "5.5",
    name: "Market sizes",
    sentence: "WSTS, Gartner and the IP&E forecast",
    ids: ["wsts", "gartner-forecast", "ipe-forecast", "tam-sam-som"],
  },
  { step: "5.6", name: "Design registrations", sentence: "design registrations", ids: ["drms"] },
  { step: "5.7", name: "Customer master", sentence: "the customer master", ids: ["customer-master"] },
  { step: "5.8", name: "Lead times, purchasing", sentence: "lead times and purchasing", ids: ["lead-times", "procurement"] },
  { step: "5.9", name: "Call transcripts", sentence: "earnings call transcripts", ids: ["transcripts"] },
];
