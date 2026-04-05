export interface DailyEntry {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

const STORAGE_KEY = "kashie_entries";

export function saveEntry(entry: DailyEntry) {
  const entries = getEntries();
  // Replace if same date exists
  const idx = entries.findIndex((e) => e.date === entry.date);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getEntries(): DailyEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getWeekEntries(): DailyEntry[] {
  const entries = getEntries();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return entries.filter((e) => new Date(e.date) >= weekAgo);
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function getProfitMessage(profit: number, revenue: number, expenses: number): string {
  const profitStr = formatMoney(Math.abs(profit));
  let msg = "";

  if (profit > 0) {
    msg = `Great news! 🎉 You made ${profitStr} in profit today!\n\nYou brought in ${formatMoney(revenue)} and spent ${formatMoney(expenses)}. That means you kept money in your pocket — nice work!`;
    if (profit / revenue > 0.3) {
      msg += `\n\n💡 Tip: Your profit margin is really healthy! Consider setting aside a small amount for a rainy day fund.`;
    } else {
      msg += `\n\n💡 Tip: Try to see if any of your expenses can be reduced even slightly — small savings add up fast!`;
    }
  } else if (profit === 0) {
    msg = `You broke even today — ${formatMoney(revenue)} in, ${formatMoney(expenses)} out. Not bad!\n\n💡 Tip: Tomorrow, try to either boost sales a bit or trim one small cost. Every little bit helps!`;
  } else {
    msg = `Today you spent ${profitStr} more than you earned. Revenue was ${formatMoney(revenue)} and expenses were ${formatMoney(expenses)}.\n\nDon't worry — some days are like that! 💪\n\n💡 Tip: Take a look at today's biggest expense. Is there a way to reduce or delay it?`;
  }

  return msg;
}

export function getWeeklySummaryMessage(): string {
  const entries = getWeekEntries();

  if (entries.length === 0) {
    return "I don't have any data from this past week yet. Try logging today's money first, and we'll build up your summary! 📊";
  }

  const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
  const totalExpenses = entries.reduce((s, e) => s + e.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  let msg = `📊 Here's your week at a glance (${entries.length} day${entries.length > 1 ? "s" : ""}):\n\n`;
  msg += `💰 Total Revenue: ${formatMoney(totalRevenue)}\n`;
  msg += `💸 Total Expenses: ${formatMoney(totalExpenses)}\n`;
  msg += `${totalProfit >= 0 ? "✅" : "🔴"} Total Profit: ${formatMoney(totalProfit)}\n\n`;

  if (totalProfit > 0) {
    msg += `You're in the green! That means your business brought in more than it spent — keep it up! 🚀\n\n💡 Consider investing some of that profit back into growing your business.`;
  } else if (totalProfit === 0) {
    msg += `You broke even this week. Not losing money is a win! Focus on finding one way to boost revenue next week.`;
  } else {
    msg += `This week was tough — you spent more than you earned. But knowing that is the first step to fixing it!\n\n💡 Look at your highest-expense days and see what can be cut or postponed.`;
  }

  return msg;
}
