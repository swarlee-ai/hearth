import { useState, useEffect } from "react";
import type { Instruction } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Timer } from "lucide-react";

function parseMinutes(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:[-–to]+\s*\d+\s*)?minutes?/i);
  return match ? parseInt(match[1], 10) : null;
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  title: string;
  instructions: Instruction[];
  onExit: () => void;
}

export function CookingMode({ title, instructions, onExit }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const step = instructions[stepIndex];
  const detectedMinutes = parseMinutes(step.text);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === instructions.length - 1;

  // Reset timer when step changes
  useEffect(() => {
    setTimeLeft(null);
    setRunning(false);
  }, [stepIndex]);

  // Countdown interval — only recreated when running changes, not every tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t) => (t === null || t <= 0 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Stop when countdown reaches zero
  useEffect(() => {
    if (timeLeft === 0) setRunning(false);
  }, [timeLeft]);

  function startTimer() {
    if (timeLeft === null && detectedMinutes) setTimeLeft(detectedMinutes * 60);
    setRunning(true);
  }

  function resetTimer() {
    setTimeLeft(detectedMinutes ? detectedMinutes * 60 : null);
    setRunning(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Now Cooking</p>
          <h2 className="font-semibold text-base leading-tight">{title}</h2>
        </div>
        <button onClick={onExit} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8 max-w-2xl mx-auto w-full">
        {/* Step counter */}
        <p className="text-sm font-medium text-muted-foreground">
          Step {stepIndex + 1} of {instructions.length}
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {instructions.map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === stepIndex
                  ? "w-6 bg-primary"
                  : i < stepIndex
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* Step text */}
        <p className="text-xl md:text-2xl leading-relaxed text-center font-medium">
          {step.text}
        </p>

        {/* Timer — only shown when a duration is mentioned in the step */}
        {detectedMinutes && (
          <div className="flex flex-col items-center gap-3 px-8 py-5 rounded-2xl bg-secondary/60 min-w-[200px]">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Timer className="h-4 w-4" />
              <span>Timer</span>
            </div>
            <p className={`text-5xl font-mono font-bold tabular-nums ${timeLeft === 0 ? "text-primary animate-pulse" : ""}`}>
              {timeLeft !== null ? fmtTime(timeLeft) : `${detectedMinutes}:00`}
            </p>
            {timeLeft === 0 && (
              <p className="text-sm font-semibold text-primary">Time's up!</p>
            )}
            <div className="flex gap-2">
              {!running ? (
                <Button size="sm" onClick={startTimer} disabled={timeLeft === 0}>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  {timeLeft === null ? "Start" : "Resume"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setRunning(false)}>
                  <Pause className="h-3.5 w-3.5 mr-1.5" />
                  Pause
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={resetTimer} aria-label="Reset timer">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 px-5 py-4 border-t">
        <Button
          variant="outline"
          onClick={() => setStepIndex((i) => i - 1)}
          disabled={isFirst}
          className="w-36"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        {isLast ? (
          <Button onClick={onExit} className="w-36">
            Done!
          </Button>
        ) : (
          <Button onClick={() => setStepIndex((i) => i + 1)} className="w-36">
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
