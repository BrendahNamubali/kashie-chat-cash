interface ChatMessageProps {
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const ChatMessage = ({ content, sender, timestamp }: ChatMessageProps) => {
  const isUser = sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-3 ${
          isUser ? "chat-bubble-user" : "chat-bubble-bot"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isUser ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
