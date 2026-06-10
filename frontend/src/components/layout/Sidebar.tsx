import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, CalendarDays, ShoppingCart, Settings, Globe, Package, Bot, FolderHeart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/recipes", icon: BookOpen, label: "Recipes" },
  { to: "/collections", icon: FolderHeart, label: "Collections" },
  { to: "/planner", icon: CalendarDays, label: "Meal Planner" },
  { to: "/shopping", icon: ShoppingCart, label: "Shopping" },
  { to: "/pantry", icon: Package, label: "Pantry" },
  { to: "/chat", icon: Bot, label: "AI Assistant" },
  { to: "/sites", icon: Globe, label: "Recipe Sites" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 bg-secondary border-r flex-col h-full">
      <div className="p-5 border-b">
        <p className="font-display text-lg font-medium text-primary leading-none">Hearth</p>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Meal Planner</p>
      </div>
      <nav className="flex-1 py-3 pr-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-r-lg text-sm font-medium transition-colors border-l-2",
                isActive
                  ? "bg-card text-primary border-primary"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground border-transparent"
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
