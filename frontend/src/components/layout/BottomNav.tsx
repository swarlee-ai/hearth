import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, CalendarDays, ShoppingCart,
  Package, FolderHeart, Bot, Globe, Settings, MoreHorizontal, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/recipes", icon: BookOpen, label: "Recipes" },
  { to: "/planner", icon: CalendarDays, label: "Planner" },
  { to: "/shopping", icon: ShoppingCart, label: "Shopping" },
];

const MORE = [
  { to: "/pantry", icon: Package, label: "Pantry" },
  { to: "/collections", icon: FolderHeart, label: "Collections" },
  { to: "/chat", icon: Bot, label: "AI Assistant" },
  { to: "/sites", icon: Globe, label: "Recipe Sites" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const moreIsActive = MORE.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 z-50 bg-card border-t rounded-t-2xl shadow-xl transition-transform duration-200",
          drawerOpen ? "translate-y-0" : "translate-y-full",
        )}
        style={{ bottom: "56px" }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b">
          <span className="text-sm font-semibold">More</span>
          <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="p-2 grid grid-cols-2 gap-1">
          {MORE.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="h-2" />
      </div>

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t flex h-14">
        {PRIMARY.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
            moreIsActive || drawerOpen ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>
    </>
  );
}
