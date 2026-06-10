import { AppSettings } from "@/types/settings";
import { MEAL_TYPES } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const SPICE_OPTIONS = [
  { value: "mild", label: "Mild", emoji: "🥕", desc: "No spice — kid-friendly by default" },
  { value: "medium", label: "Medium", emoji: "🌶️", desc: "Some heat, but not overwhelming" },
  { value: "hot", label: "Hot", emoji: "🔥", desc: "We love spicy food" },
];

interface Props {
  data: Partial<AppSettings>;
  onChange: (d: Partial<AppSettings>) => void;
}

export function SpiceStep({ data, onChange }: Props) {
  const meals = data.planned_meals || ["dinner"];

  function toggleMeal(m: string) {
    const next = meals.includes(m)
      ? meals.filter((x) => x !== m)
      : [...meals, m];
    if (next.length === 0) return;
    onChange({ planned_meals: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Spice & meal preferences</h2>
        <p className="text-sm text-muted-foreground">How spicy do you like your food? Which meals should we plan?</p>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Spice tolerance</p>
        <div className="grid grid-cols-3 gap-2">
          {SPICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ spice_tolerance: opt.value })}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all",
                data.spice_tolerance === opt.value
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:bg-secondary"
              )}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Which meals to plan?</p>
        <div className="flex gap-3">
          {MEAL_TYPES.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={meals.includes(m)}
                onCheckedChange={() => toggleMeal(m)}
              />
              <span className="text-sm capitalize">{m}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
