import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

interface ProfileData {
  id: number; username: string; display_name: string; bio: string;
  avatar_url: string; is_private: boolean; is_verified: boolean;
  is_admin: boolean; links: Record<string, string>;
  privacy_settings: Record<string, string>; created_at: string;
  followers_count: number; following_count: number; posts_count: number;
  is_following: boolean; is_pending: boolean; is_own: boolean;
  posts: Array<{
    id: number; user_id: number; content: string; image_url: string;
    created_at: string; likes_count: number; comments_count: number;
    reposts_count: number; is_liked: number; is_reposted: number;
  }>;
}

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "followers" | "following" | "friends">("posts");
  const [followList, setFollowList] = useState<Array<{id: number; username: string; display_name: string; avatar_url: string; is_verified: boolean}>>([]);

  const targetUsername = username || user?.username;

  useEffect(() => {
    if (!targetUsername) return;
    setLoading(true);
    api.profile(targetUsername)
      .then((data) => setProfile(data.profile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [targetUsername]);

  useEffect(() => {
    if (!profile || tab === "posts") return;
    api.followList(profile.id, tab)
      .then((data) => setFollowList(data.users || []))
      .catch(() => setFollowList([]));
  }, [tab, profile]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      const data = await api.toggleFollow(profile.id);
      setProfile({
        ...profile,
        is_following: data.following,
        is_pending: data.pending || false,
        followers_count: data.following ? profile.followers_count + 1 : profile.followers_count - 1
      });
    } catch { void 0; }
  };

  const handleBlock = async () => {
    if (!profile) return;
    try {
      await api.toggleBlock(profile.id);
    } catch { void 0; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center py-20">
        <Icon name="UserX" size={48} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Пользователь не найден</p>
      </div>
    );
  }

  const linkIcons: Record<string, string> = {
    telegram: "Send", instagram: "Instagram", tiktok: "Music2", youtube: "Youtube", website: "Globe"
  };

  return (
    <div className="max-w-2xl mx-auto p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="h-32 gradient-primary relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-full bg-card border-4 border-card overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <Icon name="User" size={36} className="text-primary" />
              )}
            </div>
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
                {profile.is_verified && <Icon name="BadgeCheck" size={18} className="text-primary" />}
                {profile.is_admin && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>}
              </div>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
            </div>
            {user && !profile.is_own && (
              <div className="flex gap-2">
                <Button
                  onClick={handleFollow}
                  variant={profile.is_following ? "secondary" : "default"}
                  size="sm"
                >
                  {profile.is_pending ? "Ожидание" : profile.is_following ? "Отписаться" : "Подписаться"}
                </Button>
                <Button onClick={handleBlock} variant="ghost" size="sm">
                  <Icon name="Ban" size={14} />
                </Button>
              </div>
            )}
            {profile.is_own && (
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  <Icon name="Pencil" size={14} className="mr-1" />
                  Редактировать
                </Button>
              </Link>
            )}
          </div>

          {profile.links && Object.keys(profile.links).some(k => profile.links[k]) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {Object.entries(profile.links).filter(([, v]) => v).map(([key, val]) => (
                <a key={key} href={val} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-all">
                  <Icon name={linkIcons[key] || "Link"} size={12} />
                  {key}
                </a>
              ))}
            </div>
          )}

          <div className="flex gap-6 mt-4 pt-4 border-t border-border">
            <button onClick={() => setTab("posts")} className={`text-center ${tab === "posts" ? "text-foreground" : "text-muted-foreground"}`}>
              <div className="text-lg font-bold">{profile.posts_count}</div>
              <div className="text-xs">Постов</div>
            </button>
            <button onClick={() => setTab("followers")} className={`text-center ${tab === "followers" ? "text-foreground" : "text-muted-foreground"}`}>
              <div className="text-lg font-bold">{profile.followers_count}</div>
              <div className="text-xs">Подписчиков</div>
            </button>
            <button onClick={() => setTab("following")} className={`text-center ${tab === "following" ? "text-foreground" : "text-muted-foreground"}`}>
              <div className="text-lg font-bold">{profile.following_count}</div>
              <div className="text-xs">Подписок</div>
            </button>
            <button onClick={() => setTab("friends")} className={`text-center ${tab === "friends" ? "text-foreground" : "text-muted-foreground"}`}>
              <div className="text-xs">Друзья</div>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {tab === "posts" && profile.posts.map((post) => (
          <PostCard
            key={post.id}
            post={{
              ...post,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              is_verified: profile.is_verified,
            }}
          />
        ))}
        {tab !== "posts" && followList.map((u) => (
          <Link key={u.id} to={`/user/${u.username}`} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={18} className="text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm">{u.display_name || u.username}</span>
                {u.is_verified && <Icon name="BadgeCheck" size={12} className="text-primary" />}
              </div>
              <span className="text-xs text-muted-foreground">@{u.username}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
