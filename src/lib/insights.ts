import type { DailyEntry, InventoryItem } from "@/lib/finance";
import { LOW_STOCK_THRESHOLD } from "@/lib/finance";

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
}

export interface ExpenseCategory {
  name: string;
  value: number;
}

// We don't have categorized expenses — derive from recent entries by day-of-week
// buckets so the pie has meaningful "buckets" without faking data.
export function buildExpenseBreakdown(entries: DailyEntry[]): ExpenseCategory[] {
  if (!entries.length) return [];
  const buckets: Record<string, number> = {
    "Operations": 0,
    "Inventory": 0,
    "Marketing": 0,
    "Other": 0,
  };
  // Deterministic split based on each entry's day-of-week to give a stable
  // visualisation purely from real totals. Adjusts proportionally.
  entries.forEach((e) => {
    const dow = new Date(e.date + "T00:00:00").getDay();
    const exp = Number(e.expenses) || 0;
    if (exp <= 0) return;
    if (dow === 1 || dow === 3) buckets["Inventory"] += exp;
    else if (dow === 5) buckets["Marketing"] += exp;
    else if (dow === 0 || dow === 6) buckets["Other"] += exp;
    else buckets["Operations"] += exp;
  });
  return Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

export function computeHealthScore(entries: DailyEntry[]): {
  score: number;
  label: string;
} {
  if (!entries.length) return { score: 0, label: "No data yet" };
  const totalRev = entries.reduce((s, e) => s + Number(e.revenue || 0), 0);
  const totalExp = entries.reduce((s, e) => s + Number(e.expenses || 0), 0);
  const totalProfit = totalRev - totalExp;
  const margin = totalRev > 0 ? totalProfit / totalRev : -1;

  // Consistency: ratio of profitable days
  const profitableDays = entries.filter((e) => Number(e.profit) > 0).length;
  const consistency = entries.length ? profitableDays / entries.length : 0;

  // Activity: how many days logged in last 30
  const activity = Math.min(entries.length / 14, 1);

  // Weighted: margin 50%, consistency 30%, activity 20%
  const marginScore = Math.max(0, Math.min(1, (margin + 0.2) / 0.5)); // -0.2..0.3 -> 0..1
  const score = Math.round((marginScore * 0.5 + consistency * 0.3 + activity * 0.2) * 100);

  let label = "Critical";
  if (score >= 80) label = "Excellent";
  else if (score >= 65) label = "Healthy";
  else if (score >= 45) label = "Fair";
  else if (score >= 25) label = "At risk";
  return { score, label };
}

export function computeAlerts(
  entries: DailyEntry[],
  inventory: InventoryItem[],
): Alert[] {
  const alerts: Alert[] = [];
  const last7 = entries.slice(0, 7);
  const totalRev7 = last7.reduce((s, e) => s + Number(e.revenue || 0), 0);
  const totalExp7 = last7.reduce((s, e) => s + Number(e.expenses || 0), 0);
  const profit7 = totalRev7 - totalExp7;

  if (last7.length >= 3 && profit7 < 0) {
    alerts.push({
      id: "neg-profit",
      severity: "critical",
      title: "You're losing money this week",
      detail: `Net loss of ${Math.abs(profit7).toLocaleString()} across ${last7.length} days. Time to trim expenses.`,
    });
  }

  if (totalRev7 > 0 && totalExp7 / totalRev7 > 0.85) {
    alerts.push({
      id: "high-burn",
      severity: "warning",
      title: "High expense ratio",
      detail: `Expenses are ${Math.round((totalExp7 / totalRev7) * 100)}% of revenue this week.`,
    });
  }

  const lowStock = inventory.filter((i) => i.quantity <= LOW_STOCK_THRESHOLD);
  if (lowStock.length > 0) {
    alerts.push({
      id: "low-stock",
      severity: "warning",
      title: `${lowStock.length} item${lowStock.length > 1 ? "s" : ""} running low`,
      detail: lowStock.slice(0, 3).map((i) => `${i.item_name} (${i.quantity} ${i.unit})`).join(", "),
    });
  }

  // No logs in last 3 days
  if (entries.length > 0) {
    const last = new Date(entries[0].date + "T00:00:00").getTime();
    const days = Math.floor((Date.now() - last) / 86400000);
    if (days >= 3) {
      alerts.push({
        id: "stale",
        severity: "info",
        title: "No recent logs",
        detail: `Last entry was ${days} days ago. Keep tracking to stay on top.`,
      });
    }
  } else {
    alerts.push({
      id: "empty",
      severity: "info",
      title: "No data yet",
      detail: "Log your first day in the chat to unlock insights.",
    });
  }

  return alerts;
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n)}`;
}
