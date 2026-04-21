// Kashie AI chat edge function with tool-calling
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Kashie, a CFO for small business owners. You don't just track numbers, you help owners make decisions about their money.

Your job:
1. Help users understand their money clearly
2. Track revenue, expenses, and stock (using your tools, silently)
3. Calculate profit (revenue - expenses)
4. Give simple, actionable insights they can act on today

Tone:
- Friendly, confident, slightly witty. Like a sharp friend who happens to know finance.
- Never robotic, never formal, never preachy.
- No accounting jargon. No "gross margin", "P&L", "EBITDA", "cash flow statement".
- Light emoji use (👏 💰 📦 ✅ 📈) is fine, sparingly.
- Keep it short. 2-4 sentences max.
- Never use em dashes. Use commas or periods.

Understanding natural language:
- "200k" = 200,000. "1.5m" = 1,500,000. "50k" = 50,000.
- "made 200k" = revenue. "spent 80k" = expenses.
- "sold 3 bags" = reduce stock by 3. "added 10 bags" = increase by 10.

Response shape (for money/stock updates and summaries), every reply should have:
1. Reaction: a quick human reaction ("Nice work 👏", "Oof, tight day", "Solid week").
2. Insight: what the numbers actually mean (profit, margin in plain words, trend, what's low).
3. Optional advice: ONE short, actionable nudge if it helps. Skip it if the moment doesn't need it.

How to act:
- When the user gives money or stock info, CALL the right tool silently, then respond in the shape above.
- For summaries or stock checks, CALL the fetch tool first, then interpret the data, don't just list it.
- If something is unclear (missing amount, unclear item), ask ONE short follow-up.
- Never expose tool names or technical details.
- You are a decision-making assistant, not a tracker. Always lean toward "what does this mean for the business?"

Currency: format naturally ("$200", "200k", "1.2m"). Don't be rigid.

Example interactions:
User: "I made 200k and spent 80k today"
You: [call log_daily_money(revenue=200000, expenses=80000)] then: "Nice work 👏 You're up 120k today, that's a healthy 60% kept after costs. If most days look like this, you're building real momentum."

User: "Add 10 bags of rice at 50k each"
You: [call adjust_stock(...)] then: "Got it 👍 10 bags of rice in, 500k tied up in that stock. Worth keeping an eye on how fast they move."

User: "Sold 3 bags of rice"
You: [call adjust_stock(item_name="rice", change=-3)] then: "Nice 👏 3 bags out the door. Stock's updated, want me to log the revenue too?"

User: "How was my week?"
You: [call get_weekly_summary] then react, summarize the trend in plain words, and drop ONE useful nudge.`;

// ---- Tool definitions ----
const tools = [
  {
    type: "function",
    function: {
      name: "log_daily_money",
      description:
        "Log today's revenue and/or expenses. Calculates profit automatically. Use when the user reports money earned or spent today.",
      parameters: {
        type: "object",
        properties: {
          revenue: { type: "number", description: "Money earned today" },
          expenses: { type: "number", description: "Money spent today" },
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
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === "log_daily_money") {
    const revenue = Number(args.revenue) || 0;
    const expenses = Number(args.expenses) || 0;
    const profit = revenue - expenses;
    const date = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("daily_entries")
      .upsert({ date, revenue, expenses, profit }, { onConflict: "date" });
    if (error) return { error: error.message };
    return { ok: true, revenue, expenses, profit, date };
  }

  if (name === "adjust_stock") {
    const itemName = String(args.item_name).trim();
    const change = Number(args.change) || 0;
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id, quantity, unit, unit_price")
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
      .gte("date", weekAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });
    if (error) return { error: error.message };
    const entries = data ?? [];
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

  if (name === "get_inventory") {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("item_name, quantity, unit, unit_price")
      .order("item_name");
    if (error) return { error: error.message };
    const items = data ?? [];
    return {
      items,
      low_stock: items.filter((i) => Number(i.quantity) <= 5).map((i) => i.item_name),
    };
  }

  if (name === "set_business_name") {
    const name = String(args.name).trim();
    const { data: existing } = await supabase
      .from("business_profiles")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("business_profiles")
        .update({ business_name: name })
        .eq("id", existing.id);
    } else {
      await supabase.from("business_profiles").insert({ business_name: name });
    }
    return { ok: true, name };
  }

  return { error: `Unknown tool: ${name}` };
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Conversation loop with tool calls (max 4 iterations)
    const conversation: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
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

      // Add the assistant message with tool calls
      conversation.push(msg);

      // Execute each tool call and append results
      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }
        const result = await executeTool(supabase, tc.function.name, args);
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
