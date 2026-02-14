import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

interface Report {
  id: number; reporter_username: string; reported_username: string;
  reported_post_id: number | null; reason: string; created_at: string;
  reported_user_id: number | null;
}

interface VerifRequest {
  id: number; user_id: number; username: string; created_at: string;
}

export default function Admin() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [verifications, setVerifications] = useState<VerifRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reports" | "verifications">("reports");

  useEffect(() => {
    if (!user?.is_admin) return;
    api.adminReports()
      .then((d) => { setReports(d.reports || []); setVerifications(d.verifications || []); })
      .catch(() => void 0)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center py-20">
        <Icon name="ShieldX" size={48} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Нет доступа</p>
      </div>
    );
  }

  const handleReport = async (reportId: number, action: string, userId?: number | null, postId?: number | null) => {
    try {
      if (action === "block" && userId) await api.adminAction("block_user", userId);
      if (action === "remove" && postId) await api.adminAction("remove_post", undefined, postId);
      await api.adminAction("resolve_report", undefined, undefined, reportId);
      setReports(reports.filter((r) => r.id !== reportId));
    } catch { void 0; }
  };

  const handleVerify = async (requestId: number, action: string) => {
    try {
      await api.adminVerify(requestId, action);
      setVerifications(verifications.filter((v) => v.id !== requestId));
    } catch { void 0; }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Icon name="Loader2" size={24} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Icon name="Shield" size={24} className="text-primary" />
        Админ-панель
      </h1>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
        <button onClick={() => setTab("reports")} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tab === "reports" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
          Жалобы ({reports.length})
        </button>
        <button onClick={() => setTab("verifications")} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tab === "verifications" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
          Верификация ({verifications.length})
        </button>
      </div>

      {tab === "reports" && (
        reports.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="CheckCircle" size={48} className="text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Нет жалоб</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm"><span className="text-muted-foreground">От:</span> {r.reporter_username}</p>
                    {r.reported_username && <p className="text-sm"><span className="text-muted-foreground">На:</span> {r.reported_username}</p>}
                    {r.reported_post_id && <p className="text-sm text-muted-foreground">Пост #{r.reported_post_id}</p>}
                    <p className="text-sm mt-2 bg-destructive/10 text-destructive px-2 py-1 rounded">{r.reason}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {r.reported_user_id && (
                    <Button size="sm" variant="destructive" onClick={() => handleReport(r.id, "block", r.reported_user_id)}>
                      <Icon name="Ban" size={12} className="mr-1" /> Заблокировать
                    </Button>
                  )}
                  {r.reported_post_id && (
                    <Button size="sm" variant="secondary" onClick={() => handleReport(r.id, "remove", null, r.reported_post_id)}>
                      <Icon name="Trash2" size={12} className="mr-1" /> Удалить пост
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleReport(r.id, "dismiss")}>Отклонить</Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "verifications" && (
        verifications.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="BadgeCheck" size={48} className="text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Нет заявок</p>
          </div>
        ) : (
          <div className="space-y-3">
            {verifications.map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
                <div>
                  <p className="font-medium text-sm">@{v.username}</p>
                  <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString("ru")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleVerify(v.id, "approve")}>
                    <Icon name="Check" size={12} className="mr-1" /> Одобрить
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleVerify(v.id, "reject")}>Отклонить</Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
