import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickActions from "@/components/QuickActions";
import TypingIndicator from "@/components/TypingIndicator";
import ChatSidebar, { SidebarOpenButton } from "@/components/ChatSidebar";
import { supabase } from "@/integrations/supabase/client";
import { getLowStockGreeting, getTodayEntry, type DailyEntry } from "@/lib/finance";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

type AiMsg = { role: "user" | "assistant"; content: string };

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiHistory, setAiHistory] = useState<AiMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayEntry, setTodayEntry] = useState<DailyEntry | null>(null);
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

  // Show a low-stock alert ONCE, the first time the user sends a message.
  // The visual welcome lives in the empty-state UI below, so we don't push
  // any greeting message into the chat (prevents duplicate-render bug).
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

  const sendToAI = useCallback(
    async (userText: string) => {
      const nextHistory: AiMsg[] = [...aiHistory, { role: "user", content: userText }];
      setIsTyping(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: { messages: nextHistory },
        });
        if (error) {
          // supabase.functions.invoke surfaces non-2xx as error
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

  const handleQuickAction = (action: string) => {
    if (isTyping) return;
    const map: Record<string, string> = {
      log: "I want to log today's money.",
      summary: "Show me my weekly summary.",
      inventory: "Show me my current stock.",
      business_name: "I want to set or change my business name.",
    };
    const text = map[action];
    if (!text) return;
    addMessage(text, "user");
    void sendToAI(text);
  };

  const showEmptyState = messages.length === 0 && !isTyping;

  const examplePrompts = [
    "I made 200k and spent 80k",
    "I spent 50k",
    "Sold 3 items",
  ];

  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNewChat={() => setSidebarOpen(false)}
        history={[]}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-center gap-2 px-4 py-3 border-b border-border/50">
          {!sidebarOpen && (
            <div className="absolute left-3">
              <SidebarOpenButton onClick={() => setSidebarOpen(true)} />
            </div>
          )}
          <h1 className="font-semibold text-sm text-foreground">Kashie</h1>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto w-full px-4 md:px-6">
            {showEmptyState ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center pt-12 pb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-2xl font-semibold mb-5 shadow-lg shadow-primary/20">
                  K
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-1.5">
                  Hey 👋 welcome to Kashie
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  Let's track today's business 👇
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
            <div className="relative flex items-end rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tell me about your day..."
                disabled={isTyping}
                rows={1}
                className="flex-1 resize-none bg-transparent px-4 py-3.5 pr-12 text-[15px] text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 max-h-[200px]"
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:hover:bg-primary"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
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
