import { useState } from "react";
import { AppSettings } from "@/types/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTestLLM } from "@/api/settings";
import { Check, X, Loader2 } from "lucide-react";

interface Props {
  data: Partial<AppSettings>;
  onChange: (d: Partial<AppSettings>) => void;
}

export function LLMStep({ data, onChange }: Props) {
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const testLLM = useTestLLM();

  async function handleTest() {
    if (!data.llm_base_url || !data.llm_model_name) return;
    setTestResult(null);
    const result = await testLLM.mutateAsync({
      base_url: data.llm_base_url,
      api_key: data.llm_api_key,
      model_name: data.llm_model_name,
    });
    setTestResult(result);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">AI Setup</h2>
        <p className="text-sm text-muted-foreground">
          Connect an AI model for meal plan generation. Works with Ollama, LM Studio, OpenAI, Anthropic, or any OpenAI-compatible endpoint.
          You can skip this and set it up later in Settings.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Base URL</Label>
          <Input
            placeholder="http://localhost:11434/v1"
            value={data.llm_base_url || ""}
            onChange={(e) => onChange({ llm_base_url: e.target.value })}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ollama: <code>http://localhost:11434/v1</code> · LM Studio: <code>http://localhost:1234/v1</code> · OpenAI: <code>https://api.openai.com/v1</code>
          </p>
        </div>

        <div>
          <Label>Model name</Label>
          <Input
            placeholder="llama3.2"
            value={data.llm_model_name || ""}
            onChange={(e) => onChange({ llm_model_name: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>API key <span className="text-muted-foreground font-normal">(optional for local models)</span></Label>
          <Input
            type="password"
            placeholder="sk-... or leave blank for Ollama"
            value={data.llm_api_key || ""}
            onChange={(e) => onChange({ llm_api_key: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testLLM.isPending || !data.llm_base_url || !data.llm_model_name}
        >
          {testLLM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Test Connection
        </Button>

        {testResult && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {testResult.ok ? <Check className="h-4 w-4 mt-0.5" /> : <X className="h-4 w-4 mt-0.5" />}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
