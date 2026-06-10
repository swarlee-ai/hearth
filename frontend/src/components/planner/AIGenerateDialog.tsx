import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { PLANS_KEY } from "@/api/mealPlans";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  weekLabel: string;
}

type Status = "idle" | "generating" | "done" | "error";

export function AIGenerateDialog({ open, onClose, planId, weekLabel }: Props) {
  const [constraints, setConstraints] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog] = useState<string[]>([]);
  const qc = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    setStatus("generating");
    setLog(["Starting meal plan generation..."]);
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(`/api/meal-plans/${planId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate_all: true, constraints: constraints || null }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Generation failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data:"));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.error) {
              setLog((l) => [...l, `Error: ${data.error}`]);
              setStatus("error");
              return;
            }
            if (data.status === "complete") {
              setLog((l) => [...l, "✓ Plan generated!", data.notes ? `Notes: ${data.notes}` : ""]);
              setStatus("done");
            } else if (data.chunk) {
              // streaming chunks — just show a spinner
            } else if (data.status === "generating") {
              setLog((l) => [...l, "Asking AI to plan your week..."]);
            }
          } catch {}
        }
      }

      if (status !== "error") setStatus("done");
      qc.invalidateQueries({ queryKey: PLANS_KEY });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setLog((l) => [...l, `Error: ${e.message}`]);
        setStatus("error");
      }
    }
  }

  function handleClose() {
    abortRef.current?.abort();
    setStatus("idle");
    setLog([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Meal Plan
          </DialogTitle>
          <DialogDescription>
            AI will fill your week of {weekLabel} with recipes from your library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {status === "idle" && (
            <>
              <div>
                <Label>Any extra constraints? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="e.g. avoid pasta this week, include a stir-fry, make Saturday dinner special"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  className="mt-1.5 h-20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={generate}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              </div>
            </>
          )}

          {status === "generating" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1 text-sm text-center">
                {log.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="flex flex-col items-center gap-3 py-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div className="space-y-1 text-sm text-center">
                {log.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
              </div>
              <Button onClick={handleClose} className="mt-2">View Plan</Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div className="space-y-1 text-sm text-center text-destructive">
                {log.map((l, i) => <p key={i}>{l}</p>)}
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => { setStatus("idle"); setLog([]); }}>Try Again</Button>
                <Button variant="outline" onClick={handleClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
