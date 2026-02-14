import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Post {
  id: number;
  user_id: number;
  content: string;
  image_url: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified: boolean;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  is_liked: number;
  is_reposted: number;
}

interface PostCardProps {
  post: Post;
  onRemove?: () => void;
}

export default function PostCard({ post, onRemove }: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.is_liked > 0);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [reposted, setReposted] = useState(post.is_reposted > 0);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: number; content: string; username: string; display_name: string;
    avatar_url: string; is_verified: boolean; created_at: string;
    likes_count: number; is_liked: number; liked_by_author: boolean; parent_id: number | null;
  }>>([]);
  const [commentText, setCommentText] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    try {
      const data = await api.toggleLike(post.id);
      setLiked(data.liked);
      setLikesCount((p) => data.liked ? p + 1 : p - 1);
    } catch { void 0; }
  };

  const handleRepost = async () => {
    if (!user) return;
    try {
      const data = await api.toggleRepost(post.id);
      setReposted(data.reposted);
      setRepostsCount((p) => data.reposted ? p + 1 : p - 1);
    } catch { void 0; }
  };

  const loadComments = async () => {
    try {
      const data = await api.getComments(post.id);
      setComments(data.comments || []);
    } catch { void 0; }
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    try {
      await api.addComment(post.id, commentText);
      setCommentText("");
      loadComments();
    } catch { void 0; }
  };

  const handleRemove = async () => {
    try {
      await api.removePost(post.id);
      onRemove?.();
    } catch { void 0; }
    setShowMenu(false);
  };

  const handleReport = async () => {
    try {
      await api.report("Неприемлемый контент", undefined, post.id);
    } catch { void 0; }
    setShowMenu(false);
  };

  const timeAgo = (date: string) => {
    const now = Date.now();
    const d = new Date(date).getTime();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "сейчас";
    if (diff < 3600) return `${Math.floor(diff / 60)}м`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
    return `${Math.floor(diff / 86400)}д`;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <Link to={`/user/${post.username}`}>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {post.avatar_url ? (
              <img src={post.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <Icon name="User" size={18} className="text-primary" />
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/user/${post.username}`} className="font-semibold text-sm hover:underline truncate">
              {post.display_name || post.username}
            </Link>
            {post.is_verified && <Icon name="BadgeCheck" size={14} className="text-primary shrink-0" />}
            <span className="text-xs text-muted-foreground">@{post.username}</span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">{timeAgo(post.created_at)}</span>
          </div>
          {post.content && <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{post.content}</p>}
          {post.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              <img src={post.image_url} className="w-full max-h-96 object-cover" />
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-muted-foreground hover:text-foreground">
            <Icon name="MoreHorizontal" size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-popover border border-border rounded-lg shadow-lg py-1 w-44 z-10">
              {user && (user.id === post.user_id || user.is_admin) && (
                <button onClick={handleRemove} className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-destructive flex items-center gap-2">
                  <Icon name="Trash2" size={14} />
                  Удалить
                </button>
              )}
              {user && user.id !== post.user_id && (
                <button onClick={handleReport} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2">
                  <Icon name="Flag" size={14} />
                  Пожаловаться
                </button>
              )}
              <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-muted-foreground">
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
            liked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <Icon name={liked ? "Heart" : "Heart"} size={16} />
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-all"
        >
          <Icon name="MessageCircle" size={16} />
          {post.comments_count > 0 && <span>{post.comments_count}</span>}
        </button>
        <button
          onClick={handleRepost}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
            reposted ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <Icon name="Repeat2" size={16} />
          {repostsCount > 0 && <span>{repostsCount}</span>}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {comments.map((c) => (
            <div key={c.id} className={`flex gap-2 ${c.parent_id ? "ml-8" : ""}`}>
              <Link to={`/user/${c.username}`}>
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={12} className="text-primary" />}
                </div>
              </Link>
              <div className="flex-1 bg-secondary/50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold">{c.display_name || c.username}</span>
                  {c.is_verified && <Icon name="BadgeCheck" size={10} className="text-primary" />}
                  {c.liked_by_author && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Автор</span>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-xs mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          {user && (
            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать комментарий..."
                className="text-sm bg-secondary/50"
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
              />
              <Button size="sm" onClick={handleComment} disabled={!commentText.trim()}>
                <Icon name="Send" size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
