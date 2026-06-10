import { useState, useRef } from "react";
import { usePlannerStore } from "@/store/plannerStore";
import { useWeekPlan } from "@/api/mealPlans";
import { useShoppingList, useToggleShoppingItem, useRegenerateShoppingList, useDeleteShoppingItem, useAddShoppingItem } from "@/api/shoppingList";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Package, X, Plus } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { formatWeekRange } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

export function ShoppingPage() {
  const { currentWeekMonday } = usePlannerStore();
  const { data: plan } = useWeekPlan(currentWeekMonday);
  const { data: shoppingList, isLoading } = useShoppingList(plan?.id);
  const toggleItem = useToggleShoppingItem(plan?.id || "");
  const regenerate = useRegenerateShoppingList(plan?.id || "");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [textOpen, setTextOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const deleteItem = useDeleteShoppingItem(plan?.id || "");
  const addItem = useAddShoppingItem(plan?.id || "");
  const weekLabel = formatWeekRange(new Date(currentWeekMonday + "T00:00:00"));

  function toggleCategory(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function buildPlainText() {
    if (!shoppingList) return "";
    const lines: string[] = [`Shopping List – ${weekLabel}`, ""];
    for (const cat of shoppingList.items) {
      lines.push(cat.category);
      for (const item of cat.items) {
        const qty = item.quantity ? ` (${item.quantity})` : "";
        lines.push(`- ${item.name}${qty}`);
      }
      lines.push("");
    }
    return lines.join("\n").trimEnd();
  }

  async function handleAdd() {
    const name = addName.trim();
    if (!name || !plan) return;
    await addItem.mutateAsync({ name, quantity: addQty.trim() || undefined });
    setAddName("");
    setAddQty("");
  }

  async function handleCopy() {
    const text = buildPlainText();
    let ok = false;
    if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(text); ok = true; } catch { /* fall through */ }
    }
    if (!ok && textareaRef.current) {
      textareaRef.current.select();
      ok = document.execCommand("copy");
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const totalItems = shoppingList?.items.reduce((sum, cat) => sum + cat.items.length, 0) || 0;
  const checkedItems = shoppingList?.items.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.checked).length, 0
  ) || 0;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Shopping List</h1>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => regenerate.mutate()} disabled={regenerate.isPending || !plan}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${regenerate.isPending ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTextOpen(true)} disabled={!shoppingList}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {totalItems > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(checkedItems / totalItems) * 100}%` }}
            />
          </div>
          {checkedItems}/{totalItems} checked
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !shoppingList || shoppingList.items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No shopping list yet. Add recipes to your meal plan first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shoppingList.items.map((category, catIdx) => (
            <div key={category.category} className="rounded-xl border overflow-hidden">
              <button
                onClick={() => toggleCategory(category.category)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 transition-colors",
                  catIdx === 0
                    ? "bg-primary/10 hover:bg-primary/[0.15]"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-display font-medium text-sm",
                    catIdx === 0 ? "text-primary" : "text-foreground/80"
                  )}>{category.category}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.items.filter((i) => i.checked).length}/{category.items.length}
                  </span>
                </div>
                {collapsed.has(category.category) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {!collapsed.has(category.category) && (
                <ul className="divide-y">
                  {category.items.map((item) => (
                    <li key={item.id} className={`group flex items-center gap-3 px-4 py-2.5 ${item.in_pantry ? "opacity-50" : ""}`}>
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(v) => toggleItem.mutate({ itemId: item.id, checked: !!v })}
                      />
                      <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                        {item.name}
                      </span>
                      {item.in_pantry && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" /> in pantry
                        </span>
                      )}
                      {item.quantity && (
                        <span className="text-xs text-muted-foreground">{item.quantity}</span>
                      )}
                      <button
                        onClick={() => deleteItem.mutate(item.id)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ml-1 text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {shoppingList && (
        <div className="flex gap-2">
          <Input
            placeholder="Add item…"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Input
            placeholder="Qty"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-24"
          />
          <Button variant="outline" onClick={handleAdd} disabled={!addName.trim() || addItem.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={textOpen} onOpenChange={setTextOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Shopping List</DialogTitle>
          </DialogHeader>
          <textarea
            ref={textareaRef}
            readOnly
            value={buildPlainText()}
            className="w-full h-72 rounded-md border bg-secondary p-3 text-sm font-mono resize-none focus:outline-none"
          />
          <Button onClick={handleCopy} className="w-full">
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copied!" : "Copy all"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
