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
      return `You made a profit of ${profitStr} today — nice work! 🎉\n\nYou earned ${revenueStr} and spent ${expensesStr}. That means you kept a good chunk of what you made.\n\n💡 Suggestion: Since you're doing well, try putting a small amount aside as savings. Even a little adds up over time!`;
    }
    return `You made a profit of ${profitStr} today, which is a good sign! 💰\n\nYou earned ${revenueStr} and spent ${expensesStr}. You're in the green, but your expenses are a bit high compared to what you earned.\n\n💡 Suggestion: Take a look at what you spent today and see if there's one thing you could cut back on tomorrow.`;
  }

  if (profit === 0) {
    return `You broke even today — you earned ${revenueStr} and spent the same amount.\n\nThat's not bad! You didn't lose any money. 👍\n\n💡 Suggestion: Tomorrow, try to find one small way to either earn a bit more or spend a bit less. Small changes make a big difference!`;
  }

  const lossStr = formatMoney(Math.abs(profit));
  return `Today you spent ${lossStr} more than you earned. You brought in ${revenueStr} but spent ${expensesStr}.\n\nDon't worry — some days are like that. What matters is that you're tracking it! 💪\n\n💡 Suggestion: Look at your biggest expense today. Is there a way to reduce it or push it to a better day?`;
}

export function getWeeklySummaryMessage(): string {
  const entries = getWeekEntries();

  if (entries.length === 0) {
    return "I don't have any data from this past week yet. Try logging today's money first, and we'll build up your summary! 📊";
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
    msg += `You earned more than you spent this week — that's great! You're moving in the right direction. 🚀\n\n💡 Suggestion: Think about putting some of that extra money back into your business to help it grow.`;
  } else if (totalProfit === 0) {
    msg += `You broke even this week. You didn't lose money, and that's something! 👍\n\n💡 Suggestion: Pick one thing this week that cost more than expected and see if you can find a cheaper way to do it.`;
  } else {
    msg += `This week was a tough one — you spent more than you earned. But the fact that you're tracking it means you can fix it!\n\n💡 Suggestion: Look at the days where you spent the most and ask yourself: was that spending necessary, or can it wait?`;
  }

  return msg;
}
