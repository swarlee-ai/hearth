import { useState } from "react";
import { Link } from "react-router-dom";
import { useSettings, useUpdateFamily, useUpdateLLM, useTestLLM } from "@/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { CUISINES, MEAL_TYPES, DIETARY_TAGS } from "@/lib/constants";
import { Loader2, Check, X, Globe, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { KidProfile } from "@/types/settings";

export function SettingsPage() {
  const { data: settings } = useSettings();
  const updateFamily = useUpdateFamily();
  const updateLLM = useUpdateLLM();
  const testLLM = useTestLLM();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [llmForm, setLLMForm] = useState({ base_url: "", api_key: "", model_name: "" });
  const [llmSynced, setLLMSynced] = useState(false);
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [kidsSynced, setKidsSynced] = useState(false);
  const [newKidName, setNewKidName] = useState("");
  const [newKidAge, setNewKidAge] = useState("");
  const [editingKidIdx, setEditingKidIdx] = useState<number | null>(null);
  const [editKid, setEditKid] = useState<KidProfile>({ name: "", age: 0 });

  // Sync LLM form with settings once loaded
  if (settings && !llmSynced) {
    setLLMForm({
      base_url: settings.llm_base_url || "",
      api_key: settings.llm_api_key || "",
      model_name: settings.llm_model_name || "",
    });
    setLLMSynced(true);
  }

  // Sync kids list with settings once loaded
  if (settings && !kidsSynced) {
    setKids(settings.kids || []);
    setKidsSynced(true);
  }

  function removeKid(idx: number) {
    const next = kids.filter((_, i) => i !== idx);
    setKids(next);
    updateFamily.mutate({ kids: next });
  }

  function addKid() {
    const name = newKidName.trim();
    const age = parseInt(newKidAge);
    if (!name || !age) return;
    const next = [...kids, { name, age }];
    setKids(next);
    updateFamily.mutate({ kids: next });
    setNewKidName("");
    setNewKidAge("");
  }

  function saveEditKid() {
    if (editingKidIdx === null || !editKid.name.trim()) return;
    const next = kids.map((k, i) => (i === editingKidIdx ? { ...editKid, name: editKid.name.trim() } : k));
    setKids(next);
    updateFamily.mutate({ kids: next });
    setEditingKidIdx(null);
  }

  async function saveLLM() {
    await updateLLM.mutateAsync({
      llm_base_url: llmForm.base_url,
      llm_api_key: llmForm.api_key,
      llm_model_name: llmForm.model_name,
    });
    toast("LLM settings saved", "success");
  }

  async function handleTest() {
    if (!llmForm.base_url || !llmForm.model_name) return;
    setTestResult(null);
    const result = await testLLM.mutateAsync({ base_url: llmForm.base_url, api_key: llmForm.api_key, model_name: llmForm.model_name });
    setTestResult(result);
  }

  function toggleDietaryRestriction(tag: string) {
    if (!settings) return;
    const next = settings.dietary_restrictions.includes(tag)
      ? settings.dietary_restrictions.filter((r) => r !== tag)
      : [...settings.dietary_restrictions, tag];
    updateFamily.mutate({ dietary_restrictions: next });
  }

  function toggleDayMeal(day: string, meal: string) {
    if (!settings) return;
    const current = settings.meal_schedule?.[day] ?? ["dinner"];
    const next = current.includes(meal) ? current.filter((m) => m !== meal) : [...current, meal];
    if (next.length === 0) return;
    updateFamily.mutate({ meal_schedule: { ...settings.meal_schedule, [day]: next } });
  }

  if (!settings) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Family profile */}
      <Card>
        <CardHeader>
          <CardTitle>Family Profile</CardTitle>
          <CardDescription>Who are you cooking for?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Adults</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.adults_count}
              onChange={(e) => updateFamily.mutate({ adults_count: parseInt(e.target.value) || 1 })}
              className="mt-1.5 w-24"
            />
          </div>
          <div>
            <Label>Children</Label>
            <div className="mt-2 space-y-1.5">
              {kids.map((kid, i) => (
                editingKidIdx === i ? (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={editKid.name}
                      onChange={(e) => setEditKid((k) => ({ ...k, name: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && saveEditKid()}
                      className="h-8 flex-1"
                      placeholder="Name"
                      autoFocus
                    />
                    <Input
                      type="number"
                      value={editKid.age || ""}
                      onChange={(e) => setEditKid((k) => ({ ...k, age: parseInt(e.target.value) || 0 }))}
                      onKeyDown={(e) => e.key === "Enter" && saveEditKid()}
                      className="h-8 w-16"
                      placeholder="Age"
                    />
                    <Button size="sm" onClick={saveEditKid}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingKidIdx(null)}>Cancel</Button>
                  </div>
                ) : (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="flex-1 text-sm">{kid.name}, age {kid.age}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingKidIdx(i); setEditKid(kid); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeKid(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )
              ))}
              <div className="flex gap-2 items-center pt-1">
                <Input
                  placeholder="Name"
                  value={newKidName}
                  onChange={(e) => setNewKidName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKid()}
                  className="h-8 flex-1"
                />
                <Input
                  type="number"
                  placeholder="Age"
                  value={newKidAge}
                  onChange={(e) => setNewKidAge(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKid()}
                  className="h-8 w-16"
                />
                <Button size="sm" variant="outline" onClick={addKid}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Meal schedule</Label>
            <div className="mt-2 border rounded-md overflow-hidden">
              <div className="grid grid-cols-4 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <div>Day</div>
                {MEAL_TYPES.map((m) => (
                  <div key={m} className="text-center capitalize">{m}</div>
                ))}
              </div>
              {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map((day) => (
                <div key={day} className="grid grid-cols-4 items-center px-3 py-2 border-t">
                  <div className="text-sm capitalize">{day.slice(0, 3)}</div>
                  {MEAL_TYPES.map((meal) => (
                    <div key={meal} className="flex justify-center">
                      <Checkbox
                        checked={settings.meal_schedule?.[day]?.includes(meal) ?? false}
                        onCheckedChange={() => toggleDayMeal(day, meal)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Dietary restrictions</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {DIETARY_TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={settings.dietary_restrictions.includes(tag)}
                    onCheckedChange={() => toggleDietaryRestriction(tag)}
                  />
                  <span className="text-sm capitalize">{tag}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shopping settings */}
      <Card>
        <CardHeader>
          <CardTitle>Shopping</CardTitle>
          <CardDescription>Optimize your shopping list for your store's layout.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Store layout</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {[
              { value: "default", label: "Default" },
              { value: "walmart", label: "Walmart" },
              { value: "target", label: "Target" },
              { value: "costco", label: "Costco" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateFamily.mutate({ store_layout: value })}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  (settings.store_layout || "default") === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Categories on your shopping list will be sorted to match this store's aisle order.
            Regenerate your shopping list after changing.
          </p>
        </CardContent>
      </Card>

      {/* LLM settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>Connect to an OpenAI-compatible LLM endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Base URL</Label>
            <Input
              className="mt-1.5"
              placeholder="http://localhost:11434/v1"
              value={llmForm.base_url}
              onChange={(e) => setLLMForm((f) => ({ ...f, base_url: e.target.value }))}
            />
          </div>
          <div>
            <Label>Model name</Label>
            <Input
              className="mt-1.5"
              placeholder="llama3.2"
              value={llmForm.model_name}
              onChange={(e) => setLLMForm((f) => ({ ...f, model_name: e.target.value }))}
            />
          </div>
          <div>
            <Label>API key <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              type="password"
              className="mt-1.5"
              placeholder="sk-... or leave blank for local models"
              value={llmForm.api_key}
              onChange={(e) => setLLMForm((f) => ({ ...f, api_key: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveLLM} disabled={updateLLM.isPending}>
              {updateLLM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testLLM.isPending || !llmForm.base_url || !llmForm.model_name}>
              {testLLM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Test Connection
            </Button>
          </div>
          {testResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {testResult.ok ? <Check className="h-4 w-4 mt-0.5" /> : <X className="h-4 w-4 mt-0.5" />}
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trusted sites link */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Trusted Recipe Sites</p>
              <p className="text-xs text-muted-foreground">Browse and batch-import recipes from saved sites</p>
            </div>
          </div>
          <Link to="/sites">
            <Button variant="outline" size="sm">
              Manage <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
