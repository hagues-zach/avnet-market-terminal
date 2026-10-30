import { PageBody } from "@/components/layout/page-body";
import { LoadingBlock, Skeleton } from "@/components/ui/states";

// Shown as soon as a link is clicked, inside the sidebar and top bar, until the
// page's first response arrives. Each page's own sections then stream in.
export default function TerminalLoading() {
  return (
    <PageBody>
      <div aria-hidden className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <LoadingBlock label="Loading page…" lines={8} />
    </PageBody>
  );
}
