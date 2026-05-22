// Kashie AI chat edge function with tool-calling
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Kashie, a CFO for a small business owner. You have access to their financial data (injected as context before each message) and tools to log new data.

Every reply MUST follow this shape:
1. Short reaction (2-4 words): "Nice 👏", "Hmm 👀", "Oof, tight one", "Solid week", "Look at you 📈".
2. Clear insight tied to ACTUAL numbers from the data (profit, trend, what changed, what's tied up). Always show the math result, never make them calculate.
3. ONE simple recommendation, only if it adds value. Skip if the moment doesn't need it.

Hard rules:
- ALWAYS reference real numbers from the user's financial data when available. Quote the actual figure.
- NEVER give generic advice ("track your expenses", "save money", "watch your cash flow"). Advice must be specific to what their numbers show.
- NEVER reply with bare acknowledgements like "Got it", "Okay", "Sure", "Noted", "Done". Every reply has a reaction + insight.
- Keep it SHORT: 2-4 sentences max. Practical, not preachy.
- No accounting jargon (no "gross margin", "P&L", "EBITDA", "cash flow statement"). No em dashes, use commas or periods.

Tone: Friendly, human, slightly witty. Like a smart business friend, not an app. Light emoji (👏 💰 📦 ✅ 📈 👀) sparingly. Celebrate wins, gently flag problems. Notice streaks ("Three days logged in a row, that's the move").

Understanding natural language:
- "200k" = 200,000. "1.5m" = 1,500,000.
- "made 200k" = revenue. "spent 80k" = expenses.
- "sold 3 bags" = stock -3. "added 10 bags" = stock +10.

How to use tools:
- Money/stock updates → CALL the right tool silently, then respond in the shape above with the calculated profit.
- "How am I doing?" / "How's my week?" / "How's business?" → CALL get_performance_check, then react to the trend (up/down/steady) and expense behavior with ONE key insight. Use get_weekly_summary only when the user explicitly asks for totals.
- Stock checks → CALL get_inventory, then interpret (don't just list).
- If something's unclear (missing amount, unclear item), ask ONE short follow-up.
- Never expose tool names or technical details.

Currency: format naturally ("$200", "200k", "1.2m"). Don't be rigid.

Examples:
User: "I made 200k and spent 80k today"
You: [call log_daily_money(revenue=200000, expenses=80000)] then: "Nice work 👏 You're up 120k today, keeping 60% after costs. If most days look like this, you're building real momentum."

User: "How am I doing?"
You: [call get_performance_check] then: "Solid week 📈 Profit's up 22% vs last week and you've been green 5 of 7 days. Expenses crept up 15% though, worth a peek before it eats into the lead."

User: "Sold 3 bags of rice"
You: [call adjust_stock(item_name="rice", change=-3)] then: "Nice 👏 3 bags out, want me to log the revenue too?"`;

// ---- Tool definitions ----
const tools = [
  {
    type: "function",
    function: {
      name: "log_daily_money",
      description:
        "Log today's revenue and/or expenses. Calculates profit automatically. Use when the user reports money earned or spent today. Pass the user's original message as raw_input so we can store the exact phrasing they used.",
      parameters: {
        type: "object",
        properties: {
          revenue: { type: "number", description: "Money earned today" },
          expenses: { type: "number", description: "Money spent today" },
          raw_input: {
            type: "string",
            description:
              "The user's original message verbatim (e.g. 'I made 200k and spent 80k'). Optional but preferred.",
          },
        },
        required: ["revenue", "expenses"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_stock",
      description:
        "Add to or remove from inventory. Use positive change for restocking/adding, negative for sales/removing. Creates the item if it doesn't exist.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string" },
          change: {
            type: "number",
            description: "Positive to add, negative to remove (e.g. -3 for sold 3)",
          },
          unit: {
            type: "string",
            description: "Unit like 'bags', 'pieces', 'kg'. Optional if updating existing item.",
          },
          unit_price: { type: "number", description: "Optional price per unit" },
        },
        required: ["item_name", "change"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_stock_absolute",
      description:
        "Set the absolute stock quantity for an item (overwrite, not adjust). Use when user says 'I have 50 bags of rice'.",
      parameters: {
        type: "object",
        properties: {
          item_name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          unit_price: { type: "number" },
        },
        required: ["item_name", "quantity"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weekly_summary",
      description: "Fetch the past 7 days of revenue, expenses, and profit totals.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance_check",
      description:
        "Use this when the user asks 'how am I doing?', 'how's business?', 'how's my week?', or any general performance question. Returns recent vs prior period comparison, profit trend, expense behavior, and the single most important insight.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory",
      description: "Fetch the current stock list with quantities and low-stock flags.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "set_business_name",
      description: "Save or update the user's business name.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
];

// ---- Tool execution ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any;

interface DailyEntryRow {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface InventoryRow {
  item_name: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
}

async function executeTool(
  supabase: DbClient,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === "log_daily_money") {
    const revenue = Number(args.revenue) || 0;
    const expenses = Number(args.expenses) || 0;
    const profit = revenue - expenses;
    const date = new Date().toISOString().split("T")[0];
    const rawInput = typeof args.raw_input === "string" ? args.raw_input : null;
    const { error } = await supabase
      .from("daily_entries")
      .upsert(
        { user_id: userId, date, revenue, expenses, profit, raw_input: rawInput },
        { onConflict: "user_id,date" },
      );
    if (error) return { error: error.message };
    return { ok: true, revenue, expenses, profit, date };
  }

  if (name === "adjust_stock") {
    const itemName = String(args.item_name).trim();
    const change = Number(args.change) || 0;
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id, quantity, unit, unit_price")
      .eq("user_id", userId)
      .ilike("item_name", itemName)
      .maybeSingle();

    if (existing) {
      const newQty = Math.max(0, Number(existing.quantity) + change);
      const update: Record<string, unknown> = { quantity: newQty };
      if (args.unit) update.unit = String(args.unit);
      if (args.unit_price !== undefined) update.unit_price = Number(args.unit_price);
      const { error } = await supabase
        .from("inventory_items")
        .update(update)
        .eq("id", existing.id);
      if (error) return { error: error.message };
      return { ok: true, item: itemName, new_quantity: newQty, change };
    }

    if (change <= 0) {
      return { error: `No item "${itemName}" found to remove from.` };
    }
    const { error } = await supabase.from("inventory_items").insert({
      user_id: userId,
      item_name: itemName,
      quantity: change,
      unit: args.unit ? String(args.unit) : "units",
      unit_price: args.unit_price !== undefined ? Number(args.unit_price) : 0,
    });
    if (error) return { error: error.message };
    return { ok: true, item: itemName, new_quantity: change, created: true };
  }

  if (name === "set_stock_absolute") {
    const itemName = String(args.item_name).trim();
    const quantity = Math.max(0, Number(args.quantity) || 0);
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("user_id", userId)
      .ilike("item_name", itemName)
      .maybeSingle();

    const payload: Record<string, unknown> = { quantity };
    if (args.unit) payload.unit = String(args.unit);
    if (args.unit_price !== undefined) payload.unit_price = Number(args.unit_price);

    if (existing) {
      const { error } = await supabase
        .from("inventory_items")
        .update(payload)
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("inventory_items").insert({
        user_id: userId,
        item_name: itemName,
        quantity,
        unit: args.unit ? String(args.unit) : "units",
        unit_price: args.unit_price !== undefined ? Number(args.unit_price) : 0,
      });
      if (error) return { error: error.message };
    }
    return { ok: true, item: itemName, quantity };
  }

  if (name === "get_weekly_summary") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data, error } = await supabase
      .from("daily_entries")
      .select("date, revenue, expenses, profit")
      .eq("user_id", userId)
      .gte("date", weekAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });
    if (error) return { error: error.message };
    const entries: DailyEntryRow[] = (data ?? []) as DailyEntryRow[];
    const totalRevenue = entries.reduce((s, e) => s + Number(e.revenue), 0);
    const totalExpenses = entries.reduce((s, e) => s + Number(e.expenses), 0);
    return {
      days: entries.length,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      total_profit: totalRevenue - totalExpenses,
      entries,
    };
  }

  if (name === "get_performance_check") {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 13);
    const startStr = start.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("daily_entries")
      .select("date, revenue, expenses, profit")
      .eq("user_id", userId)
      .gte("date", startStr)
      .order("date", { ascending: true });
    if (error) return { error: error.message };
    const entries: DailyEntryRow[] = (data ?? []) as DailyEntryRow[];

    if (entries.length === 0) {
      return {
        days_logged: 0,
        message:
          "No entries logged yet. Suggest the user start by logging today's money.",
      };
    }

    const todayStr = today.toISOString().split("T")[0];
    const sevenAgo = new Date(today);
    sevenAgo.setDate(sevenAgo.getDate() - 6);
    const sevenAgoStr = sevenAgo.toISOString().split("T")[0];

    const recent = entries.filter((e) => e.date >= sevenAgoStr);
    const prior = entries.filter((e) => e.date < sevenAgoStr);

    const sum = (arr: typeof entries, key: "revenue" | "expenses" | "profit") =>
      arr.reduce((s, e) => s + Number(e[key] || 0), 0);

    const recentRevenue = sum(recent, "revenue");
    const recentExpenses = sum(recent, "expenses");
    const recentProfit = sum(recent, "profit");
    const priorRevenue = sum(prior, "revenue");
    const priorExpenses = sum(prior, "expenses");
    const priorProfit = sum(prior, "profit");

    const profitableDays = recent.filter((e) => Number(e.profit) > 0).length;
    const lossDays = recent.filter((e) => Number(e.profit) < 0).length;

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : null;
      return Math.round(((curr - prev) / Math.abs(prev)) * 100);
    };

    const sortedDesc = [...recent].sort((a, b) => (a.date < b.date ? 1 : -1));
    let profitStreak = 0;
    for (const e of sortedDesc) {
      if (Number(e.profit) > 0) profitStreak++;
      else break;
    }

    return {
      today: todayStr,
      days_logged_recent: recent.length,
      days_logged_prior: prior.length,
      recent_7d: {
        revenue: recentRevenue,
        expenses: recentExpenses,
        profit: recentProfit,
        profitable_days: profitableDays,
        loss_days: lossDays,
        profit_streak: profitStreak,
      },
      prior_7d: {
        revenue: priorRevenue,
        expenses: priorExpenses,
        profit: priorProfit,
      },
      trend: {
        revenue_change_pct: pctChange(recentRevenue, priorRevenue),
        expenses_change_pct: pctChange(recentExpenses, priorExpenses),
        profit_change_pct: pctChange(recentProfit, priorProfit),
      },
      entries: recent,
      guidance:
        "Respond in 2-4 sentences. Reaction first, then summarize profit trend and expense behavior in plain words, then give ONE key insight or nudge. Do not list raw numbers in a table.",
    };
  }

  if (name === "get_inventory") {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("item_name, quantity, unit, unit_price")
      .eq("user_id", userId)
      .order("item_name");
    if (error) return { error: error.message };
    const items: InventoryRow[] = (data ?? []) as InventoryRow[];
    return {
      items,
      low_stock: items.filter((i) => Number(i.quantity) <= 5).map((i) => i.item_name),
    };
  }

  if (name === "set_business_name") {
    const newName = String(args.name).trim();
    const { error } = await supabase
      .from("profiles")
      .update({ business_name: newName })
      .eq("user_id", userId);
    if (error) return { error: error.message };
    return { ok: true, name: newName };
  }

  return { error: `Unknown tool: ${name}` };
}

// ---- Pre-fetch financial context injected before the AI sees the user's message ----
async function buildFinancialContext(
  supabase: DbClient,
  userId: string,
): Promise<string> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_entries")
    .select("date, revenue, expenses, profit")
    .eq("user_id", userId)
    .gte("date", weekAgoStr)
    .order("date", { ascending: true });

  if (error) {
    console.error("buildFinancialContext error:", error);
    return "User financial data: unavailable right now.";
  }

  const entries: DailyEntryRow[] = (data ?? []) as DailyEntryRow[];
  const todayEntry = entries.find((e) => e.date === todayStr);

  const totalRevenue = entries.reduce((s, e) => s + Number(e.revenue || 0), 0);
  const totalExpenses = entries.reduce((s, e) => s + Number(e.expenses || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitableDays = entries.filter((e) => Number(e.profit) > 0).length;
  const lossDays = entries.filter((e) => Number(e.profit) < 0).length;

  const lines: string[] = [];
  lines.push("User financial data (use this as context, do NOT read it back as a list):");

  if (todayEntry) {
    lines.push(
      `- Today (${todayStr}): revenue ${todayEntry.revenue}, expenses ${todayEntry.expenses}, profit ${todayEntry.profit}`,
    );
  } else {
    lines.push(`- Today (${todayStr}): not logged yet`);
  }

  if (entries.length === 0) {
    lines.push("- Last 7 days: no entries yet");
  } else {
    lines.push(
      `- Last 7 days (${entries.length} day${entries.length > 1 ? "s" : ""} logged): revenue ${totalRevenue}, expenses ${totalExpenses}, profit ${totalProfit}, ${profitableDays} profitable day(s), ${lossDays} loss day(s)`,
    );
    const recent = entries.slice(-5).map(
      (e) => `${e.date}: +${e.revenue}/-${e.expenses}=${e.profit}`,
    );
    lines.push(`- Recent entries: ${recent.join("; ")}`);
  }

  lines.push(
    "When the user logs new money this turn, still call log_daily_money so it gets saved (and pass raw_input).",
  );

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Identify the calling user from the JWT (verify_jwt is enabled in config.toml)
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Use service-role client for tool execution; we scope every query by userId explicitly.
    const supabase = adminClient;

    // Pre-fetch the user's recent financial context so the AI always has it,
    // even before deciding to call a tool.
    const financialContext = await buildFinancialContext(supabase, userId);

    const conversation: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: financialContext },
      ...messages,
    ];

    for (let i = 0; i < 4; i++) {
      const aiResp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: conversation,
            tools,
          }),
        },
      );

      if (!aiResp.ok) {
        const status = aiResp.status;
        const text = await aiResp.text();
        console.error("AI gateway error:", status, text);
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Too many requests, please slow down a bit." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({
              error:
                "Out of AI credits. Please add funds in Settings, Workspace, Usage.",
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls as
        | Array<{ id: string; function: { name: string; arguments: string } }>
        | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        return new Response(
          JSON.stringify({ reply: msg.content ?? "" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      conversation.push(msg);

      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }
        const result = await executeTool(supabase, userId, tc.function.name, args);
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(
      JSON.stringify({ reply: "Sorry, I got a bit lost. Can you try again?" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
