import { useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

interface UserResult {
  id: number; username: string; display_name: string;
  avatar_url: string; is_verified: boolean; bio: string;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const data = await api.search(query);
      setResults(data.users || []);
      setSearched(true);
    } catch { void 0; }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Поиск</h1>

      <div className="relative mb-6">
        <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти пользователя..."
          className="pl-10 bg-card"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {!searched ? (
        <div className="text-center py-16">
          <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Введите username для поиска</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <Icon name="UserX" size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Никого не найдено</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {results.map((u) => (
            <Link key={u.id} to={`/user/${u.username}`} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={20} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{u.display_name || u.username}</span>
                  {u.is_verified && <Icon name="BadgeCheck" size={14} className="text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground">@{u.username}</span>
                {u.bio && <p className="text-xs text-muted-foreground mt-1 truncate">{u.bio}</p>}
              </div>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
