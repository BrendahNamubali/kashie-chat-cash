import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEntries, getProfile, formatMoney, type DailyEntry, type Profile } from "@/lib/finance";
import { planningBaseline, projectMoney } from "@/lib/planning";

export default function Forecast() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [salesChange, setSalesChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  useEffect(() => { Promise.all([getEntries(), getProfile()]).then(([e, p]) => { setEntries(e); setProfile(p); setLoading(false); }); }, []);
  const baseline = planningBaseline(entries);
  const projection = projectMoney(baseline, days, salesChange, expenseChange);
  const money = (value: number) => profile?.currency ? formatMoney(value, profile.currency) : `${Math.round(value).toLocaleString()} (currency unset)`;
  return <AppLayout><div className="max-w-5xl mx-auto px-4 py-8 md:px-8 space-y-7">
    <header className="border-b border-border pb-6"><CalendarClock className="size-5 text-primary mb-3" /><h1 className="text-3xl font-semibold">Forecast</h1><p className="text-muted-foreground mt-2">A look ahead for {profile?.business_name || "your business"}.</p></header>
    <section className="space-y-4"><h2 className="font-semibold">Your next stretch</h2><div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2"><Label>Forecast period</Label><Select value={String(days)} onValueChange={(v) => setDays(Number(v))}><SelectTrigger aria-label="Forecast period"><SelectValue /></SelectTrigger><SelectContent>{[7, 14, 30, 90].map((d) => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="sales-change">Sales change (%)</Label><Input id="sales-change" type="number" min={-100} max={500} value={salesChange} onChange={(e) => setSalesChange(Math.max(-100, Math.min(500, Number(e.target.value))))} /></div>
      <div className="space-y-2"><Label htmlFor="expense-change">Expense change (%)</Label><Input id="expense-change" type="number" min={-100} max={500} value={expenseChange} onChange={(e) => setExpenseChange(Math.max(-100, Math.min(500, Number(e.target.value))))} /></div>
    </div></section>
    {loading ? <p role="status">Reading your records…</p> : !projection ? <section className="border-y border-border py-8 space-y-3"><h2 className="text-xl font-semibold">A few more days will help</h2><p className="text-muted-foreground">You have {baseline.days} recorded day(s) in the last 30 days. At least 7 are needed for a useful estimate.</p><Button asChild><Link to="/chat">Record today's money <ArrowRight className="size-4" /></Link></Button></section> : <>
      <section className="grid sm:grid-cols-3 gap-3">{[["Estimated sales", projection.sales], ["Estimated expenses", projection.expenses], ["Estimated profit", projection.profit]].map(([label, value]) => <div key={String(label)} className="border border-border rounded-lg bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-3 break-words tabular-nums">{money(Number(value))}</p></div>)}</section>
      <section className="border-t border-border pt-5 space-y-2"><h2 className="font-semibold">What this is based on</h2><p className="text-sm text-muted-foreground">{baseline.days} recorded days from {baseline.start} to {baseline.end}: {money(baseline.sales)} in sales and {money(baseline.expenses)} in expenses. Each future day uses the average of recorded days, adjusted by your changes above.</p><p className="text-sm text-muted-foreground">Missing days are not treated as zero. This is a scenario, not a guarantee, and does not account for seasonality or your cash balance.</p></section>
    </>}
    <p className="text-sm text-primary">One next step: record every trading day, including quiet ones, to make your forecast more reliable.</p>
  </div></AppLayout>;
}