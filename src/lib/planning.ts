import { format, subDays } from "date-fns";
import type { DailyEntry } from "@/lib/finance";

export function planningBaseline(entries: DailyEntry[], today = new Date()) {
  const start = format(subDays(today, 29), "yyyy-MM-dd");
  const end = format(today, "yyyy-MM-dd");
  const rows = entries.filter((e) => e.date >= start && e.date <= end);
  const sales = rows.reduce((sum, e) => sum + Number(e.revenue), 0);
  const expenses = rows.reduce((sum, e) => sum + Number(e.expenses), 0);
  return { rows, start, end, sales, expenses, profit: sales - expenses, days: rows.length };
}

export function projectMoney(baseline: ReturnType<typeof planningBaseline>, days: number, salesChange: number, expenseChange: number) {
  if (baseline.days < 7) return null;
  const sales = baseline.sales / baseline.days * days * (1 + salesChange / 100);
  const expenses = baseline.expenses / baseline.days * days * (1 + expenseChange / 100);
  return { sales, expenses, profit: sales - expenses };
}

export function monthlyRepayment(principal: number, annualRate: number, months: number) {
  if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(months) || principal <= 0 || annualRate < 0 || months < 1) return null;
  const rate = annualRate / 1200;
  return rate === 0 ? principal / months : principal * rate / (1 - Math.pow(1 + rate, -months));
}