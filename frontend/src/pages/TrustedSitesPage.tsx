import { useState } from "react";
import { useTrustedSites, useAddTrustedSite, useDeleteTrustedSite, useBrowseSite, useImportFromUrls } from "@/api/trustedSites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { Loader2, Plus, Trash2, Globe, ExternalLink } from "lucide-react";

export function TrustedSitesPage() {
  const { data: sites } = useTrustedSites();
  const addSite = useAddTrustedSite();
  const deleteSite = useDeleteTrustedSite();
  const browseSite = useBrowseSite();
  const importUrls = useImportFromUrls();
  const [form, setForm] = useState({ name: "", base_url: "" });
  const [browseResults, setBrowseResults] = useState<{ siteId: string; urls: string[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function handleAdd() {
    if (!form.name || !form.base_url) return;
    await addSite.mutateAsync(form);
    setForm({ name: "", base_url: "" });
    toast(`Added ${form.name}`, "success");
  }

  async function handleBrowse(siteId: string) {
    const result = await browseSite.mutateAsync(siteId);
    setBrowseResults({ siteId, urls: result.urls });
    setSelected(new Set());
    const skippedMsg = result.already_imported > 0 ? `, ${result.already_imported} already imported` : "";
    toast(`Found ${result.count} new recipes${skippedMsg}`, "info");
  }

  async function handleImport() {
    if (!browseResults || selected.size === 0) return;
    const result = await importUrls.mutateAsync({ siteId: browseResults.siteId, urls: Array.from(selected) });
    const parts = [`Imported ${result.imported}`];
    if (result.skipped) parts.push(`${result.skipped} already in library`);
    if (result.failed) parts.push(`${result.failed} failed`);
    toast(parts.join(", "), result.failed ? "error" : "success");
    setBrowseResults(null);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Trusted Recipe Sites</h1>

      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <Input
          placeholder="Site name (e.g. Serious Eats)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="flex-1"
        />
        <Input
          placeholder="https://www.seriouseats.com"
          value={form.base_url}
          onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={addSite.isPending || !form.name || !form.base_url}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Site
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sites list */}
        <div className="w-full md:w-72 md:flex-shrink-0 space-y-2">
          {(!sites || sites.length === 0) && (
            <p className="text-sm text-muted-foreground py-8 text-center">No sites added yet.</p>
          )}
          {sites && sites.map((site) => (
            <div key={site.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{site.name}</p>
                <a
                  href={site.base_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 w-fit truncate max-w-full"
                >
                  {site.base_url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBrowse(site.id)}
                disabled={browseSite.isPending}
              >
                {browseSite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Browse"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteSite.mutate(site.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Browse results */}
        {browseResults && (
          <div className="flex-1 border rounded-xl p-4 space-y-3 bg-secondary/30 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-medium">Found {browseResults.urls.length} recipe URLs</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set(browseResults.urls))}>
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
                <Button size="sm" onClick={handleImport} disabled={selected.size === 0 || importUrls.isPending}>
                  {importUrls.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Import {selected.size > 0 ? `(${selected.size})` : ""}
                </Button>
              </div>
            </div>
            <ul className="overflow-y-auto space-y-0.5" style={{ maxHeight: "calc(100vh - 20rem)" }}>
              {browseResults.urls.map((url) => (
                <li key={url} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={selected.has(url)}
                    onCheckedChange={(v) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        v ? next.add(url) : next.delete(url);
                        return next;
                      })
                    }
                  />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate flex-1"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" onClick={() => setBrowseResults(null)}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
