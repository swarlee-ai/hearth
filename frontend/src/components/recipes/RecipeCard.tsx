import { Link } from "react-router-dom";
import { Heart, Clock, Users, Baby, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { Recipe } from "@/types/recipe";
import { TagBadge } from "./TagBadge";
import { useToggleFavorite } from "@/api/recipes";
import { cn } from "@/lib/utils";

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  const toggleFav = useToggleFavorite();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-card rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
    >
      <Link to={`/recipes/${recipe.id}`} className="block">
        <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/25" />
            </div>
          )}
          {recipe.is_kid_friendly && (
            <div className="absolute top-2 right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm" title="Kid-friendly">
              <Baby className="h-3.5 w-3.5 text-yellow-900" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display font-medium text-sm leading-snug line-clamp-2 mb-2">{recipe.title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            {recipe.total_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {recipe.total_time_minutes}m
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {recipe.cuisine_type && <TagBadge tag={recipe.cuisine_type} isCuisine />}
            {recipe.tags.slice(0, 2).map((t) => <TagBadge key={t} tag={t} />)}
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => { e.stopPropagation(); toggleFav.mutate(recipe.id); }}
        className={cn(
          "absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors",
          recipe.is_favorite ? "bg-red-500 text-white" : "bg-white/80 text-gray-500 hover:text-red-500"
        )}
        style={{ position: "absolute" }}
      >
        <Heart className={cn("h-3.5 w-3.5", recipe.is_favorite && "fill-current")} />
      </button>
    </motion.div>
  );
}
