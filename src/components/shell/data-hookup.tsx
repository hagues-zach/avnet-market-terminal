import { HookupMarker } from "@/components/ui/hookup-marker";

/** The shell's mock-data marker, drawn by HookupMarker. */
export function DataHookup({ ids }: { ids: string[] }) {
  return (
    <div className="mt-3 empty:hidden">
      <HookupMarker ids={ids} />
    </div>
  );
}
