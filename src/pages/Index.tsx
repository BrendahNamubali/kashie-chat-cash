import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickActions from "@/components/QuickActions";
import TypingIndicator from "@/components/TypingIndicator";
import {
  saveEntry,
  getProfitMessage,
  getWeeklySummaryMessage,
  getBusinessName,
  saveBusinessName,
  upsertInventoryItem,
  getInventorySummaryMessage,
  getLowStockGreeting,
} from "@/lib/finance";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

type ConversationState =
  | "idle"
  | "awaiting_revenue"
  | "awaiting_expenses"
  | "awaiting_business_name"
  | "awaiting_item_name"
  | "awaiting_item_quantity"
  | "awaiting_item_unit";

const WELCOME = `Hey there! 👋 I'm Kashie, your friendly finance buddy.\n\nI help you keep track of your daily business money, no complicated stuff, just clear and simple.\n\nTap a button below or type to get started.`;

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", content: WELCOME, sender: "bot", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ConversationState>("idle");
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [pendingItemName, setPendingItemName] = useState("");
  const [pendingItemQty, setPendingItemQty] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Greet with business name + low stock alerts on load
  useEffect(() => {
    (async () => {
      const [name, lowStockMsg] = await Promise.all([
        getBusinessName(),
        getLowStockGreeting(),
      ]);
      if (name) {
        addMessage(`Welcome back! Great to see ${name} doing business today 😊`, "bot");
      }
      if (lowStockMsg) {
        setTimeout(() => addMessage(lowStockMsg, "bot"), 500);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMessage = (content: string, sender: "user" | "bot") => {
    const msg: Message = {
      id: Date.now().toString() + Math.random(),
      content,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const botReply = (content: string, delay = 600) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage(content, "bot");
    }, delay);
  };

  const botReplyAsync = (fn: () => Promise<string>, delay = 600) => {
    setIsTyping(true);
    setTimeout(async () => {
      const content = await fn();
      setIsTyping(false);
      addMessage(content, "bot");
    }, delay);
  };

  const parseNumber = (text: string): number | null => {
    const cleaned = text.replace(/[$,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) || num < 0 ? null : num;
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    addMessage(text, "user");

    if (state === "awaiting_revenue") {
      const num = parseNumber(text);
      if (num === null) {
        botReply("Hmm, I didn't catch that. Can you type a number? Like 500 or $1,200");
        return;
      }
      setPendingRevenue(num);
      setState("awaiting_expenses");
      botReply(`Got it, you made $${num.toLocaleString()} today! 💰\n\nStep 2 of 2: Now, how much did you spend today? (e.g. 200 or $350)`);
      return;
    }

    if (state === "awaiting_expenses") {
      const num = parseNumber(text);
      if (num === null) {
        botReply("I need a number for expenses. Just type something like 200 or $350.");
        return;
      }
      const revenue = pendingRevenue;
      const expenses = num;
      const profit = revenue - expenses;
      const today = new Date().toISOString().split("T")[0];

      saveEntry({ date: today, revenue, expenses, profit });
      setState("idle");
      botReply(getProfitMessage(profit, revenue, expenses), 800);
      return;
    }

    if (state === "awaiting_business_name") {
      saveBusinessName(text);
      setState("idle");
      botReply(`Love it! I'll remember "${text}" from now on 🏪`);
      return;
    }

    if (state === "awaiting_item_name") {
      setPendingItemName(text);
      setState("awaiting_item_quantity");
      botReply(`Got it, "${text}". How many do you have in stock right now?`);
      return;
    }

    if (state === "awaiting_item_quantity") {
      const num = parseNumber(text);
      if (num === null) {
        botReply("I need a number for the quantity. Like 50 or 120.");
        return;
      }
      setPendingItemQty(num);
      setState("awaiting_item_unit");
      botReply(`${num} of those, got it! What's the unit? (e.g. pieces, kg, boxes, liters)`);
      return;
    }

    if (state === "awaiting_item_unit") {
      const unit = text.toLowerCase();
      upsertInventoryItem({ item_name: pendingItemName, quantity: pendingItemQty, unit });
      setState("idle");
      botReply(`Done! Updated "${pendingItemName}" to ${pendingItemQty} ${unit} 📦\n\n💡 I'll warn you when stock gets low. You can check anytime with "Update stock".`);
      return;
    }

    // Idle state — detect intent
    const lower = text.toLowerCase();
    if (lower.includes("log") || lower.includes("today") || lower.includes("record") || lower.includes("add money")) {
      handleQuickAction("log");
    } else if (lower.includes("summary") || lower.includes("week") || lower.includes("report")) {
      handleQuickAction("summary");
    } else if (lower.includes("stock") || lower.includes("inventory") || lower.includes("item")) {
      handleQuickAction("inventory");
    } else if (lower.includes("business") || lower.includes("name") || lower.includes("shop")) {
      handleQuickAction("business_name");
    } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      botReply("Hey! 😊 Ready to check on your money today? Tap a button below or tell me what you need.");
    } else {
      botReply("I can help you log money, show your weekly summary, update stock, or set your business name. Tap a button below or just tell me what you'd like to do.");
    }
  };

  // placeholder to keep diff clean
  };

  const handleQuickAction = (action: string) => {
    if (isTyping) return;
    if (action === "log") {
      addMessage("Log today's money", "user");
      setState("awaiting_revenue");
      botReply("Awesome! Let's do this 💪\n\nStep 1 of 2: How much did you earn today?\n(Just type the amount, like 500 or $1,200)");
    } else if (action === "summary") {
      addMessage("Weekly summary", "user");
      botReplyAsync(() => getWeeklySummaryMessage());
    } else if (action === "inventory") {
      addMessage("Update stock", "user");
      botReplyAsync(async () => {
        const summary = await getInventorySummaryMessage();
        setState("awaiting_item_name");
        return summary + "\n\nWhat item would you like to update? Type the item name.";
      });
    } else if (action === "business_name") {
      addMessage("My business", "user");
      setState("awaiting_business_name");
      botReplyAsync(async () => {
        const current = await getBusinessName();
        if (current) {
          return `Your business is currently saved as "${current}" 🏪\n\nWant to change it? Just type the new name.`;
        }
        return "What's the name of your business? I'd love to know! 🏪";
      });
    }
  };

  const getPlaceholder = () => {
    if (state === "awaiting_revenue") return "Type your revenue amount...";
    if (state === "awaiting_expenses") return "Type your expenses amount...";
    if (state === "awaiting_business_name") return "Type your business name...";
    if (state === "awaiting_item_name") return "Type item name...";
    if (state === "awaiting_item_quantity") return "Type quantity...";
    if (state === "awaiting_item_unit") return "Type unit (e.g. pieces, kg)...";
    return "Type a message...";
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground shadow-md">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-lg font-bold">
          K
        </div>
        <div>
          <h1 className="font-semibold text-base">Kashie</h1>
          <p className="text-xs opacity-80">
            {isTyping ? "typing..." : "Your finance friend"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            content={msg.content}
            sender={msg.sender}
            timestamp={msg.timestamp}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick Actions */}
      {state === "idle" && !isTyping && (
        <QuickActions onAction={handleQuickAction} />
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-card">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={getPlaceholder()}
          disabled={isTyping}
          className="flex-1 px-4 py-2.5 rounded-full bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isTyping}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Index;
