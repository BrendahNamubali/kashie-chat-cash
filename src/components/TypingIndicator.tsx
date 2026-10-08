import KashieLogo from "@/components/KashieLogo";

const TypingIndicator = () => (
  <div role="status" aria-label="Kashie is thinking" className="motion-enter flex justify-start mb-6 gap-3">
    <div aria-hidden="true" className="kashie-thinking-mark w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
      <KashieLogo variant="icon" className="size-7" />
    </div>
    <div aria-hidden="true" className="kashie-thinking flex items-center h-7 gap-1.5">
      <span className="kashie-thinking-bar" />
      <span className="kashie-thinking-bar" />
      <span className="kashie-thinking-bar" />
    </div>
    <span className="sr-only">Kashie is thinking</span>
  </div>
);

export default TypingIndicator;
