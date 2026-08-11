import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
