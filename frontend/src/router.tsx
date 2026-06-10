import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { RecipesPage } from "./pages/RecipesPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { PlannerPage } from "./pages/PlannerPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TrustedSitesPage } from "./pages/TrustedSitesPage";
import { PantryPage } from "./pages/PantryPage";
import { ChatPage } from "./pages/ChatPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { CollectionDetailPage } from "./pages/CollectionDetailPage";
import { RecipeNewPage } from "./pages/RecipeNewPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "recipes", element: <RecipesPage /> },
      { path: "recipes/new", element: <RecipeNewPage /> },
      { path: "recipes/:id", element: <RecipeDetailPage /> },
      { path: "planner", element: <PlannerPage /> },
      { path: "shopping", element: <ShoppingPage /> },
      { path: "pantry", element: <PantryPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "collections", element: <CollectionsPage /> },
      { path: "collections/:id", element: <CollectionDetailPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "sites", element: <TrustedSitesPage /> },
    ],
  },
]);
