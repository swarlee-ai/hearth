import { RecipeFilters } from "@/types/recipe";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CUISINES, DIFFICULTIES } from "@/lib/constants";
import { Search } from "lucide-react";
import { useCollections } from "@/api/collections";

const TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: "Meal", tags: ["breakfast", "lunch", "dinner", "dessert"] },
  { label: "Protein", tags: ["chicken", "beef", "pork", "fish", "seafood", "lamb", "turkey", "tofu"] },
  { label: "Dish type", tags: ["soup", "salad", "pasta", "pizza", "tacos", "curry", "stir-fry", "casserole", "sandwich", "bowl", "bread", "snack"] },
  { label: "Dietary", tags: ["vegetarian", "vegan"] },
  { label: "Time", tags: ["quick", "under 1 hour"] },
  { label: "Method", tags: ["baked", "grilled", "roasted", "slow cooker", "air fryer", "one-pot", "no-cook"] },
];

interface Props {
  filters: RecipeFilters;
  onChange: (f: RecipeFilters) => void;
}

export function FilterPanel({ filters, onChange }: Props) {
  const { data: collections = [] } = useCollections();

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes..."
          value={filters.search || ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      {collections.length > 0 && (
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Collection</Label>
          <Select
            value={filters.collection_id || "all"}
            onValueChange={(v) => onChange({ ...filters, collection_id: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="All collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collections</SelectItem>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.color || "#6b7280" }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cuisine</Label>
        <Select
          value={filters.cuisine || "all"}
          onValueChange={(v) => onChange({ ...filters, cuisine: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="All cuisines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cuisines</SelectItem>
            {CUISINES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Difficulty</Label>
        <Select
          value={filters.difficulty || "all"}
          onValueChange={(v) => onChange({ ...filters, difficulty: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Any difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any difficulty</SelectItem>
            {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Filter by</Label>
        {[
          { key: "is_favorite", label: "Favorites only" },
          { key: "kid_friendly", label: "Kid-friendly" },
          { key: "leftover_friendly", label: "Good for leftovers" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={!!(filters as any)[key]}
              onCheckedChange={(v) => onChange({ ...filters, [key]: v || undefined })}
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>

      {TAG_GROUPS.map(({ label, tags }) => (
        <div key={label} className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
          <div className="space-y-1">
            {tags.map((tag) => {
              const active = filters.tags?.includes(tag) ?? false;
              return (
                <label key={tag} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={active}
                    onCheckedChange={(v) => {
                      const current = filters.tags ?? [];
                      const next = v ? [...current, tag] : current.filter((t) => t !== tag);
                      onChange({ ...filters, tags: next.length ? next : undefined });
                    }}
                  />
                  <span className="text-sm capitalize">{tag}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
