import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { MealPlan } from "@/types/mealPlan";
import { DayColumn } from "./DayColumn";
import { useSettings } from "@/api/settings";
import { getWeekDates, toISODate } from "@/lib/dateUtils";
import { useUpdateEntry } from "@/api/mealPlans";

interface Props {
  plan: MealPlan;
}

export function WeeklyCalendar({ plan }: Props) {
  const { data: settings } = useSettings();
  const mealSchedule = settings?.meal_schedule;
  const monday = new Date(plan.week_start_date + "T00:00:00");
  const weekDates = getWeekDates(monday);
  const updateEntry = useUpdateEntry(plan.id);

  function getMealsForDay(day: Date): string[] {
    const dayName = format(day, "EEEE").toLowerCase();
    return mealSchedule?.[dayName] ?? settings?.planned_meals ?? ["dinner"];
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const [destDate, destMealType] = result.destination.droppableId.split("--");
    const [srcDate, srcMealType] = result.source.droppableId.split("--");
    if (destDate === srcDate && destMealType === srcMealType) return;
    updateEntry.mutate({
      entryId: result.draggableId,
      data: { plan_date: destDate, meal_type: destMealType, sort_order: result.destination.index },
    });
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-2">
        {weekDates.map((day) => (
          <DayColumn
            key={toISODate(day)}
            date={day}
            mealTypes={getMealsForDay(day)}
            entries={plan.entries.filter((e) => e.plan_date === toISODate(day))}
            planId={plan.id}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
