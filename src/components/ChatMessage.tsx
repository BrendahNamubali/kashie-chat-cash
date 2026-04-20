import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const ChatMessage = ({ content, sender }: ChatMessageProps) => {
  const isUser = sender === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[85%] chat-bubble-user">
          <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 gap-3">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
        K
      </div>
      <div className="flex-1 chat-bubble-bot pt-0.5 text-[15px] leading-relaxed prose-kashie">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            code: ({ children }) => (
              <code className="px-1 py-0.5 rounded bg-muted text-foreground text-[13px]">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;
