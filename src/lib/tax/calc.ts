import { addMonths, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { INCOME_TAX, PAYE, VAT, WHT, type ReturnType } from "./rules";
import type { DailyEntry } from "@/lib/finance";

export interface Period { start: string; end: string; label: string }

export function monthPeriod(d: Date = new Date()): Period {
  const s = startOfMonth(d);
  return { start: format(s, "yyyy-MM-dd"), end: format(endOfMonth(s), "yyyy-MM-dd"), label: format(s, "MMMM yyyy") };
}

export function fiscalYearPeriod(d: Date = new Date()): Period {
  const y = d.getMonth() + 1 >= INCOME_TAX.fiscalYearStartMonth ? d.getFullYear() : d.getFullYear() - 1;
  return { start: `${y}-07-01`, end: `${y + 1}-06-30`, label: `FY ${y}/${String(y + 1).slice(2)}` };
}

export function recentMonths(n = 12): Period[] {
  return Array.from({ length: n }, (_, i) => monthPeriod(addMonths(new Date(), -i)));
}
export function recentFiscalYears(n = 3): Period[] {
  return Array.from({ length: n }, (_, i) => fiscalYearPeriod(addMonths(new Date(), -12 * i)));
}

export function periodTotals(entries: DailyEntry[], p: Period) {
  const inP = entries.filter((e) => e.date >= p.start && e.date <= p.end);
  const today = format(new Date(), "yyyy-MM-dd");
  const effectiveEnd = p.end < today ? p.end : today;
  const days = Math.max(0, differenceInCalendarDays(parseISO(effectiveEnd), parseISO(p.start)) + 1);
  return {
    sales: inP.reduce((s, e) => s + Number(e.revenue || 0), 0),
    expenses: inP.reduce((s, e) => s + Number(e.expenses || 0), 0),
    daysRecorded: inP.length,
    daysElapsed: days,
  };
}

function bands(amount: number, list: { upTo: number; base: number; rate: number; over: number }[]) {
  const b = list.find((x) => amount <= x.upTo)!;
  return b.base + (amount - b.over) * b.rate;
}

export interface Issue { level: "block" | "warn"; message: string }

export interface VatInputs { exempt_sales?: number; zero_rated_sales?: number; invoiced_expenses?: number; sales_override?: number }
export function calcVat(sales: number, pricesIncludeVat: boolean, i: VatInputs) {
  const gross = i.sales_override ?? sales;
  const standard = Math.max(0, gross - (i.exempt_sales || 0) - (i.zero_rated_sales || 0));
  const r = VAT.standardRate;
  const output = pricesIncludeVat ? (standard * r) / (1 + r) : standard * r;
  const input = ((i.invoiced_expenses || 0) * r) / (1 + r);
  return { gross_sales: gross, standard_rated_sales: standard, output_vat: Math.round(output), input_vat: Math.round(input), net_vat: Math.round(output - input) };
}

export interface IncomeInputs { sales_override?: number; expenses_override?: number; non_deductible?: number }
export function calcIncomeTax(sales: number, expenses: number, type: "individual" | "company", i: IncomeInputs) {
  const s = i.sales_override ?? sales;
  const e = i.expenses_override ?? expenses;
  const chargeable = Math.max(0, s - e + (i.non_deductible || 0));
  let tax = type === "company" ? chargeable * INCOME_TAX.companyRate : bands(chargeable, INCOME_TAX.individualBands);
  if (type === "individual" && chargeable > INCOME_TAX.individualHighIncomeThreshold)
    tax += (chargeable - INCOME_TAX.individualHighIncomeThreshold) * INCOME_TAX.individualHighIncomeExtraRate;
  return { sales: s, expenses: e, chargeable_income: Math.round(chargeable), income_tax: Math.round(tax) };
}

export interface Line { name: string; amount: number }
export function calcPaye(employees: Line[]) {
  const rows = employees.map((e) => {
    let t = bands(e.amount, PAYE.bands);
    if (e.amount > PAYE.highIncomeThreshold) t += (e.amount - PAYE.highIncomeThreshold) * PAYE.highIncomeExtraRate;
    return { ...e, tax: Math.round(t) };
  });
  return { employees: rows, total_gross: rows.reduce((s, r) => s + r.amount, 0), total_paye: rows.reduce((s, r) => s + r.tax, 0) };
}

export function calcWht(payments: Line[]) {
  const rows = payments.map((p) => ({ ...p, tax: Math.round(p.amount * WHT.standardRate) }));
  return { payments: rows, total_paid: rows.reduce((s, r) => s + r.amount, 0), total_wht: rows.reduce((s, r) => s + r.tax, 0) };
}

export function dueDate(type: ReturnType, p: Period): string {
  if (type === "income_tax") return format(endOfMonth(addMonths(parseISO(p.end), INCOME_TAX.finalReturnMonthsAfterYearEnd)), "yyyy-MM-dd");
  const day = type === "vat" ? VAT.dueDayOfFollowingMonth : type === "wht" ? WHT.dueDayOfFollowingMonth : PAYE.dueDayOfFollowingMonth;
  const next = addMonths(parseISO(p.start), 1);
  return format(new Date(next.getFullYear(), next.getMonth(), day), "yyyy-MM-dd");
}

export interface ReturnInputs extends VatInputs, IncomeInputs { employees?: Line[]; payments?: Line[] }
export interface TaxProfileLite { tin: string | null; vat_status: string; prices_include_vat: boolean; taxpayer_type: string }

export function computeReturn(type: ReturnType, entries: DailyEntry[], p: Period, profile: TaxProfileLite | null, inputs: ReturnInputs) {
  const t = periodTotals(entries, p);
  const issues: Issue[] = [];
  if (!profile?.tin) issues.push({ level: "block", message: "Add your TIN in Business details." });
  let figures: Record<string, unknown> = {};
  let amount = 0;

  if (type === "vat") {
    if (profile?.vat_status !== "registered") issues.push({ level: "block", message: "VAT returns only apply if you're VAT registered. Update your VAT status." });
    const v = calcVat(t.sales, profile?.prices_include_vat ?? true, inputs);
    figures = v; amount = v.net_vat;
    if (!inputs.invoiced_expenses && t.expenses > 0) issues.push({ level: "warn", message: "No expenses marked as backed by EFRIS tax invoices, so no input VAT is claimed." });
  } else if (type === "income_tax") {
    const v = calcIncomeTax(t.sales, t.expenses, (profile?.taxpayer_type as "individual" | "company") || "individual", inputs);
    figures = v; amount = v.income_tax;
  } else if (type === "paye") {
    const v = calcPaye(inputs.employees ?? []);
    figures = v; amount = v.total_paye;
    if (!inputs.employees?.length) issues.push({ level: "warn", message: "Kashie has no payroll records. Add each employee's gross pay for this month, or skip if you have no staff." });
  } else {
    const v = calcWht(inputs.payments ?? []);
    figures = v; amount = v.total_wht;
    if (!inputs.payments?.length) issues.push({ level: "warn", message: "Kashie has no supplier payment records. Add payments you withheld tax on, if you're a withholding agent." });
  }

  if (type === "vat" || type === "income_tax") {
    const missing = t.daysElapsed - t.daysRecorded;
    if (t.daysRecorded === 0) issues.push({ level: "block", message: "No sales or expenses recorded for this period." });
    else if (missing > 0) issues.push({ level: "warn", message: `${missing} day${missing > 1 ? "s" : ""} in this period have no records. Check if you missed any sales.` });
    if (t.expenses > t.sales && t.sales > 0) issues.push({ level: "warn", message: "Expenses are higher than sales. Double-check both are correct." });
  }
  return { totals: t, figures, amount, issues, due: dueDate(type, p) };
}
