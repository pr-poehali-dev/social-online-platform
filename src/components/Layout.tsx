import { Link, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const navItems = [
  { path: "/", icon: "Home", label: "Лента" },
  { path: "/search", icon: "Search", label: "Поиск", auth: true },
  { path: "/messages", icon: "MessageCircle", label: "Сообщения", auth: true },
  { path: "/notifications", icon: "Bell", label: "Уведомления", auth: true },
  { path: "/profile", icon: "User", label: "Профиль", auth: true },
  { path: "/settings", icon: "Settings", label: "Настройки", auth: true },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const data = await api.notifications();
        const unread = data.notifications?.filter((n: { is_read: boolean }) => !n.is_read).length || 0;
        setUnreadCount(unread);
      } catch { void 0; }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const filteredNav = navItems.filter((item) => !item.auth || user);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 p-4 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 px-3 py-4 mb-4">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
            <Icon name="Globe" size={20} className="text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Online</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {filteredNav.map((item) => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon name={item.icon} size={20} />
                  {item.path === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user?.is_admin && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                location.pathname === "/admin" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon name="Shield" size={20} />
              <span>Админ</span>
            </Link>
          )}
        </nav>

        {user && (
          <Link to={`/user/${user.username}`} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-all mt-2 border-t border-border pt-4">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={18} className="text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-1">
                {user.display_name || user.username}
                {user.is_verified && <Icon name="BadgeCheck" size={14} className="text-primary shrink-0" />}
              </div>
              <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
            </div>
          </Link>
        )}
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border flex justify-around py-2">
        {filteredNav.slice(0, 5).map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-0.5 p-1.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <div className="relative">
                <Icon name={item.icon} size={20} />
                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                    {unreadCount > 9 ? "+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 min-h-screen pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}