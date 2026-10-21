import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

/** Sidebar, top bar and the scrolling canvas. Pages pad themselves with PageBody. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
      </div>
    </div>
  );
}

/** Page padding and section rhythm: 24px (16px below 1280px), 24px between sections. */
export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">{children}</div>;
}
