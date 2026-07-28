import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { getDemoDownloadUrl, getDemoSignedUrl, getPublishedDemo, isAdmin, type DemoVersion } from "@/lib/demos";
import { Download, Play, Settings2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const DemoCenter = () => {
  const [demo, setDemo] = useState<DemoVersion | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const [pub, isA] = await Promise.all([getPublishedDemo(), isAdmin()]);
      setAdmin(isA);
      setDemo(pub);
      if (pub) {
        const url = await getDemoSignedUrl(pub.storage_path);
        setVideoUrl(url);
      }
      setLoading(false);
    })();
  }, []);

  const handleDownload = async () => {
    if (!demo) return;
    setDownloading(true);
    try {
      const url = await getDemoDownloadUrl(demo.storage_path, `kashie-demo-${demo.version_label}.mp4`);
      if (!url) throw new Error("Failed to create download link");
      const a = document.createElement("a");
      a.href = url;
      a.download = `kashie-demo-${demo.version_label}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error("Could not start download. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Demo Center
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Watch Kashie in action</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              A 60-second guided tour of your AI CFO. Share it with your team, investors, or partners.
            </p>
          </div>
          {admin && (
            <Link to="/demo-center/admin">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="w-4 h-4" /> Manage
              </Button>
            </Link>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
          {loading ? (
            <div className="aspect-video flex items-center justify-center bg-muted/30">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              poster=""
              className="w-full aspect-video bg-black"
            />
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center bg-muted/30 text-center px-6">
              <Play className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium">No published demo yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {admin ? "Upload the first version from the admin panel." : "Check back soon."}
              </p>
            </div>
          )}
        </div>

        {demo && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div className="text-sm text-muted-foreground">
              Version <span className="font-medium text-foreground">{demo.version_label}</span>
              {demo.duration_seconds ? ` · ${demo.duration_seconds}s` : " · 60s"}
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownload} disabled={downloading} className="gap-2">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download MP4
              </Button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {[
            { t: "Real Ugandan data", d: "Prices in USh with realistic small-business flows." },
            { t: "7-step guided tour", d: "From opening to reports, everything you need to see." },
            { t: "Shareable MP4", d: "Download and send it anywhere, anytime." },
          ].map((f) => (
            <div key={f.t} className="p-5 rounded-xl border border-border bg-card">
              <div className="font-semibold">{f.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default DemoCenter;
