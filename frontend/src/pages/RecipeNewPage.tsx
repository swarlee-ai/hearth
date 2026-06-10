import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCreateRecipe } from "@/api/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CUISINES, DIFFICULTIES, DIETARY_TAGS } from "@/lib/constants";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface IngredientRow {
  qty: string;
  unit: string;
  name: string;
  notes: string;
}

export function RecipeNewPage() {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isKidFriendly, setIsKidFriendly] = useState(false);
  const [isLeftoverFriendly, setIsLeftoverFriendly] = useState(false);

  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { qty: "", unit: "", name: "", notes: "" },
  ]);

  const [instructions, setInstructions] = useState<string[]>([""]);

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [customTag, setCustomTag] = useState("");

  function updateIngredient(i: number, field: keyof IngredientRow, value: string) {
    setIngredients((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateInstruction(i: number, value: string) {
    setInstructions((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  }

  function removeInstruction(i: number) {
    setInstructions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  function addCustomTag() {
    const t = customTag.trim().toLowerCase();
    if (t) {
      setSelectedTags((prev) => new Set([...prev, t]));
      setCustomTag("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const prep = parseInt(prepTime) || 0;
    const cook = parseInt(cookTime) || 0;

    createRecipe.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        servings,
        prep_time_minutes: prep || undefined,
        cook_time_minutes: cook || undefined,
        total_time_minutes: prep + cook || undefined,
        cuisine_type: cuisine || undefined,
        difficulty: difficulty || undefined,
        is_kid_friendly: isKidFriendly,
        is_leftover_friendly: isLeftoverFriendly,
        ingredients: ingredients
          .filter((r) => r.name.trim())
          .map((r) => ({
            qty: r.qty.trim() || undefined,
            unit: r.unit.trim() || undefined,
            name: r.name.trim(),
            notes: r.notes.trim() || undefined,
          })),
        instructions: instructions
          .filter((t) => t.trim())
          .map((text, i) => ({ step: i + 1, text: text.trim() })),
        tags: [...selectedTags],
      },
      { onSuccess: (recipe) => navigate(`/recipes/${recipe.id}`) }
    );
  }

  const selectClass =
    "w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="max-w-3xl mx-auto p-5 md:p-7">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/recipes" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl">New Recipe</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basics */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Basics</h2>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Grandma's Chicken Soup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea
              placeholder="A short note about this recipe…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Image URL</label>
            <Input
              placeholder="https://…"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Servings</label>
              <Input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Prep (min)</label>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Cook (min)</label>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectClass}>
                <option value="">—</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cuisine</label>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className={selectClass}>
              <option value="">—</option>
              {CUISINES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Ingredients */}
        <section className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ingredients</h2>
          <div className="hidden sm:grid grid-cols-[4rem_5rem_1fr_7rem_2rem] gap-2 text-xs text-muted-foreground px-1">
            <span>Qty</span><span>Unit</span><span>Name</span><span>Notes</span><span />
          </div>
          <div className="space-y-2">
            {ingredients.map((row, i) => (
              <div key={i} className="grid grid-cols-[4rem_5rem_1fr_2rem] sm:grid-cols-[4rem_5rem_1fr_7rem_2rem] gap-2 items-center">
                <Input
                  placeholder="2"
                  value={row.qty}
                  onChange={(e) => updateIngredient(i, "qty", e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="cups"
                  value={row.unit}
                  onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="flour"
                  value={row.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="sifted"
                  value={row.notes}
                  onChange={(e) => updateIngredient(i, "notes", e.target.value)}
                  className="text-sm hidden sm:block"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  disabled={ingredients.length === 1}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-25"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIngredients((p) => [...p, { qty: "", unit: "", name: "", notes: "" }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add ingredient
          </Button>
        </section>

        {/* Instructions */}
        <section className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Instructions</h2>
          <div className="space-y-3">
            {instructions.map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="font-mono text-sm text-muted-foreground mt-2.5 w-5 shrink-0 text-right select-none">
                  {i + 1}
                </span>
                <Textarea
                  placeholder={`Step ${i + 1}…`}
                  value={text}
                  onChange={(e) => updateInstruction(i, e.target.value)}
                  rows={2}
                  className="flex-1 resize-none"
                />
                <button
                  type="button"
                  onClick={() => removeInstruction(i)}
                  disabled={instructions.length === 1}
                  className="p-1 mt-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-25"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInstructions((p) => [...p, ""])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add step
          </Button>
        </section>

        {/* Tags & flags */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tags & Options</h2>

          <div>
            <p className="text-sm font-medium mb-2">Dietary tags</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm border transition-colors",
                    selectedTags.has(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-border hover:bg-secondary"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Custom tag…"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addCustomTag} disabled={!customTag.trim()}>
              Add
            </Button>
          </div>

          {selectedTags.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[...selectedTags].map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-secondary text-sm px-2.5 py-0.5 rounded-full">
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="text-muted-foreground hover:text-foreground leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={isKidFriendly}
                onChange={(e) => setIsKidFriendly(e.target.checked)}
              />
              Kid-friendly
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={isLeftoverFriendly}
                onChange={(e) => setIsLeftoverFriendly(e.target.checked)}
              />
              Good for leftovers
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link to="/recipes">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={!title.trim() || createRecipe.isPending}>
            {createRecipe.isPending ? "Saving…" : "Save recipe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
