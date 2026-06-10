import { useParams, Link, useNavigate } from "react-router-dom";
import { useRecipe, useDeleteRecipe, useToggleFavorite, useSuggestKidMods, useRecipeNutrition, useSuggestTags, useUpdateRecipe } from "@/api/recipes";
import { useRecipeCollections, useCollections, useAddToCollection, useRemoveFromCollection } from "@/api/collections";
import { TagBadge } from "@/components/recipes/TagBadge";
import { NutritionCard } from "@/components/nutrition/NutritionCard";
import { CookingMode } from "@/components/recipes/CookingMode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Heart, Clock, Users, ArrowLeft, Trash2, Baby, ExternalLink, Sparkles, Minus, Plus, Tag, ChefHat, X, FolderHeart } from "lucide-react";
import { useState, useRef } from "react";
import type { Ingredient } from "@/types/recipe";

function scaleQty(qty: string | undefined, ratio: number): string | undefined {
  if (!qty) return qty;
  const num = parseFloat(qty);
  if (isNaN(num)) return qty;
  return parseFloat((num * ratio).toFixed(2)).toString();
}

function scaleIngredients(ingredients: Ingredient[], ratio: number): Ingredient[] {
  if (ratio === 1) return ingredients;
  return ingredients.map((ing) => ({ ...ing, qty: scaleQty(ing.qty, ratio) }));
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: nutritionData } = useRecipeNutrition(id);
  const deleteMutation = useDeleteRecipe();
  const toggleFav = useToggleFavorite();
  const suggestKidMods = useSuggestKidMods();
  const suggestTags = useSuggestTags();
  const updateRecipe = useUpdateRecipe();
  const navigate = useNavigate();
  const { data: memberCollections = [] } = useRecipeCollections(id);
  const { data: allCollections = [] } = useCollections();
  const addToColl = useAddToCollection();
  const removeFromColl = useRemoveFromCollection();
  const [collPickerOpen, setCollPickerOpen] = useState(false);
  const [kidMods, setKidMods] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"ingredients" | "instructions" | "nutrition">("ingredients");
  const [targetServings, setTargetServings] = useState<number | null>(null);
  const [cookingMode, setCookingMode] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  async function handleDelete() {
    if (!recipe) return;
    if (!confirm(`Delete "${recipe.title}"?`)) return;
    await deleteMutation.mutateAsync(recipe.id);
    navigate("/recipes");
    toast("Recipe deleted", "info");
  }

  async function handleAutoTag() {
    if (!recipe) return;
    const result = await suggestTags.mutateAsync({ title: recipe.title, ingredients: recipe.ingredients });
    const newTags = result.tags.filter((t) => !recipe.tags.includes(t));
    if (newTags.length === 0) {
      toast("No new tags to add", "info");
      return;
    }
    await updateRecipe.mutateAsync({ id: recipe.id, data: { tags: [...recipe.tags, ...newTags] } });
    toast(`Added ${newTags.length} tag${newTags.length > 1 ? "s" : ""}: ${newTags.join(", ")}`, "success");
  }

  async function handleKidMods() {
    if (!recipe) return;
    const result = await suggestKidMods.mutateAsync({ title: recipe.title, ingredients: recipe.ingredients });
    setKidMods(result.modifications);
  }

  async function removeTag(tag: string) {
    if (!recipe) return;
    await updateRecipe.mutateAsync({ id: recipe.id, data: { tags: recipe.tags.filter((t) => t !== tag) } });
  }

  async function addTag() {
    if (!recipe) return;
    const t = tagInput.trim().toLowerCase();
    if (!t || recipe.tags.includes(t)) { setTagInput(""); return; }
    await updateRecipe.mutateAsync({ id: recipe.id, data: { tags: [...recipe.tags, t] } });
    setTagInput("");
    tagInputRef.current?.focus();
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!recipe) return <div className="p-8 text-muted-foreground">Recipe not found.</div>;

  if (cookingMode) {
    return <CookingMode title={recipe.title} instructions={recipe.instructions} onExit={() => setCookingMode(false)} />;
  }

  const displayServings = targetServings ?? recipe.servings;
  const ratio = displayServings / recipe.servings;
  const displayIngredients = scaleIngredients(recipe.ingredients, ratio);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/recipes">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold flex-1">{recipe.title}</h1>
        <Button variant="ghost" size="icon" onClick={() => toggleFav.mutate(recipe.id)}>
          <Heart className={`h-4 w-4 ${recipe.is_favorite ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {recipe.image_url && (
        <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover rounded-xl" />
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {recipe.total_time_minutes && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {recipe.total_time_minutes} min
          </span>
        )}
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <button onClick={() => setTargetServings(Math.max(1, displayServings - 1))} className="p-0.5 rounded hover:bg-muted">
            <Minus className="h-3 w-3" />
          </button>
          <span className="min-w-[1.5rem] text-center tabular-nums">{displayServings}</span>
          <button onClick={() => setTargetServings(displayServings + 1)} className="p-0.5 rounded hover:bg-muted">
            <Plus className="h-3 w-3" />
          </button>
          servings{ratio !== 1 && <span className="text-xs text-primary ml-1">(scaled)</span>}
        </span>
        {recipe.cuisine_type && <TagBadge tag={recipe.cuisine_type} isCuisine />}
        {recipe.is_kid_friendly && <Badge variant="success"><Baby className="h-3 w-3 mr-1" />Kid-friendly</Badge>}
        {recipe.tags.map((t) => (
          <span key={t} className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
            {t}
            <button
              onClick={() => removeTag(t)}
              className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity -mr-0.5"
              title={`Remove "${t}"`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={tagInputRef}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="+ tag"
          className="px-2 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary w-16 focus:w-28 transition-all"
        />
        {memberCollections.map((c) => (
          <button
            key={c.id}
            onClick={() => removeFromColl.mutate({ collectionId: c.id, recipeId: recipe.id })}
            className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: c.color || "#6b7280" }}
            title={`Remove from "${c.name}"`}
          >
            <FolderHeart className="h-2.5 w-2.5" />
            {c.name}
            <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => setCollPickerOpen((v) => !v)}
            className="px-2 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + collection
          </button>
          {collPickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCollPickerOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-20 w-52 bg-popover border rounded-lg shadow-md p-1.5 space-y-0.5">
                {allCollections.filter((c) => !memberCollections.some((m) => m.id === c.id)).length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-1.5">
                    {allCollections.length === 0 ? "No collections yet — create one first." : "Already in all collections."}
                  </p>
                ) : (
                  allCollections
                    .filter((c) => !memberCollections.some((m) => m.id === c.id))
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          addToColl.mutate({ collectionId: c.id, recipeId: recipe.id });
                          setCollPickerOpen(false);
                        }}
                        className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || "#6b7280" }} />
                        {c.name}
                      </button>
                    ))
                )}
              </div>
            </>
          )}
        </div>
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> Source
          </a>
        )}
      </div>

      {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {(["ingredients", "instructions", "nutrition"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "ingredients" && (
        <div className="space-y-3">
          <ul className="space-y-2">
            {displayIngredients.map((ing, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-muted-foreground min-w-[80px]">
                  {[ing.qty, ing.unit].filter(Boolean).join(" ")}
                </span>
                <span>{ing.name}{ing.notes ? `, ${ing.notes}` : ""}</span>
              </li>
            ))}
          </ul>

          {recipe.is_kid_friendly && recipe.kid_mod_notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
              <p className="text-sm font-medium text-yellow-800 mb-1 flex items-center gap-1.5">
                <Baby className="h-4 w-4" /> Kid-friendly modifications
              </p>
              <p className="text-sm text-yellow-700">{recipe.kid_mod_notes}</p>
            </div>
          )}

          {kidMods.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">AI Kid Modification Suggestions</p>
              <ul className="space-y-1">
                {kidMods.map((m, i) => <li key={i} className="text-sm text-yellow-700">• {m}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleKidMods} disabled={suggestKidMods.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {suggestKidMods.isPending ? "Thinking..." : "Suggest kid mods"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleAutoTag} disabled={suggestTags.isPending || updateRecipe.isPending}>
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              {suggestTags.isPending ? "Thinking..." : "Auto-tag"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "instructions" && (
        <div className="space-y-4">
          <ol className="space-y-4">
            {recipe.instructions.map((inst, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                  {inst.step}
                </span>
                <p className="text-sm pt-1 leading-relaxed">{inst.text}</p>
              </li>
            ))}
          </ol>
          {recipe.instructions.length > 0 && (
            <Button onClick={() => setCookingMode(true)} className="w-full sm:w-auto">
              <ChefHat className="h-4 w-4 mr-2" />
              Start Cooking
            </Button>
          )}
        </div>
      )}

      {activeTab === "nutrition" && (
        <div className="max-w-xs">
          {nutritionData?.nutrition ? (
            <NutritionCard nutrition={nutritionData.nutrition} isEstimated={nutritionData.estimated} />
          ) : (
            <p className="text-sm text-muted-foreground">No nutritional info available.</p>
          )}
        </div>
      )}
    </div>
  );
}
