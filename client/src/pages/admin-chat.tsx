import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { playNotificationSound, getSoundEnabled, setSoundEnabled } from "@/lib/notificationSound";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Открыт", color: "#22c55e", bg: "rgba(34,197,94,0.13)" },
  pending: { label: "Ожидание", color: "#f59e0b", bg: "rgba(245,158,11,0.13)" },
  resolved: { label: "Закрыт", color: "#64748b", bg: "rgba(100,116,139,0.13)" },
  spam: { label: "Спам", color: "#ef4444", bg: "rgba(239,68,68,0.13)" },
};

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  urgent: { label: "Срочно", color: "#ef4444" },
  normal: { label: "Норма", color: "#3b82f6" },
  low: { label: "Низкий", color: "#64748b" },
};

const ONLINE_COLORS: Record<string, string> = { online: "#22c55e", away: "#f59e0b", offline: "#475569" };

function fmtTime(d: string | Date) {
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
  if (diff < 86400000) return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function plural(n: number, a: string, b: string, c: string) {
  const m = n % 100;
  if (m >= 11 && m <= 19) return c;
  const k = m % 10;
  if (k === 1) return a;
  if (k <= 4) return b;
  return c;
}

interface ConvRow {
  conversation: {
    id: string; userId: string; assigneeId: string | null; status: string; priority: string;
    subject: string | null; lastMessage: string | null; lastMessageAt: string;
    unreadAdmin: number; tags: string[]; note: string | null; createdAt: string;
  };
  userName: string;
  userEmail: string;
  assigneeName: string | null;
}

interface Message {
  id: string; conversationId: string; senderId: string; role: string;
  text: string; isRead: boolean; reactions: string[]; createdAt: string;
}

interface Template {
  id: string; category: string; title: string; text: string; uses: number;
}

interface Admin {
  id: string; firstName: string; lastName: string; email: string;
}

interface ChatSettings {
  id: string; greeting: string; awayMessage: string; autoAssign: boolean; workingHours: boolean; botEnabled: boolean;
  telegramBotToken: string | null; telegramChatId: string | null; telegramEnabled: boolean;
  telegramNotifyNewConversation: boolean; telegramNotifyNewMessage: boolean;
  telegramNotifyPurchase: boolean; telegramNotifyTopup: boolean;
  telegramNotifyReview: boolean; telegramNotifyCourseRequest: boolean;
}

type ViewMode = "chats" | "stats" | "templates" | "settings";

function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: ONLINE_COLORS[status] || "#475569", flexShrink: 0 }} />;
}

export default function AdminChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("chats");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("time");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [showTpl, setShowTpl] = useState(false);
  const [tplSearch, setTplSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [noteLocal, setNoteLocal] = useState("");
  const [noteEdit, setNoteEdit] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const adminFileRef = useRef<HTMLInputElement>(null);
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminAttachMenu, setAdminAttachMenu] = useState(false);
  const prevUnreadRef = useRef<number>(-1);
  const prevMsgIdRef = useRef<string | null>(null);

  const { data: conversations = [] } = useQuery<ConvRow[]>({
    queryKey: ["/api/admin/chat/conversations"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/chat/conversations`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<{ total: number; open: number; pending: number; resolved: number; unread: number }>({
    queryKey: ["/api/admin/chat/stats"],
    refetchInterval: 10000,
  });

  const { data: convDetail, refetch: refetchDetail } = useQuery<{ conversation: any; messages: Message[]; userInfo: any }>({
    queryKey: ["/api/admin/chat/conversations", selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return null;
      const res = await fetch(`/api/admin/chat/conversations/${selectedConvId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/admin/chat/templates"],
  });

  const { data: admins = [] } = useQuery<Admin[]>({
    queryKey: ["/api/admin/chat/admins"],
  });

  const { data: settings } = useQuery<ChatSettings>({
    queryKey: ["/api/admin/chat/settings"],
    enabled: view === "settings",
  });

  useEffect(() => {
    const ping = () => fetch("/api/admin/chat/heartbeat", { method: "POST", credentials: "include" }).catch(() => {});
    ping();
    const iv = setInterval(ping, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [convDetail?.messages]);

  useEffect(() => {
    const totalUnread = conversations.reduce((s, c) => s + (c.conversation.unreadAdmin || 0), 0);
    if (prevUnreadRef.current === -1) {
      prevUnreadRef.current = totalUnread;
      return;
    }
    if (totalUnread > prevUnreadRef.current && getSoundEnabled("admin_sound")) {
      playNotificationSound("admin");
    }
    prevUnreadRef.current = totalUnread;
  }, [conversations]);

  useEffect(() => {
    if (selectedConvId) {
      fetch(`/api/chat/conversations/${selectedConvId}/read`, { method: "POST", credentials: "include" }).catch(() => {});
    }
  }, [selectedConvId]);

  useEffect(() => {
    const conv = conversations.find(c => c.conversation.id === selectedConvId);
    setNoteLocal(conv?.conversation.note || "");
    setNoteEdit(false);
  }, [selectedConvId]);

  const sendMessage = async () => {
    const t = input.trim();
    if (!t || !selectedConvId) return;
    setInput("");
    try {
      await apiRequest("POST", "/api/chat/messages", { conversationId: selectedConvId, text: t });
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/conversations"] });
    } catch {}
  };

  const adminFileUpload = async (file: File) => {
    if (!selectedConvId || adminUploading) return;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) { alert("Файл слишком большой (макс. 50 МБ)"); return; }
    setAdminUploading(true);
    setAdminAttachMenu(false);
    try {
      const res = await apiRequest("POST", "/api/chat/upload", { fileName: file.name, fileType: file.type });
      const data = await res.json();
      const putRes = await fetch(data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("S3 upload failed");
      await apiRequest("POST", "/api/chat/messages", { conversationId: selectedConvId, text: `📎 ${file.name}`, fileUrl: data.fileUrl, fileName: file.name, fileType: file.type });
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/conversations"] });
    } catch (e) { console.error("Admin file upload failed", e); }
    setAdminUploading(false);
  };

  const adminFilePick = (accept: string) => {
    setAdminAttachMenu(false);
    if (adminFileRef.current) {
      adminFileRef.current.accept = accept;
      adminFileRef.current.click();
    }
  };

  const updateConv = async (id: string | null, data: any) => {
    if (!id) return;
    try {
      await apiRequest("PATCH", `/api/admin/chat/conversations/${id}`, data);
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/conversations"] });
    } catch {}
  };

  const selectedConv = conversations.find(c => c.conversation.id === selectedConvId);
  const messages = convDetail?.messages || [];
  const userInfo = convDetail?.userInfo;
  const totalUnread = conversations.reduce((s, c) => s + c.conversation.unreadAdmin, 0);

  const filtered = (() => {
    let res = [...conversations];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(c => (c.userName || "").toLowerCase().includes(q) || (c.conversation.subject || "").toLowerCase().includes(q));
    }
    if (filterStatus !== "all") res = res.filter(c => c.conversation.status === filterStatus);
    if (sortBy === "time") res.sort((a, b) => new Date(b.conversation.lastMessageAt).getTime() - new Date(a.conversation.lastMessageAt).getTime());
    else if (sortBy === "unread") res.sort((a, b) => b.conversation.unreadAdmin - a.conversation.unreadAdmin);
    else if (sortBy === "priority") res.sort((a, b) => ["urgent", "normal", "low"].indexOf(a.conversation.priority) - ["urgent", "normal", "low"].indexOf(b.conversation.priority));
    return res;
  })();

  const nav = [
    { id: "chats" as ViewMode, icon: "💬", label: "Диалоги", badge: totalUnread },
    { id: "stats" as ViewMode, icon: "📊", label: "Статистика" },
    { id: "templates" as ViewMode, icon: "⚡", label: "Шаблоны" },
    { id: "settings" as ViewMode, icon: "⚙️", label: "Настройки" },
  ];

  const filtTpl = templates.filter(t => t.title.toLowerCase().includes(tplSearch.toLowerCase()) || t.text.toLowerCase().includes(tplSearch.toLowerCase()));

  return (
    <AdminLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800&family=Nunito:wght@400;500;600;700&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .ac-scroll::-webkit-scrollbar{width:4px;height:4px}
        .ac-scroll::-webkit-scrollbar-track{background:transparent}
        .ac-scroll::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.4);border-radius:2px}
        .ac-scroll{scrollbar-width:thin;scrollbar-color:rgba(124,58,237,0.35) transparent}
        .ac-input{outline:none;font-family:Nunito,sans-serif}
        .ac-input::placeholder{color:rgba(255,255,255,0.25)}
        .ac-select option{background:#1a1230;color:#e2d9f3}
      `}</style>
      <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#0d0a1a", fontFamily: "Nunito,sans-serif" }}>
        <div style={{ width: 62, background: "#0a0716", borderRight: "1px solid rgba(124,58,237,0.15)", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4, flexShrink: 0 }}>
          <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 10, fontWeight: 800, color: "#a855f7", marginBottom: 14, textAlign: "center", lineHeight: 1.3 }}>В<br />К<br />?</div>
          {nav.map(n => {
            const active = view === n.id;
            return (
              <div key={n.id} style={{ position: "relative", display: "inline-flex" }} title={n.label}>
                <button onClick={() => setView(n.id)} style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: active ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.04)",
                  border: "none", cursor: "pointer", fontSize: 17, position: "relative",
                  transition: "all 0.2s", boxShadow: active ? "0 4px 14px rgba(124,58,237,0.4)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  {n.icon}
                  {(n.badge || 0) > 0 && <span style={{ position: "absolute", top: -3, right: -3, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0a0716", padding: "0 2px" }}>{n.badge}</span>}
                </button>
              </div>
            );
          })}
        </div>

        {view === "chats" && (
          <>
            <div style={{ width: 295, borderRight: "1px solid rgba(124,58,237,0.15)", display: "flex", flexDirection: "column", background: "#0e0b1e", flexShrink: 0 }}>
              <div style={{ padding: "14px 13px 11px", borderBottom: "1px solid rgba(124,58,237,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                  <span style={{ fontFamily: "Unbounded,sans-serif", fontSize: 13, fontWeight: 700, color: "#fff" }}>Диалоги</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="ac-input ac-select" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 10, padding: "3px 5px", cursor: "pointer" }}>
                    <option value="time">По времени</option>
                    <option value="unread">Непрочит.</option>
                    <option value="priority">Приоритет</option>
                  </select>
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: .4 }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск диалогов..." className="ac-input" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "6px 9px 6px 28px", color: "#e2d9f3", fontSize: 12, boxSizing: "border-box" as const }} />
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 7, flexWrap: "wrap" }}>
                  {([["all", "Все"], ["open", "Открытые"], ["pending", "Ожидание"], ["resolved", "Закрытые"]] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setFilterStatus(v)} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "Nunito,sans-serif", background: filterStatus === v ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.05)", color: filterStatus === v ? "#fff" : "rgba(255,255,255,0.45)" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="ac-scroll" style={{ flex: 1, overflowY: "auto" }}>
                {filtered.length === 0 && <div style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Не найдено</div>}
                {filtered.map(row => {
                  const c = row.conversation;
                  const sc = STATUS_CFG[c.status] || STATUS_CFG.open;
                  const isSel = c.id === selectedConvId;
                  return (
                    <div key={c.id} onClick={() => { setSelectedConvId(c.id); setInput(""); }} style={{
                      padding: "10px 13px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
                      transition: "background 0.15s", position: "relative",
                      background: isSel ? "rgba(124,58,237,0.12)" : "transparent",
                      borderLeft: isSel ? "2px solid #a855f7" : "2px solid transparent"
                    }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                    >
                      {c.priority === "urgent" && <div style={{ position: "absolute", top: 9, right: 11, fontSize: 10 }}>🔴</div>}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 37, height: 37, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a5f,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, border: "2px solid rgba(255,255,255,0.08)" }}>👤</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isSel ? "#fff" : "#d4c6f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.userName || "Аноним"}</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{fmtTime(c.lastMessageAt)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{c.subject || "Диалог"}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{c.lastMessage || "..."}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, background: sc.bg, padding: "1px 5px", borderRadius: 8 }}>{sc.label}</span>
                            {row.assigneeName && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{row.assigneeName.split(" ")[0]}</span>}
                            {c.unreadAdmin > 0 && <span style={{ marginLeft: "auto", background: "#7c3aed", color: "#fff", borderRadius: 10, minWidth: 17, height: 17, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{c.unreadAdmin}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ChatWin
              conv={selectedConv} messages={messages} input={input} setInput={setInput}
              sendMessage={sendMessage} updateConv={updateConv} admins={admins}
              showAssign={showAssign} setShowAssign={setShowAssign}
              showTpl={showTpl} setShowTpl={setShowTpl} tplSearch={tplSearch}
              setTplSearch={setTplSearch} filtTpl={filtTpl} endRef={endRef} inputRef={inputRef}
              adminFileRef={adminFileRef} adminUploading={adminUploading}
              adminAttachMenu={adminAttachMenu} setAdminAttachMenu={setAdminAttachMenu}
              adminFileUpload={adminFileUpload} adminFilePick={adminFilePick}
            />

            <ClientInfoPanel conv={selectedConv} userInfo={userInfo} noteLocal={noteLocal}
              setNoteLocal={setNoteLocal} noteEdit={noteEdit} setNoteEdit={setNoteEdit}
              updateConv={updateConv} />
          </>
        )}

        {view === "stats" && <StatsView stats={stats} conversations={conversations} />}
        {view === "templates" && <TemplatesView templates={templates} queryClient={queryClient} />}
        {view === "settings" && settings && <SettingsView settings={settings} queryClient={queryClient} />}
      </div>
    </AdminLayout>
  );
}

interface ChatWinProps {
  conv: ConvRow | undefined;
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  updateConv: (id: string | null, data: any) => void;
  admins: Admin[];
  showAssign: boolean;
  setShowAssign: (v: boolean | ((p: boolean) => boolean)) => void;
  showTpl: boolean;
  setShowTpl: (v: boolean | ((p: boolean) => boolean)) => void;
  tplSearch: string;
  setTplSearch: (v: string) => void;
  filtTpl: Template[];
  endRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  adminFileRef: React.RefObject<HTMLInputElement | null>;
  adminUploading: boolean;
  adminAttachMenu: boolean;
  setAdminAttachMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  adminFileUpload: (file: File) => void;
  adminFilePick: (accept: string) => void;
}

function ChatWin({ conv, messages, input, setInput, sendMessage, updateConv, admins, showAssign, setShowAssign, showTpl, setShowTpl, tplSearch, setTplSearch, filtTpl, endRef, inputRef, adminFileRef, adminUploading, adminAttachMenu, setAdminAttachMenu, adminFileUpload, adminFilePick }: ChatWinProps) {
  if (!conv) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 60, opacity: .1 }}>💬</div>
      <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 15, color: "rgba(255,255,255,0.15)" }}>Выберите диалог</div>
    </div>
  );

  const c = conv.conversation;
  const sc = STATUS_CFG[c.status] || STATUS_CFG.open;
  const pc = PRIORITY_CFG[c.priority] || PRIORITY_CFG.normal;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(124,58,237,0.15)", background: "#0e0b1e", display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a5f,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, border: "2px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>👤</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{conv.userName || "Клиент"}</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject || "Диалог"}</div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
          <select value={c.priority} onChange={e => updateConv(c.id, { priority: e.target.value })} className="ac-input ac-select" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${pc.color}44`, borderRadius: 8, color: pc.color, fontSize: 11, padding: "3px 7px", cursor: "pointer", fontWeight: 600 }}>
            {Object.entries(PRIORITY_CFG).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
          </select>
          <select value={c.status} onChange={e => updateConv(c.id, { status: e.target.value })} className="ac-input ac-select" style={{ background: sc.bg, border: `1px solid ${sc.color}44`, borderRadius: 8, color: sc.color, fontSize: 11, padding: "3px 7px", cursor: "pointer", fontWeight: 600 }}>
            {Object.entries(STATUS_CFG).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
          </select>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAssign((p: boolean) => !p)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "3px 9px", color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer", fontFamily: "Nunito,sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
              {c.assigneeId ? (admins.find((a: Admin) => a.id === c.assigneeId)?.firstName || "...") : "Назначить"} ▾
            </button>
            {showAssign && (
              <div style={{ position: "absolute", top: "calc(100%+4px)", right: 0, background: "#1a1230", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: 5, zIndex: 100, minWidth: 155, boxShadow: "0 8px 28px rgba(0,0,0,0.5)" }}>
                {admins.map((a: Admin) => (
                  <button key={a.id} onClick={() => { updateConv(c.id, { assigneeId: a.id }); setShowAssign(false); }}
                    style={{ width: "100%", background: c.assigneeId === a.id ? "rgba(124,58,237,0.2)" : "none", border: "none", borderRadius: 8, padding: "6px 9px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.15)"}
                    onMouseLeave={e => e.currentTarget.style.background = c.assigneeId === a.id ? "rgba(124,58,237,0.2)" : "none"}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>👤</div>
                    <span style={{ fontSize: 12, color: "#d4c6f0" }}>{a.firstName} {a.lastName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ac-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
        {messages.map((msg: Message, i: number) => {
          const isA = msg.role === "admin";
          const prev = i > 0 && messages[i - 1].role === msg.role;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isA ? "row-reverse" : "row", gap: 7, alignItems: "flex-end", animation: "fadeIn 0.2s ease" }}>
              {!prev ? <div style={{ width: 28, height: 28, borderRadius: "50%", background: isA ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#1e3a5f,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{isA ? "👩‍💼" : "👤"}</div> : <div style={{ width: 28, flexShrink: 0 }} />}
              <div style={{ maxWidth: "70%" }}>
                {!prev && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 2, textAlign: isA ? "right" : "left" }}>{isA ? "Администратор" : (conv.userName || "Клиент")} · {fmtTime(msg.createdAt)}</div>}
                <div style={{ background: isA ? "linear-gradient(135deg,#4c1d95,#6d28d9)" : "rgba(255,255,255,0.05)", border: isA ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(255,255,255,0.08)", borderRadius: isA ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "8px 12px", fontSize: 13, color: "#e2d9f3", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" as const }}>
                  {msg.fileUrl && msg.fileType?.startsWith("image/") && <img src={msg.fileUrl} alt={msg.fileName || "image"} style={{ maxWidth: "100%", borderRadius: 8, marginBottom: msg.text ? 6 : 0, cursor: "pointer" }} onClick={() => window.open(msg.fileUrl, "_blank")} />}
                  {msg.fileUrl && msg.fileType?.startsWith("video/") && <video src={msg.fileUrl} controls style={{ maxWidth: "100%", borderRadius: 8, marginBottom: msg.text ? 6 : 0 }} />}
                  {msg.fileUrl && !msg.fileType?.startsWith("image/") && !msg.fileType?.startsWith("video/") && (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 8, textDecoration: "none", color: "#a855f7", fontSize: 12, marginBottom: msg.text ? 6 : 0 }}>
                      📄 {msg.fileName || "Файл"}
                    </a>
                  )}
                  {msg.text}
                </div>
                {isA && <div style={{ textAlign: "right", fontSize: 10, marginTop: 2, color: msg.isRead ? "#a855f7" : "rgba(255,255,255,0.25)" }}>{msg.isRead ? "✓✓ Прочитано" : "✓ Отправлено"}</div>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {showTpl && (
        <div style={{ margin: "0 16px 7px", background: "#1a1230", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 13, padding: 9, maxHeight: 200, overflowY: "auto" }} className="ac-scroll">
          <input autoFocus value={tplSearch} onChange={(e: any) => setTplSearch(e.target.value)} placeholder="Поиск шаблонов..." className="ac-input" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 9px", color: "#e2d9f3", fontSize: 12, boxSizing: "border-box" as const, marginBottom: 5 }} />
          {filtTpl.map((t: Template) => (
            <button key={t.id} onClick={() => { setInput(t.text); setShowTpl(false); inputRef.current?.focus(); }}
              style={{ width: "100%", background: "none", border: "none", borderRadius: 8, padding: "6px 9px", textAlign: "left" as const, cursor: "pointer", fontFamily: "Nunito,sans-serif", marginBottom: 1 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>{t.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</div>
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "8px 16px 14px", borderTop: "1px solid rgba(124,58,237,0.12)", flexShrink: 0 }}>
        <input type="file" ref={adminFileRef} style={{ display: "none" }} onChange={(e: any) => { const f = e.target.files?.[0]; if (f) adminFileUpload(f); e.target.value = ""; }} />
        <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
          <button onClick={() => setShowTpl((p: boolean) => !p)} style={{ background: showTpl ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "3px 11px", fontSize: 11, color: showTpl ? "#a855f7" : "rgba(255,255,255,0.45)", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>⚡ Шаблоны</button>
          <button onClick={() => updateConv(c.id, { status: "resolved" })} style={{ marginLeft: "auto", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "3px 11px", fontSize: 11, color: "#22c55e", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>✓ Закрыть</button>
        </div>
        {adminAttachMenu && (
          <div style={{ background: "#1a1230", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 13, padding: 5, display: "flex", flexDirection: "column", gap: 1, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", marginBottom: 6 }}>
            {([["🖼️", "Изображение", "image/*"], ["📄", "Документ", ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"], ["🎥", "Видео", "video/*"]] as [string, string, string][]).map(([ic, lb, accept]) => (
              <button key={lb} onClick={() => adminFilePick(accept)} style={{ background: "none", border: "none", borderRadius: 8, padding: "7px 11px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Nunito,sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >{ic} {lb}</button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 7, alignItems: "flex-end", background: "rgba(255,255,255,0.04)", border: `1px solid ${input ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.09)"}`, borderRadius: 13, padding: "7px 7px 7px 13px", transition: "border-color 0.2s" }}>
          <button onClick={() => setAdminAttachMenu((p: boolean) => !p)} disabled={adminUploading} style={{ background: "none", border: "none", cursor: "pointer", color: adminUploading ? "#a855f7" : "rgba(255,255,255,0.35)", fontSize: 17, display: "flex", alignItems: "center", paddingBottom: 3 }}
            onMouseEnter={(e: any) => { if (!adminUploading) e.currentTarget.style.color = "#a855f7"; }}
            onMouseLeave={(e: any) => { if (!adminUploading) e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
          >{adminUploading ? "⏳" : "📎"}</button>
          <textarea ref={inputRef} value={input} onChange={(e: any) => setInput(e.target.value)}
            onKeyDown={(e: any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Написать ответ… (Enter — отправить)" rows={1} className="ac-input"
            style={{ flex: 1, background: "none", border: "none", color: "#e2d9f3", fontSize: 13, resize: "none", lineHeight: 1.5, maxHeight: 76, overflowY: "hidden" }}
            onInput={(e: any) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 76) + "px"; }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || adminUploading} style={{
            width: 34, height: 34, borderRadius: 10,
            background: input.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)",
            border: "none", cursor: input.trim() ? "pointer" : "default", fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", flexShrink: 0,
            boxShadow: input.trim() ? "0 4px 11px rgba(124,58,237,0.4)" : "none",
            opacity: adminUploading ? 0.5 : 1
          }}>➤</button>
        </div>
      </div>
    </div>
  );
}

interface ClientInfoPanelProps {
  conv: ConvRow | undefined;
  userInfo: any;
  noteLocal: string;
  setNoteLocal: (v: string) => void;
  noteEdit: boolean;
  setNoteEdit: (v: boolean) => void;
  updateConv: (id: string | null, data: any) => void;
}

function ClientInfoPanel({ conv, userInfo, noteLocal, setNoteLocal, noteEdit, setNoteEdit, updateConv }: ClientInfoPanelProps) {
  if (!conv || !userInfo) return null;
  const c = conv.conversation;
  const sc = STATUS_CFG[c.status] || STATUS_CFG.open;
  const pc = PRIORITY_CFG[c.priority] || PRIORITY_CFG.normal;

  return (
    <div className="ac-scroll" style={{ width: 268, borderLeft: "1px solid rgba(124,58,237,0.15)", background: "#0a0716", overflowY: "auto", flexShrink: 0 }}>
      <div style={{ padding: "16px 15px 13px", borderBottom: "1px solid rgba(124,58,237,0.12)", textAlign: "center" }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a5f,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 7px", border: "2px solid rgba(255,255,255,0.1)" }}>👤</div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 2 }}>
          {userInfo.firstName} {userInfo.lastName}
          {userInfo.isGuest && <span style={{ marginLeft: 6, fontSize: 9, background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b", borderRadius: 6, padding: "1px 6px", fontWeight: 600 }}>Гость</span>}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>{userInfo.email}</div>
      </div>

      <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(124,58,237,0.12)" }}>
        <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 7 }}>Финансы</div>
        {([
          ["💰 Баланс", `${(userInfo.balance || 0).toLocaleString("ru")} ₽`, "#a855f7"],
          ["🎁 Бонусы", (userInfo.fantiks || 0).toLocaleString("ru"), "#f59e0b"],
          ["📚 Покупок", `${userInfo.purchases || 0} ${plural(userInfo.purchases || 0, "курс", "курса", "курсов")}`, "#3b82f6"],
        ] as const).map(([l, v, col]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(124,58,237,0.12)" }}>
        <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 7 }}>Данные</div>
        {([
          ["📍 Город", userInfo.city || "—"],
          ["📅 Рег.", userInfo.createdAt ? new Date(userInfo.createdAt).toLocaleDateString("ru-RU") : "—"],
        ] as const).map(([l, v]) => (
          <div key={l} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{l}</div>
            <div style={{ fontSize: 12, color: "#d4c6f0", marginTop: 1 }}>{v}</div>
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
          {(c.tags || []).map((t: string) => (
            <span key={t} style={{ fontSize: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 8, padding: "1px 6px", color: "rgba(255,255,255,0.55)" }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(124,58,237,0.12)" }}>
        <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 7 }}>Диалог</div>
        {([
          ["Создан", fmtTime(c.createdAt)],
          ["Статус", sc.label],
          ["Приоритет", pc.label],
          ["Оператор", conv.assigneeName || "Не назначен"],
        ] as const).map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{l}</span>
            <span style={{ fontSize: 11, color: "#d4c6f0", textAlign: "right" as const, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "11px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" as const }}>Заметка</div>
          <button onClick={() => { if (noteEdit) updateConv(c.id, { note: noteLocal }); setNoteEdit(!noteEdit); }} style={{ background: "none", border: "none", color: "#a855f7", fontSize: 11, cursor: "pointer", fontFamily: "Nunito,sans-serif", fontWeight: 600 }}>{noteEdit ? "Сохранить" : "✏️ Ред."}</button>
        </div>
        {noteEdit ? (
          <textarea value={noteLocal} onChange={e => setNoteLocal(e.target.value)} className="ac-input" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, padding: "7px 9px", color: "#e2d9f3", fontSize: 12, resize: "none", minHeight: 65, boxSizing: "border-box" as const, lineHeight: 1.5 }} />
        ) : (
          <div style={{ fontSize: 12, color: noteLocal ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", fontStyle: noteLocal ? "normal" : "italic", lineHeight: 1.5, minHeight: 38 }}>{noteLocal || "Нет заметок..."}</div>
        )}
      </div>
    </div>
  );
}

function StatsView({ stats, conversations }: { stats: any; conversations: ConvRow[] }) {
  const HOURLY = [3, 5, 8, 12, 9, 14, 11, 15, 18, 22, 19, 16, 14, 12, 10, 8, 6, 7, 9, 11, 8, 6, 4, 2];
  const maxH = Math.max(...HOURLY);
  const nowH = new Date().getHours();

  return (
    <div className="ac-scroll" style={{ flex: 1, overflowY: "auto", padding: 26 }}>
      <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 5 }}>Статистика</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 22 }}>{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { icon: "💬", label: "Всего сегодня", val: stats?.total || 0, color: "#a855f7", sub: "обращений" },
          { icon: "✅", label: "Закрыто", val: stats?.resolved || 0, color: "#22c55e", sub: `из ${stats?.total || 0}` },
          { icon: "🔴", label: "Открытых", val: stats?.open || 0, color: "#ef4444", sub: "требуют ответа" },
          { icon: "⏳", label: "В ожидании", val: stats?.pending || 0, color: "#f59e0b", sub: "нужен фолоуап" },
        ].map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c.color}22`, borderRadius: 15, padding: "16px 14px", borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 22, marginBottom: 5 }}>{c.icon}</div>
            <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 21, fontWeight: 800, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>{c.label}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 15, padding: "18px 18px 12px", marginBottom: 18 }}>
        <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>Обращения по часам</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 85 }}>
          {HOURLY.map((v, i) => {
            const pct = v / maxH * 100;
            const isNow = i === nowH;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div title={`${i}:00 — ${v}`} style={{ width: "100%", background: isNow ? "linear-gradient(180deg,#a855f7,#7c3aed)" : v > maxH * 0.7 ? "rgba(124,58,237,0.6)" : "rgba(124,58,237,0.25)", borderRadius: "3px 3px 0 0", height: `${pct}%`, minHeight: 3, cursor: "help", boxShadow: isNow ? "0 0 8px rgba(168,85,247,0.5)" : "none" }} />
                {i % 4 === 0 && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{`${i}`.padStart(2, "0")}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 15, padding: 16 }}>
          <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 11 }}>ВРЕМЯ ОТВЕТА</div>
          {([["Среднее", "2:07", "#a855f7"], ["Первый отв.", "1:25", "#22c55e"], ["Максимум", "8:43", "#ef4444"]] as const).map(([l, v, col]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "Unbounded,sans-serif" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 15, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>УДОВЛЕТВОРЁННОСТЬ</div>
          <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 38, fontWeight: 800, background: "linear-gradient(90deg,#f59e0b,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>4.9</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>★★★★★ из 5.0</div>
        </div>
      </div>
    </div>
  );
}

function TemplatesView({ templates, queryClient }: { templates: Template[]; queryClient: any }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title?: string; text?: string }>({});
  const [newMode, setNewMode] = useState(false);
  const [newData, setNewData] = useState({ category: "", title: "", text: "" });

  const cats = [...new Set(templates.map(t => t.category))];

  const saveNew = async () => {
    if (!newData.title.trim() || !newData.text.trim()) return;
    try {
      await apiRequest("POST", "/api/admin/chat/templates", { category: newData.category || "Общее", title: newData.title, text: newData.text });
      setNewMode(false);
      setNewData({ category: "", title: "", text: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/templates"] });
    } catch {}
  };

  const saveEdit = async (id: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/chat/templates/${id}`, editData);
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/templates"] });
    } catch {}
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/admin/chat/templates/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/templates"] });
    } catch {}
  };

  return (
    <div className="ac-scroll" style={{ flex: 1, overflowY: "auto", padding: 26 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 3 }}>Шаблоны ответов</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{templates.length} шаблонов</div>
        </div>
        <button onClick={() => setNewMode(true)} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 11, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Nunito,sans-serif", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}>+ Добавить</button>
      </div>

      {newMode && (
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 15, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: "#a855f7", marginBottom: 11, fontSize: 13 }}>Новый шаблон</div>
          {(["category", "title"] as const).map(k => (
            <input key={k} value={newData[k]} onChange={e => setNewData(p => ({ ...p, [k]: e.target.value }))}
              placeholder={k === "category" ? "Категория" : "Заголовок"} className="ac-input"
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 10px", color: "#e2d9f3", fontSize: 12, marginBottom: 7, boxSizing: "border-box" as const }} />
          ))}
          <textarea value={newData.text} onChange={e => setNewData(p => ({ ...p, text: e.target.value }))}
            placeholder="Текст шаблона..." className="ac-input"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 10px", color: "#e2d9f3", fontSize: 12, resize: "none", minHeight: 55, boxSizing: "border-box" as const, marginBottom: 9 }} />
          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={saveNew} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Сохранить</button>
            <button onClick={() => setNewMode(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Отмена</button>
          </div>
        </div>
      )}

      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 9, fontFamily: "Unbounded,sans-serif" }}>{cat}</div>
          {templates.filter(t => t.category === cat).map(t => (
            <div key={t.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: "13px 15px", marginBottom: 7, transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
            >
              {editId === t.id ? (
                <>
                  <input value={editData.title || ""} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} className="ac-input" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, padding: "5px 9px", color: "#e2d9f3", fontSize: 13, fontWeight: 700, marginBottom: 7, boxSizing: "border-box" as const }} />
                  <textarea value={editData.text || ""} onChange={e => setEditData(p => ({ ...p, text: e.target.value }))} className="ac-input" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, padding: "5px 9px", color: "#e2d9f3", fontSize: 12, resize: "none", minHeight: 48, boxSizing: "border-box" as const, marginBottom: 7 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => saveEdit(t.id)} style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, padding: "3px 11px", color: "#22c55e", fontSize: 11, cursor: "pointer", fontFamily: "Nunito,sans-serif", fontWeight: 700 }}>Сохранить</button>
                    <button onClick={() => setEditId(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "3px 11px", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Отмена</button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#d4c6f0", marginBottom: 3 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{t.text}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Использований: {t.uses}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => { setEditId(t.id); setEditData({ title: t.title, text: t.text }); }}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#a855f7"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                    >✏️</button>
                    <button onClick={() => deleteTemplate(t.id)}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                    >🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SettingsView({ settings, queryClient }: { settings: ChatSettings; queryClient: any }) {
  const buildLocal = (s: ChatSettings) => ({
    ...s,
    notifications: true,
    sound: getSoundEnabled("admin_sound"),
    telegramBotToken: s.telegramBotToken || "",
    telegramChatId: s.telegramChatId || "",
    telegramEnabled: s.telegramEnabled ?? false,
    telegramNotifyNewConversation: s.telegramNotifyNewConversation ?? true,
    telegramNotifyNewMessage: s.telegramNotifyNewMessage ?? true,
    telegramNotifyPurchase: s.telegramNotifyPurchase ?? true,
    telegramNotifyTopup: s.telegramNotifyTopup ?? true,
    telegramNotifyReview: s.telegramNotifyReview ?? true,
    telegramNotifyCourseRequest: s.telegramNotifyCourseRequest ?? true,
  });
  const [local, setLocal] = useState(buildLocal(settings));
  const [saved, setSaved] = useState(false);
  const prevSettingsRef = useRef(settings);

  useEffect(() => {
    if (prevSettingsRef.current !== settings) {
      prevSettingsRef.current = settings;
      setLocal(prev => ({
        ...buildLocal(settings),
        sound: prev.sound,
        notifications: prev.notifications,
      }));
    }
  }, [settings]);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgTestResult, setTgTestResult] = useState<{ ok: boolean; error?: string; botName?: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  const localOnlyKeys = new Set(["sound", "notifications"]);

  const patchSettings = async (payload: Record<string, any>) => {
    try {
      await apiRequest("PATCH", "/api/admin/chat/settings", payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/settings"] });
    } catch {}
  };

  const tog = (k: string) => {
    const newVal = !(local as any)[k];
    setLocal(p => ({ ...p, [k]: newVal }));
    if (k === "sound") setSoundEnabled("admin_sound", newVal);
    if (!localOnlyKeys.has(k)) {
      patchSettings({ [k]: newVal });
    }
  };

  const save = async () => {
    patchSettings({
      greeting: local.greeting, awayMessage: local.awayMessage,
      autoAssign: local.autoAssign, workingHours: local.workingHours, botEnabled: local.botEnabled,
      telegramBotToken: local.telegramBotToken || null,
      telegramChatId: local.telegramChatId || null,
      telegramEnabled: local.telegramEnabled,
      telegramNotifyNewConversation: local.telegramNotifyNewConversation,
      telegramNotifyNewMessage: local.telegramNotifyNewMessage,
      telegramNotifyPurchase: local.telegramNotifyPurchase,
      telegramNotifyTopup: local.telegramNotifyTopup,
      telegramNotifyReview: local.telegramNotifyReview,
      telegramNotifyCourseRequest: local.telegramNotifyCourseRequest,
    });
  };

  const testTelegram = async () => {
    if (!local.telegramBotToken || !local.telegramChatId) {
      setTgTestResult({ ok: false, error: "Заполните токен бота и Chat ID" });
      return;
    }
    setTgTesting(true);
    setTgTestResult(null);
    try {
      const res = await fetch("/api/admin/chat/telegram/test", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: local.telegramBotToken, chatId: local.telegramChatId }),
      });
      const data = await res.json();
      setTgTestResult(data);
    } catch {
      setTgTestResult({ ok: false, error: "Ошибка соединения" });
    }
    setTgTesting(false);
  };

  const toggles: [string, string, string][] = [
    ["notifications", "🔔 Уведомления", "Push-уведомления о новых сообщениях"],
    ["sound", "🔊 Звук", "Звуковые сигналы"],
    ["autoAssign", "🤖 Авто-назначение", "Автораспределение чатов"],
    ["workingHours", "⏰ Рабочие часы", "Ограничить по расписанию"],
    ["botEnabled", "⚡ Бот-помощник", "Автоответы бота"],
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.2)",
    borderRadius: 10, padding: "9px 11px", color: "#e2d9f3", fontSize: 13, boxSizing: "border-box",
    fontFamily: "Nunito,sans-serif", outline: "none",
  };

  return (
    <div className="ac-scroll" style={{ flex: 1, overflowY: "auto", padding: 26, maxWidth: 580 }}>
      <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Настройки</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Конфигурация чата поддержки</div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 15, padding: "4px 0", marginBottom: 18 }}>
        {toggles.map(([k, l, d], i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: i < toggles.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#d4c6f0" }}>{l}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{d}</div>
            </div>
            <button onClick={() => tog(k)} style={{
              width: 42, height: 22, borderRadius: 11,
              background: (local as any)[k] ? "linear-gradient(90deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)",
              border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s", flexShrink: 0
            }}>
              <div style={{ position: "absolute", top: 2, left: (local as any)[k] ? 21 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
            </button>
          </div>
        ))}
      </div>

      {([
        ["Приветственное сообщение", "greeting", "Текст при открытии чата"],
        ["Сообщение не в сети", "awayMessage", "Текст вне рабочего времени"],
      ] as const).map(([label, key, desc]) => (
        <div key={key} style={{ marginBottom: 15 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 5 }}>{desc}</div>
          <textarea value={(local as any)[key]} onChange={e => setLocal(p => ({ ...p, [key]: e.target.value }))} className="ac-input"
            style={{ ...inputStyle, resize: "none", minHeight: 55, lineHeight: 1.5 } as any} />
        </div>
      ))}

      <button onClick={save} style={{
        background: saved ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#7c3aed,#a855f7)",
        border: "none", borderRadius: 11, padding: "11px 26px", color: "#fff",
        fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "Nunito,sans-serif",
        boxShadow: "0 4px 14px rgba(124,58,237,0.4)", transition: "background 0.3s"
      }}>{saved ? "✓ Сохранено!" : "Сохранить"}</button>

      <div style={{ marginTop: 32, borderTop: "1px solid rgba(124,58,237,0.15)", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>📲</span>
          <div>
            <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 15, fontWeight: 800, color: "#fff" }}>Telegram-бот уведомления</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Отдельный бот для push-уведомлений в Telegram</div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 15, padding: "4px 0", marginBottom: 16, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#d4c6f0" }}>📲 Telegram уведомления</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Отправлять уведомления в Telegram</div>
            </div>
            <button onClick={() => tog("telegramEnabled")} style={{
              width: 42, height: 22, borderRadius: 11,
              background: local.telegramEnabled ? "linear-gradient(90deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)",
              border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s", flexShrink: 0
            }}>
              <div style={{ position: "absolute", top: 2, left: local.telegramEnabled ? 21 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>Токен бота</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 5 }}>Получите у @BotFather в Telegram</div>
          <div style={{ position: "relative" }}>
            <input
              type={showToken ? "text" : "password"}
              value={local.telegramBotToken}
              onChange={e => setLocal(p => ({ ...p, telegramBotToken: e.target.value }))}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              style={{ ...inputStyle, paddingRight: 40 }}
            />
            <button onClick={() => setShowToken(!showToken)} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 16
            }}>{showToken ? "🙈" : "👁"}</button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>Chat ID</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 5 }}>ID чата или группы для уведомлений (используйте @userinfobot)</div>
          <input
            type="text"
            value={local.telegramChatId}
            onChange={e => setLocal(p => ({ ...p, telegramChatId: e.target.value }))}
            placeholder="-1001234567890 или 123456789"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={testTelegram} disabled={tgTesting} style={{
            background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 10, padding: "8px 16px", color: "#a855f7",
            fontWeight: 600, fontSize: 12, cursor: tgTesting ? "not-allowed" : "pointer",
            fontFamily: "Nunito,sans-serif", opacity: tgTesting ? 0.6 : 1, transition: "opacity 0.2s"
          }}>{tgTesting ? "Проверка..." : "🔗 Проверить подключение"}</button>
          <button onClick={() => { save(); }} style={{
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff",
            fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "Nunito,sans-serif",
          }}>💾 Сохранить</button>
        </div>

        {tgTestResult && (
          <div style={{
            background: tgTestResult.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${tgTestResult.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 10, padding: "9px 13px", marginBottom: 14, fontSize: 12,
            color: tgTestResult.ok ? "#22c55e" : "#ef4444",
          }}>
            {tgTestResult.ok
              ? `✅ Бот "${tgTestResult.botName}" подключён! Тестовое сообщение отправлено.`
              : `❌ ${tgTestResult.error}`}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Чат поддержки</div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "4px 0", marginBottom: 14 }}>
          {([
            ["telegramNotifyNewConversation", "🆕 Новый чат", "При создании нового чата"],
            ["telegramNotifyNewMessage", "💬 Новое сообщение", "При каждом сообщении клиента"],
          ] as [string, string, string][]).map(([k, l, d], i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#d4c6f0" }}>{l}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{d}</div>
              </div>
              <button onClick={() => tog(k)} style={{
                width: 38, height: 20, borderRadius: 10,
                background: (local as any)[k] ? "linear-gradient(90deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)",
                border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s", flexShrink: 0
              }}>
                <div style={{ position: "absolute", top: 2, left: (local as any)[k] ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Активность платформы</div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "4px 0", marginBottom: 14 }}>
          {([
            ["telegramNotifyPurchase", "🛒 Покупка курса", "При покупке курса или VIP пакета"],
            ["telegramNotifyTopup", "💳 Пополнение баланса", "При успешном пополнении через NirvanaPay"],
            ["telegramNotifyReview", "📝 Новый отзыв", "При создании отзыва на курс"],
            ["telegramNotifyCourseRequest", "📋 Запрос курса", "При создании запроса на добавление курса"],
          ] as [string, string, string][]).map(([k, l, d], i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#d4c6f0" }}>{l}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{d}</div>
              </div>
              <button onClick={() => tog(k)} style={{
                width: 38, height: 20, borderRadius: 10,
                background: (local as any)[k] ? "linear-gradient(90deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)",
                border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s", flexShrink: 0
              }}>
                <div style={{ position: "absolute", top: 2, left: (local as any)[k] ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.12)", borderRadius: 10, padding: "10px 13px", fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          <b style={{ color: "rgba(255,255,255,0.6)" }}>Как настроить:</b><br />
          1. Создайте бота через <span style={{ color: "#a855f7" }}>@BotFather</span> в Telegram<br />
          2. Скопируйте токен бота сюда<br />
          3. Добавьте бота в группу или напишите ему /start<br />
          4. Узнайте Chat ID через <span style={{ color: "#a855f7" }}>@userinfobot</span> или <span style={{ color: "#a855f7" }}>@getmyid_bot</span><br />
          5. Нажмите "Проверить подключение"
        </div>
      </div>
    </div>
  );
}
