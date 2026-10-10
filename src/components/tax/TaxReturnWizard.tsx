import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProfile, formatMoney, type Profile } from "@/lib/finance";
import { computeReturn, recentFiscalYears, recentMonths, type ReturnInputs, type Line } from "@/lib/tax/calc";
import { saveReturn } from "@/lib/tax/data";
import { RETURN_LABELS, type ReturnType } from "@/lib/tax/rules";
import { buildTaxReturnPdf, FIGURE_LABELS } from "@/lib/tax/pdf";
import type { TaxData } from "@/pages/Tax";

const steps = ["Return & period", "Recorded money", "URA preparation", "Review & PDF"];
const forms: Record<ReturnType, string> = { vat: "Monthly VAT return · DT-2031", income_tax: "Annual business income return · DT-2001 (individual) / non-individual return", paye: "Monthly PAYE return", wht: "Monthly withholding tax return" };

export default function TaxReturnWizard({ data }: { data: TaxData }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ReturnType>("vat");
  const [periodIndex, setPeriodIndex] = useState(0);
  const [inputs, setInputs] = useState<ReturnInputs>({});
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { getProfile().then(setProfile); }, []);
  const periods = type === "income_tax" ? recentFiscalYears() : recentMonths();
  const period = periods[periodIndex] ?? periods[0];
  const existingReturn = data.returns.find((r) => r.return_type === type && r.period_start === period.start);
  const loadedDraft = useRef("");
  useEffect(() => {
    const key = `${type}:${period.start}`;
    if (loadedDraft.current === key) return;
    loadedDraft.current = key;
    const stored = existingReturn?.inputs;
    setInputs(stored && typeof stored === "object" && !Array.isArray(stored) ? stored as ReturnInputs : {});
    setReviewed(false);
    setSaved(existingReturn?.status === "draft");
  }, [type, period.start, existingReturn]);
  const result = computeReturn(type, data.entries, period, data.profile, inputs);
  const invalid = Object.values(inputs).some((value) => typeof value === "number" && (!Number.isFinite(value) || value < 0));
  const issues = result.issues.map((issue) => issue.message);
  if (!profile?.currency) issues.push("Select your business currency in Settings before preparing a URA return.");
  else if (profile.currency !== "UGX") issues.push("URA returns require UGX. Recorded amounts are not converted; use UGX records before preparing this return.");
  if (type === "income_tax" && !["individual", "company"].includes(data.profile?.taxpayer_type || "")) issues.push("Select individual or company in Business details before preparing income tax.");
  if (type === "vat" && (inputs.exempt_sales || 0) + (inputs.zero_rated_sales || 0) > result.totals.sales) issues.push("Exempt and zero-rated sales cannot exceed your recorded sales.");
  if (type === "vat" && (inputs.invoiced_expenses || 0) > result.totals.expenses) issues.push("Eligible invoiced expenses cannot exceed recorded expenses.");
  const lines = type === "paye" ? inputs.employees ?? [] : inputs.payments ?? [];
  const invalidLines = (type === "paye" || type === "wht") && lines.some((line) => !line.name.trim() || !Number.isFinite(line.amount) || line.amount <= 0);
  const canComplete = profile?.currency === "UGX" && !invalid && !invalidLines && !result.issues.some((issue) => issue.level === "block") &&
    (type !== "income_tax" || ["individual", "company"].includes(data.profile?.taxpayer_type || "")) &&
    (type !== "vat" || ((inputs.exempt_sales || 0) + (inputs.zero_rated_sales || 0) <= result.totals.sales && (inputs.invoiced_expenses || 0) <= result.totals.expenses));
  const update = (next: ReturnInputs) => { setInputs(next); setReviewed(false); setSaved(false); };
  const updateLines = (next: Line[]) => update({ ...inputs, [type === "paye" ? "employees" : "payments"]: next });
  const numeric = (key: "exempt_sales" | "zero_rated_sales" | "invoiced_expenses" | "non_deductible", label: string) => <div className="space-y-2"><Label htmlFor={`wizard-${key}`}>{label} (UGX)</Label><Input id={`wizard-${key}`} type="number" min="0" value={inputs[key] ?? ""} onChange={(e) => update({ ...inputs, [key]: Number(e.target.value) })} /></div>;
  const complete = async (download: boolean) => {
    if (!canComplete || !reviewed || busy) return;
    setBusy(true);
    try {
      // Build the PDF before writing so a failed export never changes a return's status.
      const pdf = download ? await buildTaxReturnPdf({ type, period, entries: data.entries, profile: data.profile, inputs, businessName: profile?.business_name || "Your business", issues }) : null;
      const existing = data.returns.find((r) => r.return_type === type && r.period_start === period.start);
      if (!existing || existing.status === "draft") {
        const { error } = await saveReturn({ return_type: type, period_start: period.start, period_end: period.end, inputs: JSON.parse(JSON.stringify(inputs)), figures: JSON.parse(JSON.stringify(result.figures)), status: "draft" });
        if (error) throw error;
        await data.reload();
        setSaved(true);
      }
      pdf?.save(`Kashie-${type}-${period.start}-draft.pdf`);
      toast.success(download ? "Draft PDF downloaded. Nothing submitted to URA." : existing && existing.status !== "draft" ? "Existing return preserved. Download a fresh worksheet without changing it." : "Draft saved. Nothing submitted to URA.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save the draft. Please try again."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-6" aria-label="Tax return wizard">
    <header><h2 className="text-xl font-semibold">Prepare a tax return</h2><p className="text-sm text-muted-foreground mt-2">Draft worksheet only. Review with your tax adviser, then file using the current form on the URA portal.</p></header>
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">{steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={`border-b-2 pb-3 text-xs ${index <= step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}><span className="block font-semibold mb-1">{index + 1}</span>{label}</li>)}</ol>
    {step === 0 && <div className="space-y-5"><h3 className="font-semibold">Which return are you preparing?</h3><div className="grid sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Return type</Label><Select value={type} onValueChange={(v) => { setType(v as ReturnType); setPeriodIndex(0); update({}); }}><SelectTrigger aria-label="Return type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(RETURN_LABELS).map(([key, value]) => <SelectItem value={key} key={key}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Return period</Label><Select value={String(periodIndex)} onValueChange={(v) => { setPeriodIndex(Number(v)); update({}); }}><SelectTrigger aria-label="Return period"><SelectValue /></SelectTrigger><SelectContent>{periods.map((p, index) => <SelectItem key={p.start} value={String(index)}>{p.label}</SelectItem>)}</SelectContent></Select></div></div><dl className="grid sm:grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Business TIN</dt><dd>{data.profile?.tin || "Not set — add in Business details"}</dd></div><div><dt className="text-muted-foreground">Taxpayer type</dt><dd>{data.profile?.taxpayer_type || "Not set"}</dd></div></dl><p className="text-sm text-muted-foreground">{forms[type]}. Check your registration and the current URA form. Rates here cover standard resident cases, not every tax regime.</p></div>}
    {step === 1 && <div className="space-y-4"><h3 className="font-semibold">Money recorded for {period.label}</h3><div className="grid sm:grid-cols-2 gap-4">{[["Sales", result.totals.sales], ["Expenses", result.totals.expenses]].map(([label, value]) => <div key={String(label)} className="border border-border rounded-lg p-4 bg-card"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-2 break-words">{profile?.currency ? formatMoney(Number(value), profile.currency) : `${Number(value).toLocaleString()} (currency unset)`}</p></div>)}</div><p className="text-sm text-muted-foreground">{result.totals.daysRecorded} day(s) recorded; {Math.max(0, result.totals.daysElapsed - result.totals.daysRecorded)} day(s) without entries. Unrecorded days are not assumed to be zero. Your saved records will not be changed by this wizard.</p><Button variant="outline" asChild><Link to="/chat">Add missing records <ArrowRight className="size-4" /></Link></Button>{type === "paye" || type === "wht" ? <p className="text-sm text-warning-strong">Daily sales and expenses do not contain payroll or withheld payments. Enter those separately in the next step.</p> : null}</div>}
    {step === 2 && <div className="space-y-5"><h3 className="font-semibold">Prepare the URA figures</h3>{type === "vat" ? <><p className="text-sm text-muted-foreground">Split your recorded sales into exempt, zero-rated, and standard-rated sales. Claim eligible purchases only with supporting EFRIS invoices; amounts below are VAT-inclusive standard-rate purchases.</p><div className="grid sm:grid-cols-2 gap-4">{numeric("exempt_sales", "Exempt sales")}{numeric("zero_rated_sales", "Zero-rated sales")}{numeric("invoiced_expenses", "Eligible invoiced purchases")}</div><p className="text-xs text-muted-foreground">Sales prices are {data.profile?.prices_include_vat ? "VAT-inclusive" : "VAT-exclusive"}, as set in Business details. Mixed rates and special input-tax restrictions need adviser review.</p></> : type === "income_tax" ? <><p className="text-sm text-muted-foreground">Start with recorded sales minus expenses. Add back expenses that are not allowed for tax. Confirm exemptions, tax credits, capital allowances, and your tax regime separately; these are not captured in daily records.</p>{numeric("non_deductible", "Expenses not allowed for tax")}</> : <><p className="text-sm text-muted-foreground">{type === "paye" ? "Enter each employee's monthly gross pay. This estimate uses resident PAYE bands." : "Enter payments on which you withheld tax. This worksheet uses the standard 6% rate only; confirm applicability."}</p>{lines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input aria-label={`${type === "paye" ? "Employee" : "Payment"} name ${index + 1}`} placeholder="Name" value={line.name} onChange={(e) => updateLines(lines.map((l, i) => i === index ? { ...l, name: e.target.value } : l))} /><Input aria-label={`Gross amount ${index + 1}`} type="number" min="0" placeholder="UGX amount" value={line.amount || ""} onChange={(e) => updateLines(lines.map((l, i) => i === index ? { ...l, amount: Number(e.target.value) } : l))} /><Button variant="ghost" onClick={() => updateLines(lines.filter((_, i) => i !== index))} aria-label={`Remove line ${index + 1}`}>×</Button></div>)}<Button variant="outline" onClick={() => updateLines([...lines, { name: "", amount: 0 }])}>Add {type === "paye" ? "employee" : "payment"}</Button>{invalidLines && <p className="text-sm text-negative-strong">Each line needs a name and a positive gross amount.</p>}</>}</div>}
    {step === 3 && <div className="space-y-5"><h3 className="font-semibold">Review your draft · {period.label}</h3><dl className="text-sm divide-y divide-border">{Object.entries(result.figures).filter(([, value]) => typeof value === "number").map(([key, value]) => <div key={key} className="flex justify-between flex-wrap gap-2 py-3"><dt>{FIGURE_LABELS[key] || key.replace(/_/g, " ")}</dt><dd className="font-semibold">{profile?.currency === "UGX" ? formatMoney(value as number, "UGX") : "UGX records required"}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Estimated due date: {result.due}. Tax credits, earlier payments, reliefs, and special regimes can change what you owe.</p>{issues.length > 0 && <ul className="list-disc pl-5 space-y-2 text-sm text-warning-strong">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}{invalid && <p className="text-negative-strong text-sm">Adjustments must be non-negative numbers.</p>}<div className="flex items-start gap-3"><Checkbox id="wizard-reviewed" checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} /><Label htmlFor="wizard-reviewed" className="leading-relaxed">I reviewed the records and adjustments. I understand this is an estimate, not an official URA return or confirmation of filing.</Label></div><div className="flex flex-wrap gap-2"><Button disabled={!canComplete || !reviewed || busy} onClick={() => complete(true)}><Download className="size-4" />{busy ? "Preparing…" : existingReturn && existingReturn.status !== "draft" ? "Download worksheet PDF" : "Save & download PDF"}</Button><Button variant="outline" disabled={!canComplete || !reviewed || busy || Boolean(existingReturn && existingReturn.status !== "draft")} onClick={() => complete(false)}><Save className="size-4" />Save draft</Button></div>{existingReturn && existingReturn.status !== "draft" && <p className="text-sm text-muted-foreground">Your existing {existingReturn.status.replace(/_/g, " ")} return is preserved. Downloading a new worksheet will not replace it.</p>}{saved && <p role="status" className="text-sm text-positive flex gap-2 items-center"><CheckCircle className="size-4" />Draft saved to your tax returns.</p>}<Button asChild variant="link" className="px-0"><a href="https://ura.go.ug/en/domestic-taxes/returns/" target="_blank" rel="noopener noreferrer">URA return guidance <ArrowRight className="size-4" /></a></Button></div>}
    <footer className="border-t border-border pt-4 flex justify-between gap-3"><Button variant="outline" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />Back</Button>{step < 3 && <Button onClick={() => setStep(step + 1)}>Continue <ArrowRight className="size-4" /></Button>}</footer>
  </section>;
}