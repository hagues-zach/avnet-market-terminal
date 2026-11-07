import { assembleBrief } from "@/lib/brief/assemble";
import { currentBriefProfile } from "@/lib/brief/current-profile";
import { Panel } from "@/components/ui/panel";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { MorningBrief } from "./morning-brief";

/** Server side of the brief: whose it is, then the brief from stored pieces. No Claude or Google calls. */
export async function MorningBriefSection({ requested }: { requested?: string }) {
  const { profile, choices } = await currentBriefProfile(requested);
  try {
    const brief = profile ? await assembleBrief(profile) : null;
    return <MorningBrief brief={brief} choices={choices} />;
  } catch (e) {
    console.error("Morning brief could not be assembled:", e);
    return (
      <Panel title="Your morning brief">
        <ErrorState title="Your brief couldn't be loaded" source="Brief store" detail="The rest of Market News is unaffected." retryHref="/news" />
      </Panel>
    );
  }
}

export function MorningBriefLoading() {
  return (
    <Panel title="Your morning brief">
      <LoadingBlock label="Putting your brief together…" lines={4} />
    </Panel>
  );
}
