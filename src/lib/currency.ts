// Central currency handling. Display only: amounts are never converted.
export const CURRENCIES = [
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "ZAR", name: "South African Rand" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
] as const;

let current = "UGX";

export function setCurrency(code: string | null | undefined) {
  if (code && /^[A-Z]{3}$/.test(code)) current = code;
}
export function getCurrency() {
  return current;
}

export function formatMoney(n: number, code = current): string {
  const value = Number(n) || 0;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "code", maximumFractionDigits: 0 })
      .format(value)
      .replace(/\u00a0/g, " ");
  } catch {
    return `${code} ${Math.round(value).toLocaleString("en")}`;
  }
}

export function formatCompactMoney(n: number, code = current): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const short = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : abs >= 1_000 ? `${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K` : `${Math.round(abs)}`;
  return `${sign}${code} ${short}`;
}
