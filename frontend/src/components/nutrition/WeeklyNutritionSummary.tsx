import { useWeeklyNutrition } from "@/api/mealPlans";

interface Props {
  planId: string;
}

interface StatProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function Stat({ label, value, unit, color }: StatProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg bg-secondary/50">
      <span className={`text-lg font-bold tabular-nums ${color}`}>
        {Math.round(value).toLocaleString()}
        <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function WeeklyNutritionSummary({ planId }: Props) {
  const { data } = useWeeklyNutrition(planId);

  if (!data || data.recipes_with_nutrition === 0) return null;

  const t = data.weekly_totals;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Weekly nutrition</h3>
        <span className="text-xs text-muted-foreground">
          {data.recipes_with_nutrition} of {data.total_entries} meals tracked
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Stat label="Calories" value={t.calories} unit="kcal" color="text-foreground" />
        <Stat label="Protein" value={t.protein_g} unit="g" color="text-blue-600" />
        <Stat label="Carbs" value={t.carbs_g} unit="g" color="text-amber-600" />
        <Stat label="Fat" value={t.fat_g} unit="g" color="text-red-500" />
        <Stat label="Fiber" value={t.fiber_g} unit="g" color="text-green-600" />
      </div>
    </div>
  );
}
