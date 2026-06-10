import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm max-w-sm",
        type === "success" && "bg-green-50 border-green-200 text-green-900",
        type === "error" && "bg-red-50 border-red-200 text-red-900",
        type === "info" && "bg-card border-border text-foreground"
      )}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
  id: number;
}

let toastListeners: ((t: ToastState | null) => void)[] = [];
let toastCounter = 0;

export function toast(message: string, type: "success" | "error" | "info" = "info") {
  const state: ToastState = { message, type, id: ++toastCounter };
  toastListeners.forEach((fn) => fn(state));
}

export function ToastProvider() {
  const [current, setCurrent] = React.useState<ToastState | null>(null);
  React.useEffect(() => {
    toastListeners.push(setCurrent);
    return () => { toastListeners = toastListeners.filter((fn) => fn !== setCurrent); };
  }, []);
  if (!current) return null;
  return <Toast message={current.message} type={current.type} onClose={() => setCurrent(null)} />;
}
