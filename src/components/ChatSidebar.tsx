import { MessageSquarePlus, PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
import type { Profile } from "@/lib/finance";

interface ChatSidebarProps {
  open: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSignOut?: () => void;
  profile?: Profile | null;
  history: { id: string; title: string }[];
}

const ChatSidebar = ({ open, onToggle, onNewChat, onSignOut, profile, history }: ChatSidebarProps) => {
  const initial =
    profile?.business_name?.trim()?.charAt(0)?.toUpperCase() ??
    profile?.full_name?.trim()?.charAt(0)?.toUpperCase() ??
    "K";

  return (
    <>
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={onToggle}
          className="md:hidden fixed inset-0 bg-foreground/20 z-30"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 ${
          open ? "w-64" : "w-0 md:w-0 overflow-hidden"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
          <span className="font-semibold text-sm text-sidebar-foreground">Chats</span>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
            aria-label="Hide sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
          <p className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Recent
          </p>
          {history.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No chats yet</p>
          ) : (
            <ul className="space-y-0.5">
              {history.map((h) => (
                <li key={h.id}>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent truncate">
                    {h.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(profile || onSignOut) && (
          <div className="p-2 border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.business_name ?? profile?.full_name ?? "Kashie"}
                </p>
                {profile?.full_name && profile?.business_name && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {profile.full_name}
                  </p>
                )}
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export const SidebarOpenButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="p-2 rounded-md hover:bg-accent text-foreground"
    aria-label="Open sidebar"
  >
    <PanelLeft className="w-4 h-4" />
  </button>
);

export default ChatSidebar;
