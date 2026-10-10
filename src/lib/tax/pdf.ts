import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fullLogo from "@/assets/kashie-full.png.asset.json";
import { formatMoney, type DailyEntry } from "@/lib/finance";
import type { TaxProfile } from "./data";
import { type Period, type ReturnInputs, computeReturn } from "./calc";
import { RETURN_LABELS, TAX_RULES_VERSION, type ReturnType } from "./rules";

export const FIGURE_LABELS: Record<string, string> = {
  gross_sales: "Total sales", standard_rated_sales: "Standard-rated sales (recorded basis)",
  output_vat: "Estimated VAT on sales", input_vat: "Estimated eligible input VAT", net_vat: "Estimated net VAT",
  sales: "Business sales", expenses: "Recorded expenses", chargeable_income: "Estimated chargeable income",
  income_tax: "Estimated income tax", total_gross: "Gross employee pay", total_paye: "Estimated PAYE",
  total_paid: "Payments subject to withholding", total_wht: "Estimated withholding tax",
};

export interface TaxPdfArgs {
  type: ReturnType; period: Period; entries: DailyEntry[]; profile: TaxProfile | null;
  inputs: ReturnInputs; businessName: string; issues: string[];
}

export async function buildTaxReturnPdf(args: TaxPdfArgs) {
  const { type, period, entries, profile, inputs, businessName, issues } = args;
  const result = computeReturn(type, entries, period, profile, inputs);
  const response = await fetch(fullLogo.url);
  if (!response.ok || !response.headers.get("content-type")?.includes("image")) throw new Error("The logo could not load. Please try again.");
  const logo = new Uint8Array(await response.arrayBuffer());
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({ title: `${RETURN_LABELS[type]} preparation - ${period.label}`, author: "Kashie" });
  doc.addImage(logo, "PNG", 36, 16, 120, 120 * 768 / 1374);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(`${RETURN_LABELS[type]} return preparation`, 36, 110);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("DRAFT ESTIMATE - Not an official URA form. Not submitted to URA.", 36, 130);
  autoTable(doc, {
    startY: 145, theme: "plain", styles: { fontSize: 10, cellPadding: 6 },
    body: [["Business", businessName], ["TIN", profile?.tin || "Not provided"],
      ["Taxpayer type", profile?.taxpayer_type || "Not provided"], ["Period", `${period.label} (${period.start} to ${period.end})`],
      ["Estimated due date", result.due], ["Currency", "UGX - no currency conversion applied"],
      ["Records included", `${result.totals.daysRecorded} day(s); ${Math.max(0, result.totals.daysElapsed - result.totals.daysRecorded)} day(s) without records`]],
  });
  autoTable(doc, {
    head: [["Preparation field", "Amount / value"]],
    body: Object.entries(result.figures).filter(([, value]) => typeof value === "number").map(([key, value]) => [FIGURE_LABELS[key] || key.replace(/_/g, " "), formatMoney(value as number, "UGX")]),
    styles: { fontSize: 10, cellPadding: 7 }, headStyles: { fillColor: [91, 97, 64] }, margin: { bottom: 45 },
  });
  const adjustments = Object.entries(inputs).filter(([, value]) => typeof value === "number").map(([key, value]) => [key.replace(/_/g, " "), formatMoney(value as number, "UGX")]);
  if (adjustments.length) autoTable(doc, { head: [["Your adjustments (records unchanged)", "Value"]], body: adjustments, styles: { fontSize: 9 }, headStyles: { fillColor: [91, 97, 64] }, margin: { bottom: 45 } });
  const lines = type === "paye" ? inputs.employees : type === "wht" ? inputs.payments : undefined;
  if (lines?.length) autoTable(doc, { head: [[type === "paye" ? "Employee" : "Payment", "Gross amount"]], body: lines.map((line) => [line.name, formatMoney(line.amount, "UGX")]), styles: { fontSize: 9 }, headStyles: { fillColor: [91, 97, 64] }, margin: { bottom: 45 } });
  autoTable(doc, {
    head: [["Before filing on the URA portal"]],
    body: [...issues, "Check receipts, tax treatment, tax credits, and any special rules with your tax adviser.",
      "Log in at https://ura.go.ug and select the relevant return and period. Use the current URA template; this PDF is a preparation worksheet only.",
      `Estimates use ${TAX_RULES_VERSION}. Standard resident rates only; exemptions, presumptive tax, reliefs, and special regimes are not determined here.`].map((message) => [message]),
    styles: { fontSize: 9, cellPadding: 7 }, headStyles: { fillColor: [91, 97, 64] }, margin: { bottom: 45 },
  });
  const rows = entries.filter((entry) => entry.date >= period.start && entry.date <= period.end).sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length) autoTable(doc, {
    head: [["Recorded date", "Sales", "Expenses"]], body: rows.map((row) => [row.date, formatMoney(row.revenue, "UGX"), formatMoney(row.expenses, "UGX")]),
    styles: { fontSize: 9 }, headStyles: { fillColor: [91, 97, 64] }, margin: { bottom: 45 }, pageBreak: "avoid",
  });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`Kashie | Draft preparation only | Page ${page} of ${doc.getNumberOfPages()}`, 36, 820);
  }
  return doc;
}