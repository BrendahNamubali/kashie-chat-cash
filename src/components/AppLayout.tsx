import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageSquare, FileText, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/reports", label: "Reports", icon: FileText },
];

const AppLayout = ({ children }: Props) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm shadow-primary/30">
            K
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-sidebar-foreground">Kashie</p>
            <p className="text-[10px] text-muted-foreground">AI CFO</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => {
              signOut();
              navigate("/auth");
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
            K
          </div>
          <p className="text-sm font-semibold">Kashie</p>
        </div>
        <button
          onClick={() => {
            signOut();
            navigate("/auth");
          }}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border flex">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
