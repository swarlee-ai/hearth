import type { CSSProperties } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { MealPlanEntry } from "@/types/mealPlan";
import { useDeleteEntry } from "@/api/mealPlans";
import { X, Repeat2, Clock, Baby } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  entry: MealPlanEntry;
  index: number;
  planId: string;
}

export function PlannedRecipeCard({ entry, index, planId }: Props) {
  const deleteEntry = useDeleteEntry(planId);
  const recipe = entry.recipe;

  return (
    <Draggable draggableId={entry.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style as CSSProperties}
          className={cn(
            "group flex items-center gap-3 rounded-lg bg-card border px-3 py-2 cursor-grab active:cursor-grabbing transition-shadow",
            snapshot.isDragging && "shadow-lg ring-1 ring-primary/30 rotate-1"
          )}
        >
          {recipe?.image_url && (
            <img
              src={recipe.image_url}
              alt=""
              className="w-12 h-12 rounded-md object-cover flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            {recipe ? (
              <>
                <Link
                  to={`/recipes/${recipe.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block text-sm font-medium leading-snug hover:text-primary truncate"
                >
                  {recipe.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  {entry.is_leftover_of && (
                    <span className="flex items-center gap-0.5 text-primary/70 font-medium">
                      <Repeat2 className="h-3 w-3" /> leftover
                    </span>
                  )}
                  {recipe.cuisine_type && <span>{recipe.cuisine_type}</span>}
                  {recipe.total_time_minutes && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {recipe.total_time_minutes >= 60
                        ? `${Math.floor(recipe.total_time_minutes / 60)}h${recipe.total_time_minutes % 60 ? ` ${recipe.total_time_minutes % 60}m` : ""}`
                        : `${recipe.total_time_minutes}m`}
                    </span>
                  )}
                  {recipe.is_kid_friendly && (
                    <span className="flex items-center gap-0.5 text-green-600">
                      <Baby className="h-3 w-3" /> kid-friendly
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground italic">Unknown recipe</span>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); deleteEntry.mutate(entry.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive flex-shrink-0 p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Draggable>
  );
}
