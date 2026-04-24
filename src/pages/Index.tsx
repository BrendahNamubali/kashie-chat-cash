import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, LogOut } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";
import ChatSidebar, { SidebarOpenButton } from "@/components/ChatSidebar";
import { supabase } from "@/integrations/supabase/client";
import { getLowStockGreeting, getTodayEntry, getProfile, getRecentEntries, type DailyEntry, type Profile } from "@/lib/finance";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

type AiMsg = { role: "user" | "assistant"; content: string };

const firstName = (full?: string | null) => {
  if (!full) return null;
  return full.trim().split(/\s+/)[0] || null;
};

// Compact money: 200000 -> "200k", 1500000 -> "1.5m"
const compactMoney = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}m`;
  }
  if (abs >= 1_000) {
    const v = n / 1_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}k`;
  }
  return `${n}`;
};

const labelForDate = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const Index = () => {
  const { signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiHistory, setAiHistory] = useState<AiMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayEntry, setTodayEntry] = useState<DailyEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<DailyEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    autoGrow();
  }, [input, autoGrow]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Load profile once
  useEffect(() => {
    void getProfile().then(setProfile);
  }, []);

  const addMessage = useCallback((content: string, sender: "user" | "bot") => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random(),
        content,
        sender,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const lowStockShownRef = useRef(false);
  useEffect(() => {
    if (lowStockShownRef.current) return;
    if (messages.length === 0) return;
    lowStockShownRef.current = true;
    (async () => {
      const lowStockMsg = await getLowStockGreeting();
      if (lowStockMsg) addMessage(lowStockMsg, "bot");
    })();
  }, [messages.length, addMessage]);

  useEffect(() => {
    if (isTyping) return;
    void getTodayEntry().then(setTodayEntry);
    void getRecentEntries(7).then(setRecentEntries);
  }, [isTyping, messages.length]);

  const sendToAI = useCallback(
    async (userText: string) => {
      const nextHistory: AiMsg[] = [...aiHistory, { role: "user", content: userText }];
      setIsTyping(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: { messages: nextHistory },
        });
        if (error) {
          const msg = error.message || "Something went wrong.";
          if (msg.includes("429")) {
            toast.error("Too many requests, give it a sec and try again.");
          } else if (msg.includes("402")) {
            toast.error("Out of AI credits. Top up in Settings → Workspace → Usage.");
          } else {
            toast.error("Kashie hit a snag. Try again in a moment.");
          }
          addMessage("Hmm, I had trouble thinking just now. Try again?", "bot");
          return;
        }
        const reply = (data?.reply as string) || "Sorry, I didn't catch that.";
        setAiHistory([...nextHistory, { role: "assistant", content: reply }]);
        addMessage(reply, "bot");
      } catch (e) {
        console.error(e);
        toast.error("Network hiccup. Please try again.");
        addMessage("Sorry, I couldn't reach my brain just now. Try again?", "bot");
      } finally {
        setIsTyping(false);
      }
    },
    [aiHistory, addMessage],
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    addMessage(text, "user");
    void sendToAI(text);
  };

  const prefillInput = (template: string, selectionStart: number, selectionLength: number) => {
    if (isTyping) return;
    setInput(template);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selectionStart, selectionStart + selectionLength);
    });
  };

  const sendQuickAction = (text: string) => {
    if (isTyping) return;
    addMessage(text, "user");
    void sendToAI(text);
  };

  const showEmptyState = messages.length === 0 && !isTyping;

  const examplePrompts = [
    "I made 200k and spent 80k",
    "I spent 50k",
    "Sold 3 items",
  ];

  const name = firstName(profile?.full_name);
  const business = profile?.business_name;

  // Greeting line for empty state
  const greetingTitle = name
    ? `Hey ${name} 👋 welcome back`
    : "Hey 👋 welcome to Kashie";
  const greetingSub = business
    ? `Let's track today at ${business} 👇`
    : "Let's track today's business 👇";

  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNewChat={() => setSidebarOpen(false)}
        onSignOut={signOut}
        profile={profile}
        history={[]}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative flex items-center justify-center gap-2 px-4 py-3 border-b border-border/50">
          {!sidebarOpen && (
            <div className="absolute left-3">
              <SidebarOpenButton onClick={() => setSidebarOpen(true)} />
            </div>
          )}
          <div className="flex flex-col items-center leading-tight">
            <h1 className="font-semibold text-sm text-foreground">
              {business ?? "Kashie"}
            </h1>
            {business && (
              <span className="text-[10px] text-muted-foreground">Kashie</span>
            )}
          </div>
          <button
            onClick={signOut}
            className="absolute right-3 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto w-full px-4 md:px-6">
            {showEmptyState ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center pt-12 pb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-2xl font-semibold mb-5 shadow-lg shadow-primary/20">
                  K
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-1.5">
                  {greetingTitle}
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  {greetingSub}
                </p>

                <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-muted/30 p-5 text-left">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Try
                  </p>
                  <ul className="space-y-2.5">
                    {examplePrompts.map((prompt, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => {
                            setInput(prompt);
                            textareaRef.current?.focus();
                          }}
                          className="w-full text-left flex items-start gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors group"
                        >
                          <span className="text-muted-foreground/60 group-hover:text-primary transition-colors mt-px">•</span>
                          <span>{prompt}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick action pills */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-md">
                  <button
                    type="button"
                    onClick={() => prefillInput("I made ___ and spent ___", "I made ".length, 3)}
                    disabled={isTyping}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card hover:bg-accent hover:border-border px-3.5 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <span>💰</span> Log today's money
                  </button>
                  <button
                    type="button"
                    onClick={() => prefillInput("I added ___ items to stock", "I added ".length, 3)}
                    disabled={isTyping}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card hover:bg-accent hover:border-border px-3.5 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <span>📦</span> Log today's stock
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuickAction("How am I doing this week?")}
                    disabled={isTyping}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card hover:bg-accent hover:border-border px-3.5 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <span>📊</span> View summary
                  </button>
                </div>

              </div>
            ) : (
              <div className="py-8 space-y-1">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    content={msg.content}
                    sender={msg.sender}
                    timestamp={msg.timestamp}
                  />
                ))}
                {isTyping && <TypingIndicator />}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-4">
            {/* Today's status indicator */}
            <div className="mb-2 flex items-center px-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Today's status:</span>{" "}
                {todayEntry ? (
                  todayEntry.profit > 0 ? (
                    <span className="text-foreground/80">Profit {compactMoney(todayEntry.profit)} 👏</span>
                  ) : todayEntry.profit < 0 ? (
                    <span className="text-foreground/80">Loss {compactMoney(Math.abs(todayEntry.profit))} 📉</span>
                  ) : (
                    <span className="text-foreground/80">Broke even 👍</span>
                  )
                ) : (
                  <span>Not logged yet 👀</span>
                )}
              </p>
            </div>

            {/* Recent activity — last 5 logs */}
            {recentEntries.length > 0 && (
              <div className="mb-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Recent activity
                </p>
                <ul className="space-y-1">
                  {recentEntries.slice(0, 5).map((e) => (
                    <li
                      key={e.date}
                      className="flex items-center justify-between text-xs text-foreground/70"
                    >
                      <span className="text-muted-foreground">{labelForDate(e.date)}:</span>
                      <span className="tabular-nums">
                        <span className="text-emerald-500">+{compactMoney(e.revenue)}</span>
                        <span className="text-muted-foreground/60 mx-1.5">·</span>
                        <span className="text-rose-500">-{compactMoney(e.expenses)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showEmptyState && !todayEntry && (
              <div className="mb-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Today's snapshot
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Revenue</p>
                    <p className="text-foreground/70 font-medium">—</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Expenses</p>
                    <p className="text-foreground/70 font-medium">—</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Profit</p>
                    <p className="text-foreground/70 font-medium">—</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  No activity yet 👀 let's fix that
                </p>
              </div>
            )}

            {showEmptyState && (
              <button
                onClick={() => {
                  if (isTyping) return;
                  setInput("I made ___ and spent ___");
                  textareaRef.current?.focus();
                  requestAnimationFrame(() => {
                    const el = textareaRef.current;
                    if (!el) return;
                    const pos = "I made ".length;
                    el.setSelectionRange(pos, pos + 3);
                  });
                }}
                disabled={isTyping}
                className="mb-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-medium shadow-md shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <span className="text-base">💰</span>
                Log today's money
              </button>
            )}

            <div className="relative flex items-end rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="e.g. I made 50k and spent 20k"
                disabled={isTyping}
                rows={1}
                className="flex-1 resize-none bg-transparent px-4 py-3.5 pr-14 text-[15px] text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 max-h-[200px]"
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="absolute right-2 bottom-2 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none disabled:hover:bg-primary disabled:active:scale-100"
                aria-label="Send message"
              >
                <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground mt-2">
              Kashie can make mistakes. Double-check important numbers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
