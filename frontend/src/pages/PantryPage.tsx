import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { usePantry, usePantrySuggestions, useAddPantryItem, useUpdatePantryItem, useDeletePantryItem, useClearPantry } from "@/api/pantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Pencil, Trash2, Clock, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { PantryItem } from "@/types/pantry";

export function PantryPage() {
  const { data: items = [], isLoading } = usePantry();
  const { data: suggestions = [] } = usePantrySuggestions();
  const addItem = useAddPantryItem();
  const updateItem = useUpdatePantryItem();
  const deleteItem = useDeletePantryItem();
  const clearAll = useClearPantry();

  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; quantity: string; unit: string }>({ name: "", quantity: "", unit: "" });
  const nameRef = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addItem.mutate({ name: name.trim(), quantity: qty.trim() || undefined, unit: unit.trim() || undefined });
    setName("");
    setQty("");
    setUnit("");
    nameRef.current?.focus();
  }

  function startEdit(item: PantryItem) {
    setEditingId(item.id);
    setEditDraft({ name: item.name, quantity: item.quantity || "", unit: item.unit || "" });
  }

  function saveEdit() {
    if (!editingId || !editDraft.name.trim()) return;
    updateItem.mutate({
      id: editingId,
      data: { name: editDraft.name.trim(), quantity: editDraft.quantity.trim() || undefined, unit: editDraft.unit.trim() || undefined },
    });
    setEditingId(null);
  }

  const grouped = items.reduce<Record<string, PantryItem[]>>((acc, item) => {
    const cat = item.category || "Other";
    (acc[cat] = acc[cat] || []).push(item);
    return acc;
  }, {});

  const categoryOrder = [
    "Produce", "Meat & Seafood", "Dairy & Eggs", "Bakery & Bread",
    "Pantry & Dry Goods", "Spices & Seasonings", "Frozen", "Beverages", "Other",
  ];
  const sortedCategories = [
    ...categoryOrder.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pantry</h1>
          <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (confirm("Clear all pantry items?")) clearAll.mutate(); }}
            disabled={clearAll.isPending}
          >
            Clear All
          </Button>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          ref={nameRef}
          placeholder="Item name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-20"
        />
        <Input
          placeholder="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-24"
        />
        <Button type="submit" disabled={!name.trim() || addItem.isPending}>Add</Button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-secondary rounded-lg animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Your pantry is empty. Add items to track what you have on hand.</p>
            </div>
          ) : (
            sortedCategories.map((cat, catIdx) => (
              <div key={cat} className="rounded-xl border overflow-hidden">
                <div className={cn(
                  "px-4 py-3",
                  catIdx === 0 ? "bg-primary/10" : "bg-secondary"
                )}>
                  <span className={cn(
                    "font-display font-medium text-sm",
                    catIdx === 0 ? "text-primary" : "text-foreground/80"
                  )}>{cat}</span>
                </div>
                <div className="divide-y overflow-hidden">
                  {grouped[cat].map((item) =>
                    editingId === item.id ? (
                      <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                        <Input
                          value={editDraft.name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          className="flex-1 h-7 text-sm"
                          autoFocus
                        />
                        <Input
                          value={editDraft.quantity}
                          onChange={(e) => setEditDraft((d) => ({ ...d, quantity: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          placeholder="Qty"
                          className="w-16 h-7 text-sm"
                        />
                        <Input
                          value={editDraft.unit}
                          onChange={(e) => setEditDraft((d) => ({ ...d, unit: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          placeholder="Unit"
                          className="w-20 h-7 text-sm"
                        />
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={saveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div key={item.id} className="group flex items-center gap-2 px-3 py-2.5">
                        <span className="flex-1 text-sm">{item.name}</span>
                        {(item.quantity || item.unit) && (
                          <span className="text-xs text-muted-foreground">
                            {[item.quantity, item.unit].filter(Boolean).join(" ")}
                          </span>
                        )}
                        <button
                          onClick={() => startEdit(item)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-foreground text-muted-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItem.mutate(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive text-muted-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 sticky top-6">
          <h2 className="font-semibold text-sm">What Can I Make?</h2>
          {suggestions.length === 0 ? (
            <div className="rounded-xl border p-4 text-center text-sm text-muted-foreground">
              <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {items.length === 0 ? "Add pantry items to see suggestions." : "No recipe matches found."}
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <Link key={s.recipe_id} to={`/recipes/${s.recipe_id}`} className="block">
                  <div className="rounded-xl border p-3 hover:bg-secondary/50 transition-colors">
                    <div className="flex gap-2.5">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <ChefHat className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug truncate">{s.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {s.cuisine_type && <span>{s.cuisine_type}</span>}
                          {s.total_time_minutes && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {s.total_time_minutes >= 60
                                ? `${Math.floor(s.total_time_minutes / 60)}h${s.total_time_minutes % 60 ? ` ${s.total_time_minutes % 60}m` : ""}`
                                : `${s.total_time_minutes}m`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full"
                                style={{ width: `${s.coverage_pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {s.matched_ingredients}/{s.total_ingredients}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
