import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { ArrowRight, ArrowUpRight, CircleCheck, Package, Receipt, TrendingUp, Wallet, MessageCircle, Sparkles, FileText, CalendarClock, Landmark } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CountUp from "@/components/CountUp";
import { Button } from "@/components/ui/button";
import { getEntries, getInventory, getProfile, formatMoney, LOW_STOCK_THRESHOLD, type DailyEntry, type InventoryItem, type Profile } from "@/lib/finance";

const questions = [
  "Am I actually making money?",
  "Where is my money going?",
  "Can I afford to restock?",
  "What is hurting my business?",
  "What should I focus on this week?",
];

const actions = [
  { label: "Add Sale", icon: ArrowUpRight, prompt: "I made ___ in sales today" },
  { label: "Add Expense", icon: Receipt, prompt: "I spent ___ today on ___" },
  { label: "Inventory", icon: Package, prompt: "Show me my current stock" },
  { label: "Reports", icon: FileText, to: "/reports" },
  { label: "Forecast", icon: CalendarClock, to: "/forecast" },
  { label: "Tax", icon: Wallet, to: "/tax" },
  { label: "Financing", icon: Landmark, to: "/financing" },
];

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

const Home = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getEntries(), getInventory(), getProfile()]).then(([e, inv, p]) => {
      if (!active) return;
      setEntries(e);
      setInventory(inv);
      setProfile(p);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const overview = useMemo(() => {
    const today = new Date();
    const last30 = entries.filter((e) => e.date >= format(subDays(today, 29), "yyyy-MM-dd"));
    const sales = last30.reduce((sum, e) => sum + Number(e.revenue || 0), 0);
    const expenses = last30.reduce((sum, e) => sum + Number(e.expenses || 0), 0);
    const lowStock = inventory.filter((item) => item.quantity <= LOW_STOCK_THRESHOLD);
    const recent = entries.filter((e) => e.date >= format(subDays(today, 6), "yyyy-MM-dd"));
    const previous = entries.filter((e) => e.date >= format(subDays(today, 13), "yyyy-MM-dd") && e.date < format(subDays(today, 6), "yyyy-MM-dd"));
    const recentExpenses = recent.reduce((sum, e) => sum + Number(e.expenses || 0), 0);
    const previousExpenses = previous.reduce((sum, e) => sum + Number(e.expenses || 0), 0);
    const recentSales = recent.reduce((sum, e) => sum + Number(e.revenue || 0), 0);
    const alerts: { title: string; detail: string }[] = [];

    if (lowStock.length) alerts.push({
      title: `${lowStock.length} item${lowStock.length === 1 ? "" : "s"} running low`,
      detail: lowStock.slice(0, 3).map((i) => `${i.item_name} (${i.quantity} ${i.unit})`).join(", "),
    });
    if (recent.length && previous.length && previousExpenses > 0 && recentExpenses > previousExpenses) alerts.push({
      title: "Expenses are rising",
      detail: `${formatMoney(recentExpenses)} spent in the last 7 days, up from ${formatMoney(previousExpenses)} the week before.`,
    });
    if (entries.length && recentSales === 0) alerts.push({
      title: "No sales recorded this week",
      detail: "No sales appear in your last 7 days of records. If you made sales, add them in chat.",
    });
    if (last30.length && sales > 0 && sales - expenses <= 0) alerts.push({
      title: "Spending is outpacing sales",
      detail: `You spent ${formatMoney(expenses)} against ${formatMoney(sales)} in sales over the last 30 days.`,
    });
    else if (last30.length && sales > 0 && (sales - expenses) / sales < 0.1) alerts.push({
      title: "Profit is looking slim",
      detail: `You kept ${formatMoney(sales - expenses)} from ${formatMoney(sales)} in sales over the last 30 days.`,
    });
    if (!entries.length) alerts.push({
      title: "Your first entry is waiting",
      detail: "Log your first sale or expense to start seeing what your numbers say.",
    });
    return { sales, expenses, profit: sales - expenses, lowStock, alerts, hasEntries: last30.length > 0 };
  }, [entries, inventory]);

  const stats = [
    { label: "Sales", num: overview.hasEntries ? overview.sales : null, fmt: formatMoney, icon: ArrowUpRight },
    { label: "Expenses", num: overview.hasEntries ? overview.expenses : null, fmt: formatMoney, icon: Receipt },
    { label: "Profit", num: overview.hasEntries ? overview.profit : null, fmt: formatMoney, icon: TrendingUp },
    { label: "Low Stock", num: overview.lowStock.length, fmt: (n: number) => String(n), icon: Package },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 pb-10 md:px-8 md:py-10 space-y-7 md:space-y-9">
        <header className="animate-fade-up flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sage mb-2 tracking-wider">KASHIE / HOME</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground break-words">{getGreeting()}, {profile?.business_name || "your business"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Here's what's happening with your business.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/dashboard">Full dashboard <ArrowRight className="ml-2 size-4" /></Link></Button>
        </header>

        <section aria-labelledby="summary-title" className="animate-fade-up [animation-delay:60ms]">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="summary-title" className="text-sm font-semibold text-foreground">At a glance</h2>
            <span className="text-xs text-muted-foreground">Last 30 days · stock is current</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
            {stats.map(({ label, num, fmt, icon: Icon }, i) => (
              <div key={label} style={{ animationDelay: `${100 + i * 50}ms` }} className="motion-card animate-fade-up min-w-0 rounded-lg border border-border bg-card p-3.5 md:p-4">
                <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4 shrink-0" /><span className="text-xs font-medium">{label}</span></div>
                <p className="mt-3 text-lg md:text-xl font-semibold text-foreground tabular-nums break-words">{loading ? "…" : num === null ? "—" : <CountUp value={num} format={fmt} />}</p>
                {label === "Low Stock" && !loading && inventory.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">No stock tracked yet</p>}
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="attention-title" className="animate-fade-up [animation-delay:180ms] border-b border-border pb-6">
          <h2 id="attention-title" className="text-base font-semibold text-foreground mb-3">What needs your attention?</h2>
          {loading ? <p className="text-sm text-muted-foreground">Checking your business…</p> : overview.alerts.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {overview.alerts.slice(0, 4).map((alert, i) => (
                <li key={alert.title} style={{ animationDelay: `${240 + i * 70}ms` }} className="animate-fade-up border-l-2 border-warning bg-card px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{alert.detail}</p>
                </li>
              ))}
            </ul>
          ) : <div className="flex items-center gap-2 text-sm text-foreground"><CircleCheck className="size-4 text-positive" /> All clear. Keep up the good work!</div>}
        </section>

        <section aria-labelledby="ask-title" className="animate-fade-up [animation-delay:260ms] relative overflow-hidden rounded-lg bg-ai-soft/60 border border-ai/30 p-4 md:p-5">
          <div aria-hidden className="kashie-ai-accent pointer-events-none absolute inset-0 animate-ai-sheen" />
          <div className="flex items-center gap-2 mb-3"><Sparkles className="size-4 text-ai-strong animate-ai-pop" /><h2 id="ask-title" className="text-base font-semibold text-foreground">Ask Kashie</h2></div>
          <div className="grid gap-2 md:grid-cols-2">
            {questions.map((question) => (
              <Button asChild variant="outline" key={question} className="h-auto min-h-11 justify-between text-left whitespace-normal py-2.5 px-3.5 font-normal bg-card border-ai/30 hover:bg-card hover:border-ai hover:-translate-y-0.5 relative">
                <Link to="/chat" state={{ prompt: question, autoSend: true }}><span>{question}</span><ArrowRight className="size-4 shrink-0 ml-2 text-ai-strong" /></Link>
              </Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="actions-title" className="animate-fade-up [animation-delay:320ms]">
          <h2 id="actions-title" className="text-base font-semibold text-foreground mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {actions.map(({ label, icon: Icon, prompt, to }) => (
              <Button asChild variant="secondary" key={label} className="h-11 justify-start gap-2.5 px-3 text-sm font-medium">
                <Link to={to || "/chat"} state={prompt ? { prompt } : undefined}><Icon className="size-4 shrink-0 text-primary" />{label}</Link>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Home;
