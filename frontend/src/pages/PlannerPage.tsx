import { useState } from "react";
import { useWeekPlan } from "@/api/mealPlans";
import { usePlannerStore } from "@/store/plannerStore";
import { WeeklyCalendar } from "@/components/planner/WeeklyCalendar";
import { AIGenerateDialog } from "@/components/planner/AIGenerateDialog";
import { WeeklyNutritionSummary } from "@/components/nutrition/WeeklyNutritionSummary";
import { Button } from "@/components/ui/button";
import { formatWeekRange } from "@/lib/dateUtils";
import { ChevronLeft, ChevronRight, Sparkles, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

export function PlannerPage() {
  const { currentWeekMonday, goNextWeek, goPrevWeek } = usePlannerStore();
  const { data: plan, isLoading } = useWeekPlan(currentWeekMonday);
  const [generateOpen, setGenerateOpen] = useState(false);

  const weekLabel = formatWeekRange(new Date(currentWeekMonday + "T00:00:00"));

  return (
    <div className="p-6 space-y-5 overflow-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={goPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold px-3 min-w-56 text-center">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={goNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1" />
        {plan && (
          <Link to="/shopping">
            <Button variant="outline" size="sm">
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Shopping list
            </Button>
          </Link>
        )}
        <Button onClick={() => setGenerateOpen(true)} disabled={!plan}>
          <Sparkles className="h-4 w-4 mr-1.5" />
          Generate with AI
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-secondary animate-pulse h-48" />
          ))}
        </div>
      ) : plan ? (
        <>
          <WeeklyCalendar plan={plan} />
          <WeeklyNutritionSummary planId={plan.id} />
        </>
      ) : null}

      {plan && (
        <AIGenerateDialog
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          planId={plan.id}
          weekLabel={weekLabel}
        />
      )}
    </div>
  );
}
