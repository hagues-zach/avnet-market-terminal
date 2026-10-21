import { AppShell } from "@/components/layout/app-shell";

// The new shell from DESIGN.md, previewed here before step 1.6 moves every page onto it.
export default function KitLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
