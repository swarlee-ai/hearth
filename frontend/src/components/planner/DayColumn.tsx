import { format } from "date-fns";
import { MealPlanEntry } from "@/types/mealPlan";
import { MealSlot } from "./MealSlot";
import { toISODate } from "@/lib/dateUtils";

interface Props {
  date: Date;
  mealTypes: string[];
  entries: MealPlanEntry[];
  planId: string;
}

export function DayColumn({ date, mealTypes, entries, planId }: Props) {
  const isToday = toISODate(date) === toISODate(new Date());
  const dateStr = toISODate(date);

  return (
    <div className={`rounded-xl border overflow-hidden ${isToday ? "border-primary/60 shadow-sm" : "border-border"}`}>
      <div className="flex">
        {/* Day header */}
        <div className={`flex flex-col items-center justify-center w-16 flex-shrink-0 border-r py-3 ${isToday ? "bg-primary/10" : "bg-muted/30"}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
            {format(date, "EEE")}
          </div>
          <div className={`text-2xl font-bold leading-none mt-1 ${isToday ? "text-primary" : "text-foreground"}`}>
            {format(date, "d")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{format(date, "MMM")}</div>
        </div>

        {/* Meal slots */}
        <div className="flex-1 divide-y min-w-0">
          {mealTypes.map((meal) => (
            <MealSlot
              key={`${dateStr}--${meal}`}
              droppableId={`${dateStr}--${meal}`}
              mealType={meal}
              entries={entries.filter((e) => e.meal_type === meal)}
              planId={planId}
              date={dateStr}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
