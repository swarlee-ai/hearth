import { RouterProvider } from "react-router-dom";
import { useSettings } from "./api/settings";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { router } from "./router";
import { useQueryClient } from "@tanstack/react-query";
import { SETTINGS_KEY } from "./api/settings";

function AppInner() {
  const { data: settings, isLoading } = useSettings();
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary mx-auto flex items-center justify-center">
            <span className="text-white text-lg">🍽️</span>
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!settings?.onboarding_complete) {
    return (
      <OnboardingWizard
        onComplete={() => qc.invalidateQueries({ queryKey: SETTINGS_KEY })}
      />
    );
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
