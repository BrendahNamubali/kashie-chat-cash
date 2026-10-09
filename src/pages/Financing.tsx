import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Landmark, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEntries, getProfile, formatMoney, type DailyEntry, type Profile } from "@/lib/finance";
import { planningBaseline, monthlyRepayment } from "@/lib/planning";

export default function Financing() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [months, setMonths] = useState("12");
  useEffect(() => { Promise.all([getEntries(), getProfile()]).then(([e, p]) => { setEntries(e); setProfile(p); setLoading(false); }); }, []);
  const baseline = planningBaseline(entries);
  const valid = principal !== "" && rate !== "" && Number(months) <= 600 && Number.isInteger(Number(months));
  const payment = valid ? monthlyRepayment(Number(principal), Number(rate), Number(months)) : null;
  const money = (value: number) => profile?.currency ? formatMoney(value, profile.currency) : `${Math.round(value).toLocaleString()} (currency unset)`;
  return <AppLayout><div className="max-w-5xl mx-auto px-4 py-8 md:px-8 space-y-7">
    <header className="border-b border-border pb-6"><Landmark className="size-5 text-primary mb-3" /><h1 className="text-3xl font-semibold">Financing</h1><p className="mt-2 text-muted-foreground">Check the numbers before borrowing.</p></header>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Your business, last 30 days</h2>{loading ? <p role="status">Reading your records…</p> : baseline.days === 0 ? <p className="text-muted-foreground">No recent records yet. You can still explore repayments below.</p> : <div className="grid sm:grid-cols-3 gap-3">{[["Recorded sales", baseline.sales], ["Recorded expenses", baseline.expenses], ["Recorded profit", baseline.profit]].map(([label, value]) => <div key={String(label)} className="border border-border bg-card rounded-lg p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="font-semibold text-xl mt-2 break-words">{money(Number(value))}</p></div>)}</div>}<p className="text-xs text-muted-foreground">{baseline.days} recorded day(s). Profit is not your available cash, and missing records can change this picture.</p></section>
    <section className="border-y border-border py-6 space-y-4"><h2 className="text-lg font-semibold">Repayment calculator</h2><div className="grid sm:grid-cols-3 gap-4">
      <div className="space-y-2"><Label htmlFor="loan-amount">Loan amount {profile?.currency ? `(${profile.currency})` : ""}</Label><Input id="loan-amount" type="number" min="1" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="loan-rate">Annual interest (%)</Label><Input id="loan-rate" type="number" min="0" max="1000" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="loan-months">Term (months)</Label><Input id="loan-months" type="number" min="1" max="600" value={months} onChange={(e) => setMonths(e.target.value)} /></div>
    </div>{payment !== null ? <div aria-live="polite" className="space-y-2"><p className="text-sm text-muted-foreground">Estimated monthly repayment</p><p className="text-3xl font-semibold break-words">{money(payment)}</p><p className="text-sm">Total repayments: {money(payment * Number(months))} · Interest: {money(payment * Number(months) - Number(principal))}</p>{baseline.days > 0 && <p className="text-sm text-warning-strong">{payment > Math.max(0, baseline.profit) ? "One month's repayment exceeds the profit recorded in the last 30 days." : "Your recorded profit exceeds one repayment, but check available cash and existing commitments first."}</p>}</div> : <p className="text-sm text-muted-foreground">Enter an amount, interest rate, and whole-month term to see repayments.</p>}<p className="text-xs text-muted-foreground">Equal monthly payments on a reducing balance. Excludes fees, insurance, existing debt, and taxes. This is not a lender quote or approval.</p></section>
    <section className="space-y-3"><h2 className="font-semibold">Before approaching a lender</h2><ul className="list-disc pl-5 text-sm space-y-2"><li>Prepare sales and expense records and bank or mobile-money statements.</li><li>Confirm total borrowing costs, fees, and repayment dates.</li><li>Check repayments against your cash on hand and existing debts.</li></ul><Button asChild variant="outline"><Link to="/reports">Open business reports <ArrowRight className="size-4" /></Link></Button><p className="text-xs text-muted-foreground">Kashie does not offer loans or send applications to lenders.</p></section>
    <p className="text-sm text-primary">One next step: ask your lender for a written repayment schedule before committing.</p>
  </div></AppLayout>;
}