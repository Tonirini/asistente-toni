"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  CalendarDays,
  CalendarRange,
  Bell,
  Calendar,
  Columns3,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/hoy", label: "Hoy", icon: CheckSquare },
  { href: "/semana", label: "Semana", icon: CalendarDays },
  { href: "/mes", label: "Mes", icon: CalendarRange },
  { href: "/avisos", label: "Avisos", icon: Bell },
  { href: "/calendario", label: "Calendario", icon: Calendar },
  { href: "/pendientes", label: "Pendientes", icon: Columns3 },
  { href: "/notas", label: "Notas", icon: NotebookPen },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-7">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors duration-150",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
