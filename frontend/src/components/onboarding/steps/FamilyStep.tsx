import { AppSettings, KidProfile } from "@/types/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  data: Partial<AppSettings>;
  onChange: (d: Partial<AppSettings>) => void;
}

export function FamilyStep({ data, onChange }: Props) {
  const kids = data.kids || [];

  function addKid() {
    onChange({ kids: [...kids, { name: "", age: 5 }] });
  }

  function updateKid(i: number, k: Partial<KidProfile>) {
    const next = kids.map((c, idx) => (idx === i ? { ...c, ...k } : c));
    onChange({ kids: next });
  }

  function removeKid(i: number) {
    onChange({ kids: kids.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Who's in your family?</h2>
        <p className="text-sm text-muted-foreground">This helps us scale recipes and suggest kid-friendly options.</p>
      </div>

      <div>
        <Label>Number of adults</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={data.adults_count ?? 2}
          onChange={(e) => onChange({ adults_count: parseInt(e.target.value) || 1 })}
          className="mt-1.5 w-24"
        />
      </div>

      <div>
        <Label>Kids (optional)</Label>
        <div className="mt-2 space-y-2">
          {kids.map((kid, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Name"
                value={kid.name}
                onChange={(e) => updateKid(i, { name: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                max={17}
                value={kid.age}
                onChange={(e) => updateKid(i, { age: parseInt(e.target.value) || 0 })}
                className="w-20"
                placeholder="Age"
              />
              <Button variant="ghost" size="icon" onClick={() => removeKid(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addKid} className="mt-1">
            <Plus className="h-4 w-4 mr-1" />
            Add a kid
          </Button>
        </div>
      </div>
    </div>
  );
}
