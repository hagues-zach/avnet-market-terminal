import { PageTitle } from "./page-title";

/** Older name for PageTitle; keeps existing pages working. Prefer PageTitle in new code. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <PageTitle title={title} subtitle={subtitle} />;
}
