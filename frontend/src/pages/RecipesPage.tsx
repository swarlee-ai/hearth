import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRecipes } from "@/api/recipes";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { FilterPanel } from "@/components/recipes/FilterPanel";
import { RecipeImportDialog } from "@/components/recipes/RecipeImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecipeFilters } from "@/types/recipe";
import { Link2, Plus, BookOpen, SlidersHorizontal, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_FILTERS: { label: string; key: string | null }[] = [
  { label: "All", key: null },
  { label: "Favorites", key: "favorites" },
  { label: "Quick <30m", key: "quick" },
  { label: "Vegetarian", key: "vegetarian" },
];

function filtersFromQuick(key: string | null, current: RecipeFilters): RecipeFilters {
  const search = current.search;
  if (key === null) return search ? { search } : {};
  if (key === "favorites") return { search, is_favorite: true };
  if (key === "quick") return { search, tags: ["quick"] };
  if (key === "vegetarian") return { search, tags: ["vegetarian"] };
  return search ? { search } : {};
}

function activeQuickKey(filters: RecipeFilters): string | null {
  if (filters.is_favorite) return "favorites";
  if (filters.tags?.includes("quick") && !filters.tags.includes("vegetarian")) return "quick";
  if (filters.tags?.includes("vegetarian") && !filters.tags.includes("quick")) return "vegetarian";
  return null;
}

export function RecipesPage() {
  const [filters, setFilters] = useState<RecipeFilters>({});
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading } = useRecipes({ ...filters, page, limit: 20 });

  const activeKey = activeQuickKey(filters);
  const hasAdvancedFilters = Boolean(
    filters.cuisine || filters.difficulty || filters.collection_id ||
    filters.kid_friendly || filters.leftover_friendly ||
    (filters.tags && filters.tags.some((t) => !["quick", "vegetarian"].includes(t)))
  );

  function handleQuickFilter(key: string | null) {
    setFilters((f) => filtersFromQuick(key, f));
    setPage(1);
  }

  function handleSearch(value: string) {
    setFilters((f) => ({ ...f, search: value || undefined }));
    setPage(1);
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Recipes</h1>
          {data && <p className="text-sm text-muted-foreground mt-0.5">{data.total} recipes</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Link2 className="h-4 w-4 mr-1.5" />
            Import URL
          </Button>
          <Button size="sm" asChild>
            <Link to="/recipes/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Recipe
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + pill filters */}
      <div className="mb-5 space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search recipes…"
            value={filters.search || ""}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_FILTERS.map((qf) => (
            <button
              key={qf.label}
              onClick={() => handleQuickFilter(qf.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border",
                activeKey === qf.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
              )}
            >
              {qf.label}
            </button>
          ))}
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border",
              hasAdvancedFilters
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-transparent text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasAdvancedFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        </div>
      </div>

      {/* Filters drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-50 w-72 bg-background border-r p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Filters</h2>
              <button onClick={() => setDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              onChange={(f) => { setFilters(f); setPage(1); }}
            />
          </div>
        </div>
      )}

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen className="h-14 w-14 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg">No recipes found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Try adjusting your filters or import a new recipe.
          </p>
          <Button className="mt-4" onClick={() => setImportOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Import from URL
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {data?.items.map((recipe) => (
                <div key={recipe.id} className="relative">
                  <RecipeCard recipe={recipe} />
                </div>
              ))}
            </AnimatePresence>
          </div>
          {data && data.total > 20 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-3">
                Page {page} of {Math.ceil(data.total / 20)}
              </span>
              <Button
                variant="outline"
                disabled={page * 20 >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <RecipeImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
