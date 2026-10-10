import { describe, it, expect } from "vitest";
import { planningBaseline, projectMoney, monthlyRepayment } from "@/lib/planning";

describe("planning estimates", () => {
  const today = new Date(2026, 9, 10);
  const entries = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, revenue: 100, expenses: 60, profit: 40 }));
  it("uses recorded days and excludes future and old entries", () => {
    const baseline = planningBaseline([...entries, { date: "2026-11-01", revenue: 999, expenses: 0, profit: 999 }], today);
    expect(baseline.days).toBe(7);
    expect(projectMoney(baseline, 30, 10, 0)).toEqual({ sales: 3300.0000000000005, expenses: 1800, profit: 1500.0000000000005 });
  });
  it("does not invent a forecast when records are insufficient", () => {
    expect(projectMoney(planningBaseline(entries.slice(0, 6), today), 30, 0, 0)).toBeNull();
  });
  it("calculates zero-interest and reducing-balance loans", () => {
    expect(monthlyRepayment(1200, 0, 12)).toBe(100);
    expect(monthlyRepayment(1200, 12, 12)).toBeCloseTo(106.62, 2);
    expect(monthlyRepayment(-1, 12, 12)).toBeNull();
  });
});