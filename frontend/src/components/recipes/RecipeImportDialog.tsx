import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useImportRecipe, useImportFromPhoto, useImportFromYouTube } from "@/api/recipes";
import { toast } from "@/components/ui/toast";
import { Link2, Image, Youtube, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "url" | "photo" | "youtube";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RecipeImportDialog({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importUrl = useImportRecipe();
  const importPhoto = useImportFromPhoto();
  const importYouTube = useImportFromYouTube();

  const isPending = importUrl.isPending || importPhoto.isPending || importYouTube.isPending;

  function handleClose() {
    if (isPending) return;
    setUrl("");
    setYtUrl("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setDragging(false);
    onClose();
  }

  function selectPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("Image must be under 10 MB.", "error");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUrlImport() {
    if (!url.trim()) return;
    try {
      const recipe = await importUrl.mutateAsync(url.trim());
      toast(`Imported "${recipe.title}"`, "success");
      handleClose();
    } catch (e: any) {
      toast(e.response?.data?.detail || e.message || "Import failed", "error");
    }
  }

  async function handlePhotoImport() {
    if (!photoFile) return;
    try {
      const recipe = await importPhoto.mutateAsync(photoFile);
      toast(`Imported "${recipe.title}"`, "success");
      handleClose();
    } catch (e: any) {
      toast(e.response?.data?.detail || e.message || "Photo import failed", "error");
    }
  }

  async function handleYouTubeImport() {
    if (!ytUrl.trim()) return;
    try {
      const recipe = await importYouTube.mutateAsync(ytUrl.trim());
      toast(`Imported "${recipe.title}"`, "success");
      handleClose();
    } catch (e: any) {
      toast(e.response?.data?.detail || e.message || "YouTube import failed", "error");
    }
  }

  const TABS: { key: Tab; icon: typeof Link2; label: string }[] = [
    { key: "url", icon: Link2, label: "URL" },
    { key: "photo", icon: Image, label: "Photo" },
    { key: "youtube", icon: Youtube, label: "YouTube" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Recipe</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b -mt-1">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="pt-1 space-y-4">
          {/* URL tab */}
          {tab === "url" && (
            <>
              <p className="text-sm text-muted-foreground">
                Paste a URL from AllRecipes, NYT Cooking, Serious Eats, and 100+ other sites.
              </p>
              <Input
                placeholder="https://www.allrecipes.com/recipe/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleUrlImport} disabled={isPending || !url.trim()}>
                  {importUrl.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import
                </Button>
              </div>
            </>
          )}

          {/* Photo tab */}
          {tab === "photo" && (
            <>
              <p className="text-sm text-muted-foreground">
                Upload a photo of a recipe card, cookbook page, or handwritten recipe. Your AI model will read it.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && selectPhoto(e.target.files[0])}
              />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border">
                  <img src={photoPreview} alt="Preview" className="w-full max-h-56 object-contain bg-secondary" />
                  <button
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 border flex items-center justify-center hover:bg-background"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) selectPhoto(f);
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                    dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                >
                  <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop image here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WEBP up to 10 MB</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handlePhotoImport} disabled={isPending || !photoFile}>
                  {importPhoto.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Extract Recipe
                </Button>
              </div>
            </>
          )}

          {/* YouTube tab */}
          {tab === "youtube" && (
            <>
              <p className="text-sm text-muted-foreground">
                Paste a YouTube cooking video URL. We'll pull the transcript and extract the recipe with AI.
              </p>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleYouTubeImport()}
                autoFocus
              />
              {importYouTube.isPending && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Fetching transcript and extracting recipe — this may take 15–30 seconds…
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleYouTubeImport} disabled={isPending || !ytUrl.trim()}>
                  {importYouTube.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import from YouTube
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
