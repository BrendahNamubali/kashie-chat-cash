// Uganda tax rules used for ESTIMATES only.
// Keep every rate/deadline here so official URA updates can be applied in one place.
// Always verify against current URA guidance before filing.

export const TAX_RULES_VERSION = "UG-estimates-2026.1";

export const VAT = {
  standardRate: 0.18,
  annualRegistrationThreshold: 150_000_000, // UGX turnover
  dueDayOfFollowingMonth: 15,
};

export const WHT = {
  standardRate: 0.06,
  dueDayOfFollowingMonth: 15,
};

export const PAYE = {
  dueDayOfFollowingMonth: 15,
  // Monthly resident bands (UGX)
  bands: [
    { upTo: 235_000, base: 0, rate: 0, over: 0 },
    { upTo: 335_000, base: 0, rate: 0.1, over: 235_000 },
    { upTo: 410_000, base: 10_000, rate: 0.2, over: 335_000 },
    { upTo: Infinity, base: 25_000, rate: 0.3, over: 410_000 },
  ],
  highIncomeThreshold: 10_000_000,
  highIncomeExtraRate: 0.1,
};

export const INCOME_TAX = {
  companyRate: 0.3,
  // Annual resident individual bands (UGX)
  individualBands: [
    { upTo: 2_820_000, base: 0, rate: 0, over: 0 },
    { upTo: 4_020_000, base: 0, rate: 0.1, over: 2_820_000 },
    { upTo: 4_920_000, base: 120_000, rate: 0.2, over: 4_020_000 },
    { upTo: Infinity, base: 300_000, rate: 0.3, over: 4_920_000 },
  ],
  individualHighIncomeThreshold: 120_000_000,
  individualHighIncomeExtraRate: 0.1,
  fiscalYearStartMonth: 7, // July
  finalReturnMonthsAfterYearEnd: 6,
};

export const RETURN_LABELS = {
  vat: "VAT",
  income_tax: "Income Tax",
  wht: "Withholding Tax (WHT)",
  paye: "PAYE",
} as const;

export type ReturnType = keyof typeof RETURN_LABELS;
