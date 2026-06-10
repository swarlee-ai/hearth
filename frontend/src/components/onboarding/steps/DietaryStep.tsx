import { AppSettings } from "@/types/settings";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const COMMON = ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free", "low-carb", "halal", "kosher"];

interface Props {
  data: Partial<AppSettings>;
  onChange: (d: Partial<AppSettings>) => void;
}

export function DietaryStep({ data, onChange }: Props) {
  const restrictions = data.dietary_restrictions || [];
  const [custom, setCustom] = useState("");

  function toggle(tag: string) {
    const next = restrictions.includes(tag)
      ? restrictions.filter((r) => r !== tag)
      : [...restrictions, tag];
    onChange({ dietary_restrictions: next });
  }

  function addCustom() {
    if (!custom.trim()) return;
    onChange({ dietary_restrictions: [...restrictions, custom.trim().toLowerCase()] });
    setCustom("");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Any dietary restrictions?</h2>
        <p className="text-sm text-muted-foreground">Select all that apply. You can update these anytime.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {COMMON.map((tag) => (
          <label key={tag} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
            <Checkbox
              checked={restrictions.includes(tag)}
              onCheckedChange={() => toggle(tag)}
            />
            <span className="text-sm capitalize">{tag}</span>
          </label>
        ))}
      </div>

      <div>
        <Label>Add custom restriction</Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            placeholder="e.g. soy-free"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <Button variant="outline" size="icon" onClick={addCustom}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {restrictions.filter((r) => !COMMON.includes(r)).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {restrictions.filter((r) => !COMMON.includes(r)).map((r) => (
              <span key={r} className="bg-secondary text-xs px-2 py-1 rounded-full">{r}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
