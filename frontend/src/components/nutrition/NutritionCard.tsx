import { MacroBar } from "./MacroBar";
import { NutritionInfo } from "@/types/recipe";
import { Info } from "lucide-react";

interface Props {
  nutrition: NutritionInfo;
  isEstimated?: boolean;
  servings?: number;
}

export function NutritionCard({ nutrition, isEstimated, servings }: Props) {
  const n = nutrition;
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Per serving</p>
          <p className="text-2xl font-bold">{Math.round(n.calories || 0)} <span className="text-sm font-normal text-muted-foreground">kcal</span></p>
        </div>
        {isEstimated && (
          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <Info className="h-3 w-3" />
            AI estimate
          </div>
        )}
      </div>
      <div className="space-y-2">
        <MacroBar label="Protein" value={n.protein_g || 0} max={50} color="bg-blue-400" />
        <MacroBar label="Carbs" value={n.carbs_g || 0} max={100} color="bg-amber-400" />
        <MacroBar label="Fat" value={n.fat_g || 0} max={65} color="bg-red-400" />
        <MacroBar label="Fiber" value={n.fiber_g || 0} max={30} color="bg-green-400" />
      </div>
    </div>
  );
}
