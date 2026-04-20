import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickActions from "@/components/QuickActions";
import TypingIndicator from "@/components/TypingIndicator";
import ChatSidebar, { SidebarOpenButton } from "@/components/ChatSidebar";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessName, getLowStockGreeting } from "@/lib/finance";
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

  // Initial greeting using stored business name + low stock alert
  useEffect(() => {
    (async () => {
      const [name, lowStockMsg] = await Promise.all([
        getBusinessName(),
        getLowStockGreeting(),
      ]);
      const greeting = name
        ? `Hey, welcome back to ${name}! 👋 What's on your mind today?`
        : `Hey there! 👋 I'm Kashie, your friendly finance buddy.\n\nTell me about your day. Made some money? Spent some? Sold something? Just say it naturally.`;
      addMessage(greeting, "bot");
      if (lowStockMsg) {
        setTimeout(() => addMessage(lowStockMsg, "bot"), 600);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const showEmptyState = messages.length <= 1 && !isTyping;

  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNewChat={() => setSidebarOpen(false)}
        history={[]}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          {!sidebarOpen && <SidebarOpenButton onClick={() => setSidebarOpen(true)} />}
          <h1 className="font-semibold text-sm text-foreground">Kashie</h1>
          <span className="text-xs text-muted-foreground ml-1">
            {isTyping ? "thinking..." : "your finance friend"}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8">
            {showEmptyState && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold mb-4">
                  K
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  How can I help today?
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Just tell me about your day in plain words. Like "made 200k and spent 80k" or "sold 3 bags of rice".
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    content={msg.content}
                    sender={msg.sender}
                    timestamp={msg.timestamp}
                  />
                ))}
                {isTyping && <TypingIndicator />}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-4 space-y-3">
            {!isTyping && <QuickActions onAction={handleQuickAction} />}

            <div className="relative flex items-end rounded-3xl border border-border bg-card shadow-sm focus-within:border-ring transition-colors">
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
                className="flex-1 resize-none bg-transparent px-5 py-3.5 pr-12 text-[15px] text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 max-h-[200px]"
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground">
              Kashie can make mistakes. Double-check important numbers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
