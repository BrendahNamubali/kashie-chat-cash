import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CalendarClock, CircleCheck, Info, MessageCircle, PlugZap } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getEntries, formatMoney, type DailyEntry } from "@/lib/finance";
import { getTaxProfile, listDocuments, listProducts, listReturns, type EfrisDocument, type EfrisProduct, type TaxProfile, type TaxReturn } from "@/lib/tax/data";
import { calcVat, dueDate, fiscalYearPeriod, monthPeriod, periodTotals } from "@/lib/tax/calc";
import { RETURN_LABELS, TAX_RULES_VERSION, type ReturnType } from "@/lib/tax/rules";
import EfrisPanel from "@/components/tax/EfrisPanel";
import ReturnsPanel from "@/components/tax/ReturnsPanel";
import BusinessDetails from "@/components/tax/BusinessDetails";
import TaxReturnWizard from "@/components/tax/TaxReturnWizard";

export interface TaxData {
  entries: DailyEntry[];
  profile: TaxProfile | null;
  products: EfrisProduct[];
  documents: EfrisDocument[];
  returns: TaxReturn[];
  reload: () => Promise<void>;
}

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold mt-1 tabular-nums">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const Tax = () => {
  const [state, setState] = useState<Omit<TaxData, "reload"> | null>(null);

  const reload = useCallback(async () => {
    const [entries, profile, products, documents, returns] = await Promise.all([getEntries(), getTaxProfile(), listProducts(), listDocuments(), listReturns()]);
    setState({ entries, profile, products, documents, returns });
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const overview = useMemo(() => {
    if (!state) return null;
    const p = monthPeriod();
    const t = periodTotals(state.entries, p);
    const registered = state.profile?.vat_status === "registered";
    const vat = calcVat(t.sales, state.profile?.prices_include_vat ?? true, {});
    const attention: string[] = [];
    if (!state.profile?.tin) attention.push("Add your TIN so returns and EFRIS documents can be prepared.");
    if (!state.profile || state.profile.vat_status === "unknown") attention.push("Tell Kashie whether you're VAT registered.");
    if (t.daysRecorded < t.daysElapsed) attention.push(`${t.daysElapsed - t.daysRecorded} day(s) this month have no sales or expenses recorded.`);
    if (registered && state.products.length === 0) attention.push("Add your products or services to the EFRIS catalogue.");
    if (registered && state.documents.filter((d) => d.issue_date >= p.start).length === 0 && t.sales > 0) attention.push("You recorded sales this month but prepared no EFRIS invoices or receipts.");
    const b2bMissing = state.documents.filter((d) => d.customer_type === "business" && !d.customer_tin).length;
    if (b2bMissing) attention.push(`${b2bMissing} business invoice(s) are missing the customer's TIN.`);

    const types: ReturnType[] = registered ? ["vat", "paye", "wht"] : ["paye", "wht"];
    const deadlines = types.map((ty) => ({ type: ty, period: monthPeriod(), due: dueDate(ty, monthPeriod()) }));
    const fy = fiscalYearPeriod();
    deadlines.push({ type: "income_tax", period: fy, due: dueDate("income_tax", fy) });
    deadlines.sort((a, b) => a.due.localeCompare(b.due));
    return { p, t, vat, registered, attention, deadlines };
  }, [state]);

  const data: TaxData | null = state ? { ...state, reload } : null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6 animate-fade-in">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold">Tax & EFRIS Center</h1>
          <p className="text-sm text-muted-foreground">Get your taxes ready from the money you already track in Kashie.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft text-warning-strong px-3 py-1"><Info className="w-3.5 h-3.5" />All figures are estimates for preparation</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1"><PlugZap className="w-3.5 h-3.5" />URA / EFRIS live connection: not connected</span>
          </div>
        </header>

        {!data || !overview ? (
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="w-full md:w-auto overflow-x-auto justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="efris">EFRIS</TabsTrigger>
              <TabsTrigger value="returns">Returns</TabsTrigger>
              <TabsTrigger value="wizard">Return wizard</TabsTrigger>
              <TabsTrigger value="details">Business details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div>
                <p className="text-sm font-medium mb-3">Current period: {overview.p.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Estimated taxable sales" value={formatMoney(overview.vat.standard_rated_sales)} hint={`${overview.t.daysRecorded} day(s) recorded`} />
                  <Stat label="Estimated output VAT" value={overview.registered ? formatMoney(overview.vat.output_vat) : "Not VAT registered"} hint={overview.registered ? "18% of sales" : undefined} />
                  <Stat label="Recorded expenses" value={formatMoney(overview.t.expenses)} hint="Input VAT counts only with EFRIS tax invoices" />
                  <Stat label="Estimated VAT position" value={overview.registered ? formatMoney(overview.vat.net_vat) : "—"} hint={overview.registered ? "Before claiming input VAT" : undefined} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-3"><CalendarClock className="w-4 h-4" />Upcoming deadlines</h2>
                  <ul className="space-y-2 text-sm">
                    {overview.deadlines.map((d) => {
                      const r = data.returns.find((x) => x.return_type === d.type && x.period_start === d.period.start);
                      return (
                        <li key={d.type} className="flex justify-between gap-3">
                          <span>{RETURN_LABELS[d.type]} <span className="text-muted-foreground">({d.period.label})</span></span>
                          <span className="text-right tabular-nums">{format(parseISO(d.due), "d MMM yyyy")}<span className="block text-[11px] text-muted-foreground">{r ? r.status.replace("_", " ") : "not started"}</span></span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[11px] text-muted-foreground mt-3">Only applies if you're registered for that tax. Confirm dates with URA.</p>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" />Needs your attention</h2>
                  {overview.attention.length === 0 ? (
                    <p className="text-sm flex items-center gap-2 text-positive"><CircleCheck className="w-4 h-4" />Nothing missing right now.</p>
                  ) : (
                    <ul className="space-y-2 text-sm list-disc pl-5">{overview.attention.map((a) => <li key={a}>{a}</li>)}</ul>
                  )}
                </section>
              </div>

              <section className="rounded-2xl bg-ai-soft p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div>
                  <p className="font-semibold text-ai-strong">Ask Kashie about your tax</p>
                  <p className="text-sm text-muted-foreground">Kashie explains your numbers and what to fix before filing.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Explain my tax position", "What should I fix before filing?", "Any EFRIS issues?"].map((q) => (
                    <Button key={q} asChild size="sm" variant="outline"><Link to="/chat" state={{ prompt: q, autoSend: true }}><MessageCircle className="w-3.5 h-3.5" />{q}</Link></Button>
                  ))}
                </div>
              </section>
              <p className="text-[11px] text-muted-foreground">Tax rules: {TAX_RULES_VERSION}. Estimates are not tax advice.</p>
            </TabsContent>

            <TabsContent value="efris" className="mt-6"><EfrisPanel data={data} /></TabsContent>
            <TabsContent value="returns" className="mt-6"><ReturnsPanel data={data} /></TabsContent>
            <TabsContent value="wizard" className="mt-6"><TaxReturnWizard data={data} /></TabsContent>
            <TabsContent value="details" className="mt-6"><BusinessDetails data={data} /></TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default Tax;
