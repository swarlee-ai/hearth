import { Droppable } from "@hello-pangea/dnd";
import { MealPlanEntry } from "@/types/mealPlan";
import { PlannedRecipeCard } from "./PlannedRecipeCard";
import { cn } from "@/lib/utils";

interface Props {
  droppableId: string;
  mealType: string;
  entries: MealPlanEntry[];
  planId: string;
  date: string;
}

export function MealSlot({ droppableId, mealType, entries, planId }: Props) {
  return (
    <div className="flex min-h-[60px]">
      <div className="w-24 flex-shrink-0 flex items-start pt-3 px-3">
        <span className="text-xs font-medium text-muted-foreground capitalize">{mealType}</span>
      </div>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 min-w-0 px-2 py-2 space-y-1.5 transition-colors",
              snapshot.isDraggingOver && "bg-primary/5 rounded-lg"
            )}
          >
            {entries.map((entry, index) => (
              <PlannedRecipeCard key={entry.id} entry={entry} index={index} planId={planId} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
