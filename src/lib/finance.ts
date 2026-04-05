export interface DailyEntry {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

const STORAGE_KEY = "kashie_entries";

export function saveEntry(entry: DailyEntry) {
  const entries = getEntries();
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
  const revenueStr = formatMoney(revenue);
  const expensesStr = formatMoney(expenses);

  if (profit > 0) {
    const profitStr = formatMoney(profit);
    const ratio = profit / revenue;

    if (ratio > 0.3) {
      return `Nice, you made a profit of ${profitStr} today — that's a good sign 👏\n\nYou earned ${revenueStr} and spent ${expensesStr}. You kept a solid chunk of what you made, which is exactly where you want to be.\n\n💡 Try setting a little aside as savings. Even small amounts add up over time.`;
    }
    return `You made ${profitStr} in profit today, and that's worth celebrating 💰\n\nYou earned ${revenueStr} and spent ${expensesStr}. You're in the green, but your expenses are a bit high — let's keep an eye on that.\n\n💡 Take a quick look at what you spent today and see if there's one thing you could trim tomorrow.`;
  }

  if (profit === 0) {
    return `You broke even today — earned ${revenueStr} and spent the same. That's not bad at all, you didn't lose any money 👍\n\n💡 Tomorrow, try finding one small way to earn a bit more or spend a bit less. Small tweaks make a real difference.`;
  }

  const lossStr = formatMoney(Math.abs(profit));
  return `Today you spent ${lossStr} more than you earned — ${revenueStr} came in, ${expensesStr} went out. Some days are like that, and the important thing is you're keeping track of it.\n\n💡 Look at your biggest expense today. Is there a way to reduce it or move it to a better day?`;
}

export function getWeeklySummaryMessage(): string {
  const entries = getWeekEntries();

  if (entries.length === 0) {
    return "No data from this past week yet. Log today's money first and we'll start building your summary 📊";
  }

  const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
  const totalExpenses = entries.reduce((s, e) => s + e.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const days = entries.length;

  let msg = `📊 Here's your week at a glance (${days} day${days > 1 ? "s" : ""}):\n\n`;
  msg += `💰 Money earned: ${formatMoney(totalRevenue)}\n`;
  msg += `💸 Money spent: ${formatMoney(totalExpenses)}\n`;
  msg += `${totalProfit >= 0 ? "✅" : "🔴"} What you kept: ${formatMoney(totalProfit)}\n\n`;

  if (totalProfit > 0) {
    msg += `You're doing well — you earned more than you spent this week, and that's exactly where you want to be 🚀\n\n💡 Think about putting some of that extra money back into your business to help it grow.`;
  } else if (totalProfit === 0) {
    msg += `You broke even this week. You didn't lose money, and that's something to build on 👍\n\n💡 Pick one thing that cost more than expected and see if there's a cheaper way to handle it.`;
  } else {
    msg += `This week was a tough one — you spent more than you earned. But you're tracking it, which means you can turn things around.\n\n💡 Look at the days where you spent the most. Was that spending necessary, or could it wait?`;
  }

  return msg;
}
