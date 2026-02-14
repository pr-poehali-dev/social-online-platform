import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Chat {
  user: { id: number; username: string; display_name: string; avatar_url: string; is_verified: boolean };
  last_message: { content: string; created_at: string; sender_id: number };
  unread_count: number;
}

interface Message {
  id: number; sender_id: number; receiver_id: number; content: string;
  is_read: boolean; reply_to_id: number | null; is_pinned: boolean;
  edited_at: string | null; created_at: string; sender_username: string;
  sender_name: string; sender_avatar: string;
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: Message; x: number; y: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getChats().then((d) => setChats(d.chats || [])).catch(() => void 0);
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const load = () => {
      api.getMessages(selectedChat.user.id)
        .then((d) => setMessages(d.messages || []))
        .catch(() => void 0);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async () => {
    if (!msgText.trim() || !selectedChat) return;
    try {
      await api.sendMessage(selectedChat.user.id, msgText, replyTo?.id);
      setMsgText("");
      setReplyTo(null);
      const d = await api.getMessages(selectedChat.user.id);
      setMessages(d.messages || []);
    } catch { void 0; }
  };

  const handleAction = async (action: string, msg?: Message) => {
    if (!msg && !selectedChat) return;
    try {
      if (action === "pin" && msg) await api.messageAction("pin", msg.id);
      if (action === "edit" && msg) {
        const newContent = prompt("Новый текст:", msg.content);
        if (newContent) await api.messageAction("edit", msg.id, newContent);
      }
      if (action === "hide" && msg) await api.messageAction("hide", msg.id);
      if (action === "clear" && selectedChat) await api.messageAction("clear_chat", undefined, undefined, selectedChat.user.id);
      if (action === "reply" && msg) { setReplyTo(msg); setContextMenu(null); return; }
      if (action === "copy" && msg) { navigator.clipboard.writeText(msg.content); setContextMenu(null); return; }
      setContextMenu(null);
      if (selectedChat) {
        const d = await api.getMessages(selectedChat.user.id);
        setMessages(d.messages || []);
      }
    } catch { void 0; }
  };

  const timeStr = (d: string) => new Date(d).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });

  if (!selectedChat) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Сообщения</h1>
        {chats.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="MessageCircle" size={48} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Нет сообщений</p>
            <p className="text-xs text-muted-foreground mt-1">Найдите кого-нибудь и напишите первым</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.user.id}
                onClick={() => setSelectedChat(chat)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                  {chat.user.avatar_url ? <img src={chat.user.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={20} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm">{chat.user.display_name || chat.user.username}</span>
                      {chat.user.is_verified && <Icon name="BadgeCheck" size={12} className="text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{timeStr(chat.last_message.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate pr-2">
                      {chat.last_message.sender_id === user?.id && <span className="text-primary">Вы: </span>}
                      {chat.last_message.content}
                    </p>
                    {chat.unread_count > 0 && (
                      <span className="w-5 h-5 bg-primary rounded-full text-[10px] flex items-center justify-center text-primary-foreground font-bold shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/50">
        <button onClick={() => setSelectedChat(null)} className="p-1">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
          {selectedChat.user.avatar_url ? <img src={selectedChat.user.avatar_url} className="w-full h-full object-cover" /> : <Icon name="User" size={16} className="text-primary" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm">{selectedChat.user.display_name || selectedChat.user.username}</span>
            {selectedChat.user.is_verified && <Icon name="BadgeCheck" size={12} className="text-primary" />}
          </div>
        </div>
        <button onClick={() => handleAction("clear")} className="p-1 text-muted-foreground hover:text-destructive" title="Очистить чат">
          <Icon name="Trash2" size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2" onClick={() => setContextMenu(null)}>
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ msg, x: e.clientX, y: e.clientY }); }}
            >
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                {msg.is_pinned && <div className="text-[10px] opacity-60 mb-0.5 flex items-center gap-1"><Icon name="Pin" size={8} /> Закреплено</div>}
                {msg.reply_to_id && (
                  <div className={`text-[10px] border-l-2 pl-2 mb-1 ${isMine ? "border-primary-foreground/30 opacity-70" : "border-primary/30 text-muted-foreground"}`}>
                    Ответ на сообщение
                  </div>
                )}
                <p className="text-sm">{msg.content}</p>
                <div className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"} flex items-center gap-1 justify-end`}>
                  {msg.edited_at && <span>ред.</span>}
                  {timeStr(msg.created_at)}
                  {isMine && msg.is_read && <Icon name="CheckCheck" size={10} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {contextMenu && (
        <div className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-44" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => handleAction("reply", contextMenu.msg)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"><Icon name="Reply" size={14} /> Ответить</button>
          <button onClick={() => handleAction("copy", contextMenu.msg)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"><Icon name="Copy" size={14} /> Копировать</button>
          {contextMenu.msg.sender_id === user?.id && (
            <button onClick={() => handleAction("edit", contextMenu.msg)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"><Icon name="Pencil" size={14} /> Изменить</button>
          )}
          <button onClick={() => handleAction("pin", contextMenu.msg)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"><Icon name="Pin" size={14} /> {contextMenu.msg.is_pinned ? "Открепить" : "Закрепить"}</button>
          <button onClick={() => handleAction("hide", contextMenu.msg)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-destructive flex items-center gap-2"><Icon name="Trash2" size={14} /> Удалить</button>
        </div>
      )}

      <div className="p-4 border-t border-border bg-card/50">
        {replyTo && (
          <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 mb-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="Reply" size={14} />
              <span className="truncate">{replyTo.content}</span>
            </div>
            <button onClick={() => setReplyTo(null)}><Icon name="X" size={14} /></button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="Сообщение..."
            className="bg-secondary/50"
            onKeyDown={(e) => e.key === "Enter" && sendMsg()}
          />
          <Button onClick={sendMsg} disabled={!msgText.trim()} size="icon">
            <Icon name="Send" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
