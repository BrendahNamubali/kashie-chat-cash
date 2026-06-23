import { useEffect, useState } from "react";
import { FileBarChart, Receipt, Package, HeartPulse, Download, Printer } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import {
  getEntries,
  getInventory,
  getProfile,
  type DailyEntry,
  type InventoryItem,
  type Profile,
} from "@/lib/finance";
import { exportReportPdf, printReportPdf } from "@/lib/reports";
import { toast } from "sonner";

type Kind = "pnl" | "expenses" | "inventory" | "health";

const REPORTS: { kind: Kind; title: string; description: string; icon: React.ElementType; accent: string }[] = [
  {
    kind: "pnl",
    title: "Profit & Loss",
    description: "Full revenue, expenses and net profit breakdown by day.",
    icon: FileBarChart,
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    kind: "expenses",
    title: "Expense Breakdown",
    description: "How your money is being spent across categories.",
    icon: Receipt,
    accent: "bg-rose-50 text-rose-600",
  },
  {
    kind: "inventory",
    title: "Inventory Report",
    description: "Current stock levels and low-stock warnings.",
    icon: Package,
    accent: "bg-amber-50 text-amber-600",
  },
  {
    kind: "health",
    title: "Business Health",
    description: "Health score, trends, and active CFO alerts.",
    icon: HeartPulse,
    accent: "bg-sky-50 text-sky-600",
  },
];

const Reports = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const [e, inv, p] = await Promise.all([getEntries(), getInventory(), getProfile()]);
      setEntries(e);
      setInventory(inv);
      setProfile(p);
    })();
  }, []);

  const handleExport = (kind: Kind, title: string) => {
    try {
      exportReportPdf({ kind, entries, inventory, profile }, `Kashie-${title.replace(/\s+/g, "-")}-${Date.now()}.pdf`);
      toast.success("Report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't export report");
    }
  };

  const handlePrint = (kind: Kind) => {
    try {
      printReportPdf({ kind, entries, inventory, profile });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't open print view");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Reports</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Financial reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated from your live business data. Export or print anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r) => (
            <div
              key={r.kind}
              className="group rounded-2xl border border-border bg-card p-5 md:p-6 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${r.accent}`}>
                  <r.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{r.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(r.kind, r.title)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </button>
                <button
                  onClick={() => handlePrint(r.kind)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-foreground/80 text-xs font-medium hover:bg-accent transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
          <p className="text-xs text-muted-foreground">
            Reports use real data only — {entries.length} entries · {inventory.length} inventory items
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
