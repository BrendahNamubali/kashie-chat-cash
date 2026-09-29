import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/finance";
import { computeReturn, recentFiscalYears, recentMonths } from "@/lib/tax/calc";
import { RETURN_LABELS, type ReturnType } from "@/lib/tax/rules";
import { saveReturn } from "@/lib/tax/data";
import type { TaxData } from "@/pages/Tax";

const STEPS = ["draft", "validated", "reviewed", "authorized", "submitted_live", "acknowledged_live"];
const STEP_LABEL = ["Draft", "Validate", "Review", "Authorize", "Submit", "Acknowledged"];

const ReturnsPanel = ({ data }: { data: TaxData }) => {
  const [type, setType] = useState<ReturnType>("vat");
  const periods = type === "income_tax" ? recentFiscalYears() : recentMonths();
  const [pi, setPi] = useState(0);
  const period = periods[Math.min(pi, periods.length - 1)];
  const existing = data.returns.find((r) => r.return_type === type && r.period_start === period.start);
  const [invoiced, setInvoiced] = useState("");
  const [ack, setAck] = useState("");

  const result = useMemo(() => computeReturn(type, data.entries, period, data.profile, { invoiced_expenses: Number(invoiced) || 0 }), [type, data.entries, period, data.profile, invoiced]);
  const status = existing?.status ?? "draft";
  const idx = status === "filed_manually" ? 3 : STEPS.indexOf(status);
  const blocked = result.issues.some((i) => i.level === "block");

  const advance = async (next: string, extra: Record<string, unknown> = {}) => {
    const { error } = await saveReturn({ return_type: type, period_start: period.start, period_end: period.end, inputs: { invoiced_expenses: Number(invoiced) || 0 }, figures: result.figures as never, status: next, ...extra });
    if (error) return toast.error(error.message);
    data.reload();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Select value={type} onValueChange={(v) => { setType(v as ReturnType); setPi(0); }}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(RETURN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(pi)} onValueChange={(v) => setPi(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{periods.map((p, i) => <SelectItem key={p.start} value={String(i)}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <ol className="flex flex-wrap gap-1.5 text-xs">
        {STEP_LABEL.map((s, i) => <li key={s} className={`rounded-full px-3 py-1 ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</li>)}
      </ol>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-base font-semibold">Estimated summary · due {result.due}</h2>
        <ul className="text-sm space-y-1 tabular-nums">
          {Object.entries(result.figures).filter(([, v]) => typeof v === "number").map(([k, v]) => (
            <li key={k} className="flex justify-between"><span className="capitalize">{k.replace(/_/g, " ")}</span><span>{formatMoney(v as number)}</span></li>
          ))}
        </ul>
        {type === "vat" && <Input placeholder="Expenses backed by EFRIS tax invoices (UGX)" inputMode="numeric" value={invoiced} onChange={(e) => setInvoiced(e.target.value)} />}
        {result.issues.length > 0 && <ul className="text-sm list-disc pl-5 space-y-1">{result.issues.map((i) => <li key={i.message} className={i.level === "block" ? "text-negative-strong" : "text-warning-strong"}>{i.message}</li>)}</ul>}
      </section>

      <div className="flex flex-wrap gap-2">
        {status === "draft" && <Button disabled={blocked} onClick={() => advance("validated")}>Validate</Button>}
        {status === "validated" && <Button onClick={() => advance("reviewed")}>I've reviewed these figures</Button>}
        {status === "reviewed" && <Button onClick={() => advance("authorized", { authorized_at: new Date().toISOString() })}>Authorize</Button>}
        {status === "authorized" && <>
          <Button disabled title="Live URA connection not available yet">Submit to URA (not connected)</Button>
          <Input className="w-64" placeholder="URA portal acknowledgement no." value={ack} onChange={(e) => setAck(e.target.value)} />
          <Button variant="outline" disabled={!ack} onClick={() => advance("filed_manually", { manual_ack_reference: ack, manual_filed_at: new Date().toISOString().slice(0, 10) })}>I filed on the URA portal</Button>
        </>}
        {status === "filed_manually" && <p className="text-sm">Filed by you on the URA portal · ref {existing?.manual_ack_reference} (recorded by you, not verified by Kashie)</p>}
      </div>
    </div>
  );
};

export default ReturnsPanel;
