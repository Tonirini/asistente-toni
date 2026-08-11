export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    </header>
  );
}
