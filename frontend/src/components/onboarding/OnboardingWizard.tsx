import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCompleteOnboarding } from "@/api/settings";
import { AppSettings, KidProfile } from "@/types/settings";
import { FamilyStep } from "./steps/FamilyStep";
import { DietaryStep } from "./steps/DietaryStep";
import { CuisineStep } from "./steps/CuisineStep";
import { SpiceStep } from "./steps/SpiceStep";
import { LLMStep } from "./steps/LLMStep";
import { ChefHat, ArrowRight, ArrowLeft, Check } from "lucide-react";

const STEPS = ["Family", "Dietary", "Cuisines", "Spice & Meals", "AI Setup"];

const defaultData: Partial<AppSettings> = {
  adults_count: 2,
  kids: [],
  dietary_restrictions: [],
  cuisine_preferences: [],
  disliked_cuisines: [],
  spice_tolerance: "medium",
  planned_meals: ["dinner"],
  llm_base_url: "",
  llm_api_key: "",
  llm_model_name: "",
};

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<AppSettings>>(defaultData);
  const complete = useCompleteOnboarding();

  function update(partial: Partial<AppSettings>) {
    setData((d) => ({ ...d, ...partial }));
  }

  async function finish() {
    await complete.mutateAsync(data);
    onComplete();
  }

  const stepComponents = [
    <FamilyStep key="family" data={data} onChange={update} />,
    <DietaryStep key="dietary" data={data} onChange={update} />,
    <CuisineStep key="cuisine" data={data} onChange={update} />,
    <SpiceStep key="spice" data={data} onChange={update} />,
    <LLMStep key="llm" data={data} onChange={update} />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Welcome to Meal Planner</h1>
              <p className="text-sm text-muted-foreground">Let's set up your family profile</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-border"
                  }`}
                />
                <span className={`text-xs ${i === step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {stepComponents[step]}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={complete.isPending}>
                {complete.isPending ? "Saving..." : "Get Started"}
                <Check className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
