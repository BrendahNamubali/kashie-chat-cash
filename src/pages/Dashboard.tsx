import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import {
  getEntries,
  getInventory,
  getProfile,
  formatMoney,
  type DailyEntry,
  type InventoryItem,
  type Profile,
} from "@/lib/finance";
import {
  buildExpenseBreakdown,
  computeAlerts,
  computeHealthScore,
  formatCompact,
} from "@/lib/insights";
import { Link } from "react-router-dom";

const PIE_COLORS = ["hsl(160, 84%, 32%)", "hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(346, 84%, 56%)"];

const Dashboard = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [e, inv, p] = await Promise.all([getEntries(), getInventory(), getProfile()]);
      setEntries(e);
      setInventory(inv);
      setProfile(p);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    const last30 = entries.slice(0, 30);
    const rev = last30.reduce((s, e) => s + Number(e.revenue || 0), 0);
    const exp = last30.reduce((s, e) => s + Number(e.expenses || 0), 0);
    return { revenue: rev, expenses: exp, profit: rev - exp, days: last30.length };
  }, [entries]);

  const health = useMemo(() => computeHealthScore(entries.slice(0, 30)), [entries]);
  const alerts = useMemo(() => computeAlerts(entries, inventory), [entries, inventory]);
  const expenseBreakdown = useMemo(() => buildExpenseBreakdown(entries.slice(0, 30)), [entries]);

  const trendData = useMemo(() => {
    // last 14 days, ascending
    const days = entries.slice(0, 14).reverse();
    return days.map((e) => ({
      date: new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      profit: Number(e.profit),
      revenue: Number(e.revenue),
      expenses: Number(e.expenses),
    }));
  }, [entries]);

  const greeting = profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome back";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Dashboard
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{greeting} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile?.business_name ?? "Your business"} · last 30 days
            </p>
          </div>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm shadow-primary/30 hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Ask your CFO
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <KpiCard
                label="Revenue"
                value={formatMoney(totals.revenue)}
                icon={<ArrowUpRight className="w-4 h-4" />}
                accent="text-emerald-600 bg-emerald-50"
              />
              <KpiCard
                label="Expenses"
                value={formatMoney(totals.expenses)}
                icon={<ArrowDownRight className="w-4 h-4" />}
                accent="text-rose-600 bg-rose-50"
              />
              <KpiCard
                label="Profit"
                value={formatMoney(totals.profit)}
                icon={totals.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                accent={totals.profit >= 0 ? "text-primary bg-primary/10" : "text-rose-600 bg-rose-50"}
              />
              <KpiCard
                label="Health Score"
                value={`${health.score}`}
                hint={health.label}
                icon={<Activity className="w-4 h-4" />}
                accent="text-sky-600 bg-sky-50"
                gauge={health.score}
              />
              <KpiCard
                label="CFO Alerts"
                value={`${alerts.length}`}
                hint={alerts.length === 0 ? "All clear" : "Needs review"}
                icon={<AlertTriangle className="w-4 h-4" />}
                accent={alerts.length > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"}
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title="Profit trend" subtitle="Last 14 days" className="lg:col-span-2">
                {trendData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(160,84%,32%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(160,84%,32%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatMoney(v)}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="hsl(160,84%,32%)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "hsl(160,84%,32%)" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Expense breakdown" subtitle="Last 30 days">
                {expenseBreakdown.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {expenseBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatMoney(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title="Revenue vs Expenses" subtitle="Last 14 days" className="lg:col-span-2">
                {trendData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatMoney(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="revenue" fill="hsl(160,84%,32%)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expenses" fill="hsl(346, 84%, 56%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Alerts card */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Active CFO alerts</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Live insights from your data</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">All clear ✨</p>
                ) : (
                  <ul className="space-y-3">
                    {alerts.slice(0, 4).map((a) => (
                      <li
                        key={a.id}
                        className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            a.severity === "critical"
                              ? "bg-rose-500"
                              : a.severity === "warning"
                              ? "bg-amber-500"
                              : "bg-sky-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
  gauge?: number;
}

const KpiCard = ({ label, value, hint, icon, accent, gauge }: KpiCardProps) => (
  <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
    </div>
    <p className="text-xl md:text-2xl font-bold text-foreground tabular-nums">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    {typeof gauge === "number" && (
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-sky-500 transition-all"
          style={{ width: `${Math.max(2, gauge)}%` }}
        />
      </div>
    )}
  </div>
);

const ChartCard = ({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const EmptyChart = () => (
  <div className="h-[260px] flex flex-col items-center justify-center text-center">
    <Wallet className="w-8 h-8 text-muted-foreground/40 mb-2" />
    <p className="text-sm text-muted-foreground">No data yet</p>
    <p className="text-xs text-muted-foreground/70 mt-1">Log entries in chat to see insights</p>
  </div>
);

export default Dashboard;
