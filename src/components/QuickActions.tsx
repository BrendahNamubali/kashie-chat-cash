import { DollarSign, BarChart3, Package, Store } from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
  disabled?: boolean;
}

const QuickActions = ({ onAction, disabled }: QuickActionsProps) => {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      <button
        onClick={() => onAction("log")}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <DollarSign className="w-4 h-4" />
        Log today's money
      </button>
      <button
        onClick={() => onAction("summary")}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary text-foreground text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
      >
        <BarChart3 className="w-4 h-4" />
        Weekly summary
      </button>
      <button
        onClick={() => onAction("inventory")}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary text-foreground text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
      >
        <Package className="w-4 h-4" />
        Update stock
      </button>
      <button
        onClick={() => onAction("business_name")}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary text-foreground text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
      >
        <Store className="w-4 h-4" />
        My business
      </button>
    </div>
  );
};

export default QuickActions;
