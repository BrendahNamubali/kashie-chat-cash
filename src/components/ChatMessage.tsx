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
      <div className="flex-1 chat-bubble-bot pt-0.5">
        <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
