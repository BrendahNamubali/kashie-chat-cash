import { supabase } from "@/integrations/supabase/client";

export interface DailyEntry {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface InventoryItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit: string;
}

export interface Profile {
  full_name: string | null;
  business_name: string | null;
  contact: string | null;
  onboarding_completed: boolean;
}

export const LOW_STOCK_THRESHOLD = 5;

// ---- Auth helper ----
async function requireUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ---- Daily entries ----

export async function saveEntry(entry: DailyEntry) {
  const userId = await requireUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("daily_entries")
    .upsert(
      {
        user_id: userId,
        date: entry.date,
        revenue: entry.revenue,
        expenses: entry.expenses,
        profit: entry.profit,
      },
      { onConflict: "user_id,date" },
    );
  if (error) console.error("Failed to save entry:", error);
}

export async function getEntries(): Promise<DailyEntry[]> {
  const { data, error } = await supabase
    .from("daily_entries")
    .select("date, revenue, expenses, profit")
    .order("date", { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getTodayEntry(): Promise<DailyEntry | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_entries")
    .select("date, revenue, expenses, profit")
    .eq("date", today)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data ?? null;
}

export async function getWeekEntries(): Promise<DailyEntry[]> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const dateStr = weekAgo.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_entries")
    .select("date, revenue, expenses, profit")
    .gte("date", dateStr)
    .order("date", { ascending: true });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

// ---- Profile (per-user) ----

export async function getProfile(): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, business_name, contact, onboarding_completed")
    .maybeSingle();
  return data ?? null;
}

export async function updateProfile(updates: {
  full_name?: string;
  business_name?: string;
  contact?: string | null;
  onboarding_completed?: boolean;
}) {
  const userId = await requireUserId();
  if (!userId) return { error: "Not signed in" };
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);
  if (error) console.error("Failed to update profile:", error);
  return { error };
}

export async function getBusinessName(): Promise<string | null> {
  const profile = await getProfile();
  return profile?.business_name ?? null;
}

// ---- Inventory ----

export async function getInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, item_name, quantity, unit")
    .order("item_name");
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const items = await getInventory();
  return items.filter((i) => i.quantity <= LOW_STOCK_THRESHOLD);
}

export async function getLowStockGreeting(): Promise<string | null> {
  const lowItems = await getLowStockItems();
  if (lowItems.length === 0) return null;

  let msg = "⚠️ Heads up, a few items are running low:\n\n";
  for (const item of lowItems) {
    msg += `• ${item.item_name}: ${item.quantity} ${item.unit}\n`;
  }
  msg += "\n💡 Might be a good time to restock before you run out.";
  return msg;
}

export async function upsertInventoryItem(item: InventoryItem) {
  const userId = await requireUserId();
  if (!userId) return;
  if (item.id) {
    await supabase.from("inventory_items").update({
      item_name: item.item_name, quantity: item.quantity, unit: item.unit,
    }).eq("id", item.id);
  } else {
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id")
      .ilike("item_name", item.item_name)
      .maybeSingle();

    if (existing) {
      await supabase.from("inventory_items").update({
        quantity: item.quantity, unit: item.unit,
      }).eq("id", existing.id);
    } else {
      await supabase.from("inventory_items").insert({
        user_id: userId,
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
  }
}

// ---- Formatting ----

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// ---- Message generators ----

export function getProfitMessage(profit: number, revenue: number, expenses: number): string {
  const revenueStr = formatMoney(revenue);
  const expensesStr = formatMoney(expenses);

  if (profit > 0) {
    const profitStr = formatMoney(profit);
    const ratio = profit / revenue;

    if (ratio > 0.3) {
      return `Nice, you made a profit of ${profitStr} today, that's a good sign 👏\n\nYou earned ${revenueStr} and spent ${expensesStr}. You kept a solid chunk of what you made, which is exactly where you want to be.\n\n💡 Try setting a little aside as savings. Even small amounts add up over time.`;
    }
    return `You made ${profitStr} in profit today, and that's worth celebrating 💰\n\nYou earned ${revenueStr} and spent ${expensesStr}. You're in the green, but your expenses are a bit high, so let's keep an eye on that.\n\n💡 Take a quick look at what you spent today and see if there's one thing you could trim tomorrow.`;
  }

  if (profit === 0) {
    return `You broke even today, earned ${revenueStr} and spent the same. That's not bad at all, you didn't lose any money 👍\n\n💡 Tomorrow, try finding one small way to earn a bit more or spend a bit less. Small tweaks make a real difference.`;
  }

  const lossStr = formatMoney(Math.abs(profit));
  return `Today you spent ${lossStr} more than you earned. ${revenueStr} came in, ${expensesStr} went out. Some days are like that, and the important thing is you're keeping track of it.\n\n💡 Look at your biggest expense today. Is there a way to reduce it or move it to a better day?`;
}

export async function getWeeklySummaryMessage(): Promise<string> {
  const entries = await getWeekEntries();

  if (entries.length === 0) {
    return "No data from this past week yet. Log today's money first and we'll start building your summary 📊";
  }

  const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
  const totalExpenses = entries.reduce((s, e) => s + e.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const days = entries.length;

  const businessName = await getBusinessName();
  const nameLabel = businessName ? ` for ${businessName}` : "";

  let msg = `📊 Here's your week at a glance${nameLabel} (${days} day${days > 1 ? "s" : ""}):\n\n`;
  msg += `💰 Money earned: ${formatMoney(totalRevenue)}\n`;
  msg += `💸 Money spent: ${formatMoney(totalExpenses)}\n`;
  msg += `${totalProfit >= 0 ? "✅" : "🔴"} What you kept: ${formatMoney(totalProfit)}\n\n`;

  if (totalProfit > 0) {
    msg += `You're doing well, you earned more than you spent this week, and that's exactly where you want to be 🚀\n\n💡 Think about putting some of that extra money back into your business to help it grow.`;
  } else if (totalProfit === 0) {
    msg += `You broke even this week. You didn't lose money, and that's something to build on 👍\n\n💡 Pick one thing that cost more than expected and see if there's a cheaper way to handle it.`;
  } else {
    msg += `This week was a tough one, you spent more than you earned. But you're tracking it, which means you can turn things around.\n\n💡 Look at the days where you spent the most. Was that spending necessary, or could it wait?`;
  }

  return msg;
}

export async function getInventorySummaryMessage(): Promise<string> {
  const items = await getInventory();

  if (items.length === 0) {
    return "You don't have any inventory tracked yet. Use \"Update stock\" to add your first item 📦";
  }

  let msg = "📦 Here's your current stock:\n\n";
  for (const item of items) {
    const warning = item.quantity <= LOW_STOCK_THRESHOLD ? " ⚠️ Low!" : "";
    msg += `• ${item.item_name}: ${item.quantity} ${item.unit}${warning}\n`;
  }
  msg += "\n💡 Keep an eye on items running low, restocking early saves you from lost sales.";
  return msg;
}
