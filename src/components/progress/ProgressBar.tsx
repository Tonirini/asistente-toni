import { Progress } from "@/components/ui/progress";

export function ProgressBar({
  completed,
  total,
  percent,
}: {
  completed: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-foreground">{percent}%</span>
        <span className="text-sm text-muted-foreground">
          {completed} de {total}
        </span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}
