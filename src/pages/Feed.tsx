import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";

interface Post {
  id: number; user_id: number; content: string; image_url: string;
  created_at: string; username: string; display_name: string; avatar_url: string;
  is_verified: boolean; likes_count: number; comments_count: number;
  reposts_count: number; is_liked: number; is_reposted: number;
}

interface Story {
  id: number; user_id: number; image_url: string; username: string;
  display_name: string; avatar_url: string; is_verified: boolean;
  created_at: string; expires_at: string;
}

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const [feedData, storiesData] = await Promise.all([
        api.feed(1),
        api.getStories()
      ]);
      setPosts(feedData.posts || []);
      setStories(storiesData.stories || []);
    } catch { void 0; } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      await api.createPost(newPost);
      setNewPost("");
      setShowComposer(false);
      loadFeed();
    } catch { void 0; } finally {
      setPosting(false);
    }
  };

  const groupedStories = stories.reduce<Record<number, Story[]>>((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = [];
    acc[s.user_id].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Лента</h1>
        {!user && (
          <Link to="/auth">
            <Button size="sm" variant="outline">
              <Icon name="LogIn" size={14} className="mr-1.5" />
              Войти
            </Button>
          </Link>
        )}
      </div>

      {Object.keys(groupedStories).length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-none">
          {Object.values(groupedStories).map((userStories) => {
            const s = userStories[0];
            return (
              <button
                key={s.user_id}
                onClick={() => setViewingStory(s)}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div className="w-16 h-16 rounded-full story-ring p-0.5">
                  <div className="w-full h-full rounded-full bg-card overflow-hidden p-0.5">
                    <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={20} className="text-primary" />}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-16 text-center">{s.display_name || s.username}</span>
              </button>
            );
          })}
        </div>
      )}

      {viewingStory && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setViewingStory(null)}>
          <div className="max-w-md w-full max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 p-3 text-white">
              <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                {viewingStory.avatar_url ? <img src={viewingStory.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={14} />}
              </div>
              <span className="text-sm font-medium">{viewingStory.display_name || viewingStory.username}</span>
              <button onClick={() => setViewingStory(null)} className="ml-auto"><Icon name="X" size={20} /></button>
            </div>
            <img src={viewingStory.image_url} className="w-full rounded-xl" />
          </div>
        </div>
      )}

      {user && (
        <div className="mb-6">
          {!showComposer ? (
            <button
              onClick={() => setShowComposer(true)}
              className="w-full bg-card border border-border rounded-2xl p-4 text-left text-muted-foreground hover:border-primary/30 transition-all flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={16} className="text-primary" />}
              </div>
              <span className="text-sm">Что нового?</span>
            </button>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-4 animate-fade-in">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={16} className="text-primary" />}
                </div>
                <div className="flex-1">
                  <Textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Что нового?"
                    className="min-h-[80px] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => { setShowComposer(false); setNewPost(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Отмена
                </button>
                <Button size="sm" onClick={handlePost} disabled={posting || !newPost.trim()}>
                  {posting ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Опубликовать"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Icon name="Loader2" size={24} className="animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Пока нет постов</p>
          {!user && <p className="text-sm text-muted-foreground mt-1">Войдите, чтобы начать публиковать</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onRemove={loadFeed} />
          ))}
        </div>
      )}
    </div>
  );
}
