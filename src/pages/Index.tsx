import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickActions from "@/components/QuickActions";
import {
  saveEntry,
  getProfitMessage,
  getWeeklySummaryMessage,
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
  | "awaiting_expenses";

const WELCOME = `Hey there! 👋 I'm Kashie, your friendly finance buddy.\n\nI help you keep track of your daily business money — no complicated stuff, I promise!\n\nTap a button below or just type to get started.`;

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", content: WELCOME, sender: "bot", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ConversationState>("idle");
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  const botReply = (content: string, delay = 500) => {
    setTimeout(() => addMessage(content, "bot"), delay);
  };

  const parseNumber = (text: string): number | null => {
    const cleaned = text.replace(/[$,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) || num < 0 ? null : num;
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
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
      botReply(`Got it — you made $${num.toLocaleString()} today! 💰\n\nNow, how much did you spend today?`);
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
      botReply(getProfitMessage(profit, revenue, expenses));
      return;
    }

    // Idle state — detect intent
    const lower = text.toLowerCase();
    if (lower.includes("log") || lower.includes("today") || lower.includes("record") || lower.includes("add")) {
      handleQuickAction("log");
    } else if (lower.includes("summary") || lower.includes("week") || lower.includes("report")) {
      handleQuickAction("summary");
    } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      botReply("Hey! 😊 Ready to check on your money today? Tap a button below or just tell me what you need!");
    } else {
      botReply("I can help you log today's money or show your weekly summary! Just tap one of the buttons below, or type what you'd like to do. 😊");
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === "log") {
      addMessage("Log today's money", "user");
      setState("awaiting_revenue");
      botReply("Awesome! Let's do this 💪\n\nHow much did you make today? (Just type the amount, like 500 or $1,200)");
    } else if (action === "summary") {
      addMessage("Weekly summary", "user");
      botReply(getWeeklySummaryMessage());
    }
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
          <p className="text-xs opacity-80">Your finance friend</p>
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
        <div ref={bottomRef} />
      </div>

      {/* Quick Actions */}
      {state === "idle" && (
        <QuickActions onAction={handleQuickAction} />
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-card">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={
            state === "awaiting_revenue"
              ? "Enter today's revenue..."
              : state === "awaiting_expenses"
              ? "Enter today's expenses..."
              : "Type a message..."
          }
          className="flex-1 px-4 py-2.5 rounded-full bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleSend}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Index;
