import { useParams, Link } from "react-router-dom";
import { useCollections, useCollectionRecipes, useRemoveFromCollection } from "@/api/collections";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderHeart } from "lucide-react";
import { Recipe } from "@/types/recipe";

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: collections = [] } = useCollections();
  const { data: recipeList, isLoading } = useCollectionRecipes(id);
  const removeFromCollection = useRemoveFromCollection();

  const collection = collections.find((c) => c.id === id);
  const recipes: Recipe[] = recipeList?.items ?? [];
  const color = collection?.color || "#6b7280";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/collections">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div>
            <h1 className="text-xl font-bold leading-tight">{collection?.name ?? "Collection"}</h1>
            {collection?.description && (
              <p className="text-sm text-muted-foreground">{collection.description}</p>
            )}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderHeart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No recipes in this collection yet.</p>
          <p className="text-sm mt-1">Open a recipe and use "Add to Collection" to add it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="relative group/card">
              <RecipeCard recipe={recipe} />
              <button
                onClick={() => removeFromCollection.mutate({ collectionId: id!, recipeId: recipe.id })}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-background/80 border flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-muted-foreground text-xs"
                title="Remove from collection"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
