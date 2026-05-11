// Partners pages render inside the unified dashboard shell
// (sidebar, header, auth guard all come from (dashboard)/layout.tsx).
// No inner Partners-specific layout is needed.

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
