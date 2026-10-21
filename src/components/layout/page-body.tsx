/** Page padding and section rhythm: 16px (24px from 1280px), 24px between sections. */
export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">{children}</div>;
}
