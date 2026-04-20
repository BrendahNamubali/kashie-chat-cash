import { DollarSign, BarChart3, Package, Store } from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
  disabled?: boolean;
}

const actions = [
  { id: "log", label: "Log today's money", icon: DollarSign },
  { id: "summary", label: "Weekly summary", icon: BarChart3 },
  { id: "inventory", label: "Update stock", icon: Package },
  { id: "business_name", label: "My business", icon: Store },
];

const QuickActions = ({ onAction, disabled }: QuickActionsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {actions.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onAction(id)}
          disabled={disabled}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-foreground text-sm hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          {label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
