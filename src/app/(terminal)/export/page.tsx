import { permanentRedirect } from "next/navigation";

// The Export Center merged into Pitch Deck Builder (step 2.21): one view on its
// own is a one-slide deck, /tools/deck?slide=<id>.
export default function ExportPage() {
  permanentRedirect("/tools/deck");
}
