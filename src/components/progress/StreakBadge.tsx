import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StreakBadge({ currentStreak }: { currentStreak: number }) {
  if (currentStreak <= 0) return null;

  return (
    <Badge
      variant="outline"
      className="gap-1 border-primary/30 bg-accent text-accent-foreground"
    >
      <Flame className="size-3.5 text-primary" />
      {currentStreak} seguidas
    </Badge>
  );
}
