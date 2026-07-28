import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteDemoVersion,
  isAdmin,
  listAllDemos,
  publishDemo,
  uploadDemoVersion,
  type DemoVersion,
} from "@/lib/demos";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Trash2, Upload } from "lucide-react";

const DemoAdmin = () => {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [versions, setVersions] = useState<DemoVersion[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => setVersions(await listAllDemos());

  useEffect(() => {
    (async () => {
      const isA = await isAdmin();
      setAdmin(isA);
      if (isA) await refresh();
    })();
  }, []);

  if (admin === null) {
    return (
      <AppLayout>
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </AppLayout>
    );
  }
  if (!admin) return <Navigate to="/demo-center" replace />;

  const handleUpload = async () => {
    if (!file || !label.trim()) {
      toast.error("Please add a version label and choose a file.");
      return;
    }
    setUploading(true);
    try {
      await uploadDemoVersion({ file, version_label: label.trim(), notes: notes.trim() || undefined, publish: publishNow });
      toast.success(publishNow ? "Uploaded and published 🎉" : "Uploaded as draft");
      setFile(null); setLabel(""); setNotes("");
      (document.getElementById("demo-file") as HTMLInputElement | null)?.value && ((document.getElementById("demo-file") as HTMLInputElement).value = "");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <Link to="/demo-center" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Demo Center
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Manage Demo Versions</h1>
        <p className="text-muted-foreground mt-2">Upload a new render and publish it to replace the live demo.</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="font-semibold mb-4 flex items-center gap-2"><Upload className="w-4 h-4" /> Upload new version</div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="demo-file">MP4 file</Label>
              <Input
                id="demo-file"
                type="file"
                accept="video/mp4"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1.5"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version">Version label</Label>
                <Input id="version" placeholder="v1.0" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1.5" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
                  Publish immediately
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" placeholder="What changed in this version?" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <div className="font-semibold mb-3">All versions</div>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {versions.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">No versions yet.</div>
            )}
            {versions.map((v) => (
              <div key={v.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {v.version_label}
                    {v.status === "published" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Live
                      </span>
                    )}
                    {v.status === "draft" && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Draft</span>
                    )}
                    {v.status === "archived" && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Archived</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(v.created_at).toLocaleString()}{v.notes ? ` · ${v.notes}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  {v.status !== "published" && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      await publishDemo(v.id);
                      toast.success("Published");
                      await refresh();
                    }}>Publish</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm("Delete this version?")) return;
                    await deleteDemoVersion(v.id, v.storage_path);
                    toast.success("Deleted");
                    await refresh();
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DemoAdmin;
