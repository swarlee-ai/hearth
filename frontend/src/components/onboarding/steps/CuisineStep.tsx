import { AppSettings } from "@/types/settings";
import { CUISINES, CUISINE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  data: Partial<AppSettings>;
  onChange: (d: Partial<AppSettings>) => void;
}

export function CuisineStep({ data, onChange }: Props) {
  const prefs = data.cuisine_preferences || [];
  const dislikes = data.disliked_cuisines || [];

  function togglePref(c: string) {
    const isDis = dislikes.includes(c);
    if (isDis) return;
    const next = prefs.includes(c) ? prefs.filter((x) => x !== c) : [...prefs, c];
    onChange({ cuisine_preferences: next });
  }

  function toggleDislike(c: string) {
    const isPref = prefs.includes(c);
    if (isPref) return;
    const next = dislikes.includes(c) ? dislikes.filter((x) => x !== c) : [...dislikes, c];
    onChange({ disliked_cuisines: next });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Cuisine preferences</h2>
        <p className="text-sm text-muted-foreground">
          Click once to mark as <span className="text-green-700 font-medium">favorite</span>,
          right-click to mark as <span className="text-red-600 font-medium">disliked</span>.
          Leave blank to include everything.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CUISINES.map((c) => {
          const isPref = prefs.includes(c);
          const isDis = dislikes.includes(c);
          return (
            <button
              key={c}
              onClick={() => togglePref(c)}
              onContextMenu={(e) => { e.preventDefault(); toggleDislike(c); }}
              className={cn(
                "px-2 py-2 rounded-lg text-xs font-medium border transition-all select-none",
                isPref && "bg-green-100 border-green-300 text-green-800 ring-1 ring-green-400",
                isDis && "bg-red-100 border-red-200 text-red-700 line-through opacity-60",
                !isPref && !isDis && "border-border hover:bg-secondary text-foreground"
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {prefs.length > 0 && `Favorites: ${prefs.join(", ")}. `}
        {dislikes.length > 0 && `Avoid: ${dislikes.join(", ")}.`}
        {prefs.length === 0 && dislikes.length === 0 && "No preferences set — we'll include all cuisines."}
      </p>
    </div>
  );
}
