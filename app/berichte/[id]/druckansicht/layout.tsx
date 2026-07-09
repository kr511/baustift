export default function DruckansichtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-blueprint min-h-screen py-8 print:bg-white print:py-0">{children}</div>
  );
}
