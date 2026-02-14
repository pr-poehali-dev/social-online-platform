import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

interface Notif {
  id: number; type: string; content: string; is_read: boolean;
  created_at: string; from_username: string; from_display_name: string;
  from_avatar: string; post_id: number | null;
}

const typeIcons: Record<string, string> = {
  like: "Heart", comment: "MessageCircle", follow: "UserPlus",
  follow_request: "UserPlus", follow_accepted: "UserCheck",
  message: "MessageCircle", repost: "Repeat2",
};

const typeLabels: Record<string, string> = {
  like: "поставил лайк", comment: "прокомментировал", follow: "подписался на вас",
  follow_request: "хочет подписаться", follow_accepted: "принял заявку",
  message: "написал вам", repost: "сделал репост",
};

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.notifications()
      .then((d) => { setNotifs(d.notifications || []); api.readNotifications(); })
      .catch(() => void 0)
      .finally(() => setLoading(false));
  }, []);

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return "сейчас";
    if (diff < 3600) return `${Math.floor(diff / 60)}м`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
    return `${Math.floor(diff / 86400)}д`;
  };

  const handleFollowResponse = async (notifId: number, fromUser: string, action: string) => {
    try {
      const data = await api.followList(0, "pending");
      const req = data.users?.find((u: { username: string; follow_id: number }) => u.username === fromUser);
      if (req) await api.respondFollow(req.follow_id, action);
      setNotifs(notifs.filter(n => n.id !== notifId));
    } catch { void 0; }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Icon name="Loader2" size={24} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Уведомления</h1>
      {notifs.length === 0 ? (
        <div className="text-center py-16">
          <Icon name="Bell" size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Нет уведомлений</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 bg-card border border-border rounded-xl p-3 transition-all ${!n.is_read ? "border-primary/20 bg-primary/5" : ""}`}>
              <Link to={`/user/${n.from_username}`}>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                  {n.from_avatar ? <img src={n.from_avatar} className="w-full h-full object-cover" /> : <Icon name="User" size={18} className="text-primary" />}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={`/user/${n.from_username}`} className="font-semibold hover:underline">{n.from_display_name || n.from_username}</Link>{" "}
                  <span className="text-muted-foreground">{typeLabels[n.type] || n.type}</span>
                </p>
                {n.content && n.type === "comment" && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.content}</p>}
                <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                {n.type === "follow_request" && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleFollowResponse(n.id, n.from_username, "accept")}>Принять</Button>
                    <Button size="sm" variant="secondary" onClick={() => handleFollowResponse(n.id, n.from_username, "reject")}>Отклонить</Button>
                  </div>
                )}
              </div>
              <div className="shrink-0">
                <Icon name={typeIcons[n.type] || "Bell"} size={16} className={n.type === "like" ? "text-red-500" : "text-primary"} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
