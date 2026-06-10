import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useWeekPlan } from "@/api/mealPlans";
import { useRecipes } from "@/api/recipes";
import { useSettings } from "@/api/settings";
import { usePantry } from "@/api/pantry";
import { useCollections } from "@/api/collections";
import { toISODate, getMondayOfWeek, formatWeekRange } from "@/lib/dateUtils";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { Button } from "@/components/ui/button";
import { BookOpen, Package, FolderHeart, ArrowRight } from "lucide-react";

export function DashboardPage() {
  const { data: settings } = useSettings();
  const { data: pantryItems = [] } = usePantry();
  const { data: collections = [] } = useCollections();
  const thisMonday = toISODate(getMondayOfWeek(new Date()));
  const { data: plan } = useWeekPlan(thisMonday);
  const { data: recentRecipes } = useRecipes({ page: 1, limit: 4 });

  const plannedCount = plan?.entries.length || 0;
  const totalSlots = settings?.meal_schedule
    ? Object.values(settings.meal_schedule).reduce((sum, meals) => sum + (meals?.length || 0), 0)
    : 7;
  const fillPct = totalSlots > 0 ? Math.round((plannedCount / totalSlots) * 100) : 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
      </motion.div>

      {/* This Week card */}
      <div className="rounded-xl border bg-card p-5 mb-4">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base">This Week</h2>
          <span className="text-xs text-muted-foreground">
            {formatWeekRange(new Date(thisMonday + "T00:00:00"))}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-muted-foreground">
            <span className="font-mono text-foreground font-medium">{plannedCount}</span>
            {" of "}
            <span className="font-mono text-foreground font-medium">{totalSlots}</span>
            {" meals planned"}
          </span>
          <Link
            to="/planner"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View planner
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {plan && plan.entries.length > 0 ? (
          <div className="space-y-2 pt-3 border-t">
            {plan.entries.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground text-xs w-28 shrink-0">
                  {new Date(entry.plan_date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="truncate text-foreground/90">{entry.recipe?.title || "—"}</span>
              </div>
            ))}
            {plannedCount > 4 && (
              <Link to="/planner" className="text-xs text-primary hover:underline">
                +{plannedCount - 4} more meals
              </Link>
            )}
          </div>
        ) : (
          <div className="pt-3 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">No meals planned yet.</p>
            <Link to="/planner">
              <Button size="sm">Plan this week</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: BookOpen, label: "Recipes", value: recentRecipes?.total ?? "—", link: "/recipes" },
          { icon: Package, label: "Pantry", value: pantryItems.length, link: "/pantry" },
          { icon: FolderHeart, label: "Collections", value: collections.length, link: "/collections" },
        ].map(({ icon: Icon, label, value, link }) => (
          <Link key={link} to={link}>
            <div className="rounded-xl border bg-card p-3 hover:bg-secondary/40 transition-colors text-center">
              <p className="font-mono text-2xl font-medium leading-none mb-1">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent recipes */}
      {recentRecipes && recentRecipes.items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base">Recent recipes</h2>
            <Link to="/recipes" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recentRecipes.items.map((r) => (
              <div key={r.id} className="relative">
                <RecipeCard recipe={r} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
