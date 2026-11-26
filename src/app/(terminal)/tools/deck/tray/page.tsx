import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { TrayReview } from "@/components/deck/tray-review";

// Add to deck, the review page (docs/design/deck-tray, mockups 3 and 4): the
// slides collected with Add to deck, put in order with the reader's point for
// each, then shipped as an Avnet PowerPoint or a PDF. The tray is kept in the
// browser, so the page is drawn there.

export const metadata = { title: "Review your deck" };

export default function TrayPage() {
  return (
    <PageBody>
      <PageTitle
        title="Review your deck"
        subtitle="The slides you added, in the order they'll ship"
        breadcrumb={[{ label: "Pitch Deck Builder", href: "/tools/deck" }, { label: "Review your deck" }]}
      />
      <TrayReview />
    </PageBody>
  );
}
