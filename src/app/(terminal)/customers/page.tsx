import { ShellPage } from "@/components/shell/shell-page";
import { CUSTOMERS_SPEC } from "@/lib/shells/specs";

// Shell page: layout settled, mock data for anything Avnet-specific. See
// docs/superapp-plan.md for its design pass and src/lib/hookups.ts for its data.
export default function Page() {
  return <ShellPage spec={CUSTOMERS_SPEC} />;
}
