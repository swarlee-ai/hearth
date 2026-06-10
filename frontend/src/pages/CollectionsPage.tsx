import { useState } from "react";
import { Link } from "react-router-dom";
import { useCollections, useCreateCollection, useUpdateCollection, useDeleteCollection } from "@/api/collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderHeart, Pencil, Trash2, Plus, ChevronRight } from "lucide-react";
import { CollectionWithCount } from "@/types/collection";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : "none",
            outlineOffset: "2px",
          }}
        />
      ))}
    </div>
  );
}

function CollectionForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial?: { name: string; description: string; color: string };
  onSave: (d: { name: string; description: string; color: string }) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? COLORS[5]);

  return (
    <div className="rounded-xl border p-4 space-y-3 bg-card">
      <div className="flex gap-2">
        <Input
          placeholder="Collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
          autoFocus
          className="flex-1"
        />
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Color:</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => name.trim() && onSave({ name: name.trim(), description, color })} disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function CollectionCard({ coll, onEdit, onDelete }: { coll: CollectionWithCount; onEdit: () => void; onDelete: () => void }) {
  const color = coll.color || "#6b7280";
  return (
    <div className="group relative rounded-xl border overflow-hidden bg-card hover:shadow-md transition-shadow">
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug">{coll.name}</h3>
            {coll.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{coll.description}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full flex-shrink-0">
            {coll.recipe_count} recipe{coll.recipe_count !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <Link
            to={`/collections/${coll.id}`}
            className="text-xs text-primary flex items-center gap-0.5 hover:underline"
          >
            View <ChevronRight className="h-3 w-3" />
          </Link>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollectionsPage() {
  const { data: collections = [], isLoading } = useCollections();
  const createColl = useCreateCollection();
  const updateColl = useUpdateCollection();
  const deleteColl = useDeleteCollection();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Collections</h1>
          <p className="text-sm text-muted-foreground">{collections.length} collection{collections.length !== 1 ? "s" : ""}</p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Collection
          </Button>
        )}
      </div>

      {creating && (
        <CollectionForm
          submitLabel="Create"
          onCancel={() => setCreating(false)}
          onSave={(d) => {
            createColl.mutate(d, { onSuccess: () => setCreating(false) });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : collections.length === 0 && !creating ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderHeart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No collections yet. Create one to organize your recipes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((coll) =>
            editingId === coll.id ? (
              <div key={coll.id}>
                <CollectionForm
                  initial={{ name: coll.name, description: coll.description || "", color: coll.color || COLORS[5] }}
                  submitLabel="Save"
                  onCancel={() => setEditingId(null)}
                  onSave={(d) => {
                    updateColl.mutate({ id: coll.id, data: d }, { onSuccess: () => setEditingId(null) });
                  }}
                />
              </div>
            ) : (
              <CollectionCard
                key={coll.id}
                coll={coll}
                onEdit={() => setEditingId(coll.id)}
                onDelete={() => {
                  if (confirm(`Delete "${coll.name}"?`)) deleteColl.mutate(coll.id);
                }}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
