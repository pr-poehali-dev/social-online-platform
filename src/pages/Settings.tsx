import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const themes = [
  { id: "dark-green", name: "Тёмно-зелёная", colors: "from-emerald-900 to-emerald-950" },
  { id: "dark-blue", name: "Тёмно-синяя", colors: "from-blue-900 to-blue-950" },
  { id: "crystal", name: "Кристальная", colors: "from-sky-200 to-blue-100" },
  { id: "white-yellow", name: "Бело-жёлтая", colors: "from-yellow-200 to-amber-100" },
];

const privacyOptions = [
  { key: "show_likes", label: "Кто видит мои лайки" },
  { key: "show_reposts", label: "Кто видит мои репосты" },
  { key: "show_followers", label: "Кто видит подписчиков" },
  { key: "show_following", label: "Кто видит подписки" },
  { key: "show_friends", label: "Кто видит друзей" },
];

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [isPrivate, setIsPrivate] = useState(user?.is_private || false);
  const [messagesEnabled, setMessagesEnabled] = useState(user?.messages_enabled !== false);
  const [links, setLinks] = useState<Record<string, string>>(
    typeof user?.links === "object" ? (user.links as Record<string, string>) : {}
  );
  const [privacy, setPrivacy] = useState<Record<string, string>>(
    typeof user?.privacy_settings === "object" ? (user.privacy_settings as Record<string, string>) : {}
  );
  const [theme, setTheme] = useState(user?.theme || "dark-green");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        display_name: displayName,
        bio,
        is_private: isPrivate,
        messages_enabled: messagesEnabled,
        links,
        privacy_settings: privacy,
        theme,
      });
      document.documentElement.setAttribute("data-theme", theme);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { void 0; } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = await api.upload(reader.result as string, "avatar", file.type);
        await api.updateProfile({ avatar_url: data.url });
        await refreshUser();
      } catch { void 0; }
    };
    reader.readAsDataURL(file);
  };

  const handleVerificationRequest = async () => {
    try {
      await api.requestVerification();
      alert("Заявка отправлена!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      <div className="space-y-6">
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="User" size={18} className="text-primary" />
            Профиль
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={24} className="text-primary" />}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer">
                  <Icon name="Camera" size={12} className="text-primary-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium">@{user?.username}</p>
                <p className="text-xs text-muted-foreground">Username нельзя изменить</p>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Имя</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">О себе</label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-secondary/50 resize-none" rows={3} />
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="Link" size={18} className="text-primary" />
            Ссылки
          </h2>
          <div className="space-y-3">
            {["telegram", "instagram", "tiktok", "youtube", "website"].map((key) => (
              <div key={key}>
                <label className="text-sm text-muted-foreground mb-1 block capitalize">{key}</label>
                <Input
                  value={links[key] || ""}
                  onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
                  placeholder={`Ссылка на ${key}`}
                  className="bg-secondary/50"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="Palette" size={18} className="text-primary" />
            Тема оформления
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  theme === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                }`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.colors}`} />
                <span className="text-sm">{t.name}</span>
                {theme === t.id && <Icon name="Check" size={14} className="text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="Lock" size={18} className="text-primary" />
            Приватность
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Приватный аккаунт</p>
                <p className="text-xs text-muted-foreground">Нужно одобрять подписчиков</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Принимать сообщения</p>
                <p className="text-xs text-muted-foreground">Разрешить писать вам</p>
              </div>
              <Switch checked={messagesEnabled} onCheckedChange={setMessagesEnabled} />
            </div>
            {privacyOptions.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between">
                <span className="text-sm">{opt.label}</span>
                <select
                  value={privacy[opt.key] || "all"}
                  onChange={(e) => setPrivacy({ ...privacy, [opt.key]: e.target.value })}
                  className="text-sm bg-secondary/50 border border-border rounded-lg px-2 py-1"
                >
                  <option value="all">Все</option>
                  <option value="followers">Подписчики</option>
                  <option value="friends">Друзья</option>
                  <option value="nobody">Никто</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Icon name="BadgeCheck" size={18} className="text-primary" />
            Верификация
          </h2>
          <p className="text-sm text-muted-foreground mb-3">Подайте заявку на верификацию профиля</p>
          <Button onClick={handleVerificationRequest} variant="outline" size="sm">
            Подать заявку
          </Button>
        </section>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-2" /> : saved ? <Icon name="Check" size={14} className="mr-2" /> : null}
            {saved ? "Сохранено!" : "Сохранить"}
          </Button>
          <Button onClick={logout} variant="destructive">
            <Icon name="LogOut" size={14} className="mr-1" />
            Выйти
          </Button>
        </div>
      </div>
    </div>
  );
}
