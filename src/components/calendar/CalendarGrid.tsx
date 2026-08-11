"use client";

import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarItem = {
  id: string;
  title: string;
  dateKey: string; // yyyy-MM-dd
  done: boolean;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function CalendarGrid({
  monthAnchor,
  itemsByDay,
}: {
  monthAnchor: Date;
  itemsByDay: Record<string, CalendarItem[]>;
}) {
  const [selected, setSelected] = useState<Date>(monthAnchor);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthAnchor]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedItems = itemsByDay[selectedKey] ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1 px-4 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-4">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const items = itemsByDay[key] ?? [];
          const inMonth = isSameMonth(day, monthAnchor);
          const active = isSameDay(day, selected);

          return (
            <button
              key={key}
              onClick={() => setSelected(day)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors duration-150",
                inMonth ? "text-foreground" : "text-muted-foreground/40",
                active && "bg-primary text-primary-foreground",
                !active && isToday(day) && "border border-primary text-primary"
              )}
            >
              <span>{format(day, "d")}</span>
              {items.length > 0 && (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    active ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 px-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {format(selected, "EEEE d 'de' MMMM", { locale: es })}
        </h2>
        {selectedItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nada para este día.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <p
                  className={cn(
                    "text-sm font-medium text-foreground",
                    item.done && "text-muted-foreground line-through"
                  )}
                >
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
