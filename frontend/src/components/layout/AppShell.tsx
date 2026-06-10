import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <ToastProvider />
    </div>
  );
}
