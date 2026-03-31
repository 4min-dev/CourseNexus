import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { playNotificationSound, getSoundEnabled, setSoundEnabled } from "@/lib/notificationSound";

const FAQ_ITEMS = [
  { q: "Как оформить возврат?", a: "Возврат оформляется в течение 14 дней с момента покупки через личный кабинет." },
  { q: "Что входит в VIP пакет?", a: "Скидки 20-70%, приоритетная поддержка, вебинары и персональный куратор." },
  { q: "Как получить бонусные баллы?", a: "Баллы начисляются за каждую покупку, активность и рефералов." },
  { q: "Срок действия курсов?", a: "После покупки курсы доступны навсегда без ограничений." },
];

const QUICK_REPLIES = ["Как купить курс?", "Возврат средств", "Мои бонусы", "Цены на VIP", "Технические проблемы"];
const EMOJI_REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "👏"];

function fmtTime(d: string | Date) {
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
  if (diff < 86400000) return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

interface Message {
  id: string;
  role: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  reactions: string[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👩‍💼</div>
      <div style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#a855f7", display: "inline-block", animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      </div>
    </div>
  );
}

function MsgBubble({ msg, onReact }: { msg: Message; onReact: (id: string, emoji: string) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isClient = msg.role === "client";
  const unique = [...new Set(msg.reactions || [])];

  return (
    <div
      style={{ display: "flex", flexDirection: isClient ? "row-reverse" : "row", gap: 8, alignItems: "flex-end", position: "relative", animation: "fadeIn 0.2s ease" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowPicker(false); }}
    >
      {!isClient && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
          👩‍💼
        </div>
      )}
      <div style={{ maxWidth: "72%", position: "relative" }}>
        {!isClient && (
          <div style={{ fontSize: 11, color: "#a855f7", marginBottom: 3, fontWeight: 600 }}>
            Поддержка · <span style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7)", padding: "1px 6px", borderRadius: 10, fontSize: 9, color: "#fff", fontWeight: 700 }}>Администратор</span>
          </div>
        )}
        <div style={{
          background: isClient ? "linear-gradient(135deg,#4c1d95,#6d28d9)" : "rgba(255,255,255,0.05)",
          border: isClient ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: isClient ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "9px 13px", fontSize: 13, color: "#e2d9f3", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          {msg.fileUrl && (msg.fileType?.startsWith("image/") || msg.fileType === "image") && (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginBottom: msg.text && !msg.text.startsWith("📎") ? 6 : 0 }}>
              <img src={msg.fileUrl} alt={msg.fileName || "image"} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
            </a>
          )}
          {msg.fileUrl && (msg.fileType?.startsWith("video/") || msg.fileType === "video") && (
            <video src={msg.fileUrl} controls style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block", marginBottom: msg.text && !msg.text.startsWith("📎") ? 6 : 0 }} />
          )}
          {msg.fileUrl && !msg.fileType?.startsWith("image/") && msg.fileType !== "image" && !msg.fileType?.startsWith("video/") && msg.fileType !== "video" && (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)", borderRadius: 10, textDecoration: "none", color: "#d4c6f0",
              marginBottom: msg.text && !msg.text.startsWith("📎") ? 6 : 0, fontSize: 12
            }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.fileName || "Файл"}</span>
              <span style={{ fontSize: 14, flexShrink: 0, color: "#a855f7" }}>↓</span>
            </a>
          )}
          {(!msg.fileUrl || (msg.text && !msg.text.startsWith("📎"))) && msg.text}
        </div>
        {unique.length > 0 && (
          <div style={{ display: "flex", gap: 3, marginTop: 4, justifyContent: isClient ? "flex-end" : "flex-start" }}>
            {unique.map(r => (
              <span key={r} style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 12, padding: "1px 7px", fontSize: 12 }}>
                {r} {(msg.reactions || []).filter(x => x === r).length}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 3, justifyContent: isClient ? "flex-end" : "flex-start" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>{fmtTime(msg.createdAt)}</span>
          {isClient && <span style={{ fontSize: 11, color: msg.isRead ? "#a855f7" : "rgba(255,255,255,0.28)" }}>{msg.isRead ? "✓✓" : "✓"}</span>}
        </div>
        {hovered && (
          <button onClick={() => setShowPicker(p => !p)} style={{
            position: "absolute", top: "50%", [isClient ? "left" : "right"]: -30, transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%",
            width: 24, height: 24, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.5)"
          }}>😊</button>
        )}
        {showPicker && (
          <div style={{
            position: "absolute", bottom: "calc(100%+8px)", left: 0,
            background: "#1a1230", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 24,
            padding: "5px 8px", display: "flex", gap: 3, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
          }}>
            {EMOJI_REACTIONS.map(e => (
              <button key={e} onClick={() => { onReact(msg.id, e); setShowPicker(false); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "2px 3px", borderRadius: 6, transition: "transform 0.15s" }}
                onMouseEnter={ev => (ev.currentTarget.style.transform = "scale(1.3)")}
                onMouseLeave={ev => (ev.currentTarget.style.transform = "none")}
              >{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FAQItem({ q, a, onAsk }: { q: string; a: string; onAsk: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${open ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: "100%", background: "none", border: "none", padding: "11px 13px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", color: "#e2d9f3", fontSize: 12, fontWeight: 600, fontFamily: "Nunito,sans-serif", textAlign: "left", gap: 8
      }}>
        {q}
        <span style={{ color: "#a855f7", fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 13px 11px" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 8 }}>{a}</p>
          <button onClick={onAsk} style={{
            background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 8,
            padding: "4px 11px", fontSize: 11, color: "#a855f7", cursor: "pointer", fontFamily: "Nunito,sans-serif", fontWeight: 600
          }}>Спросить подробнее →</button>
        </div>
      )}
    </div>
  );
}

function getGuestToken(): string {
  let token = localStorage.getItem("cw_guest_token");
  if (!token) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("cw_guest_token", token);
  }
  return token;
}

function guestHeaders(): Record<string, string> {
  return { "X-Guest-Token": getGuestToken() };
}

export default function ChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [minimized, setMinimized] = useState(true);
  const [tab, setTab] = useState<"chat" | "info" | "faq">("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [greeting, setGreeting] = useState("Добрый день! Чем могу помочь?");
  const [attachMenu, setAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typing, setTyping] = useState(false);
  const [supportOnline, setSupportOnline] = useState(false);
  const [guestName, setGuestName] = useState(() => localStorage.getItem("cw_guest_name") || "");
  const [guestReady, setGuestReady] = useState(() => !!localStorage.getItem("cw_guest_name"));
  const [nameInput, setNameInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const linkedRef = useRef(false);
  const lastMsgIdRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);
  const [soundOn, setSoundOn] = useState(() => getSoundEnabled("cw_sound"));

  const isAdminPage = location.startsWith("/admin");
  const canChat = isAuthenticated || guestReady;

  useEffect(() => {
    if (isAuthenticated && !linkedRef.current) {
      linkedRef.current = true;
      const gt = localStorage.getItem("cw_guest_token");
      if (gt) {
        fetch("/api/chat/link-guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ guestToken: gt }),
        }).then(() => {
          localStorage.removeItem("cw_guest_token");
          localStorage.removeItem("cw_guest_name");
          setConversationId(null);
          setMessages([]);
          fetch("/api/chat/conversations", { credentials: "include" })
            .then(r => r.json())
            .then((convs: any[]) => {
              if (convs.length > 0) {
                setConversationId(convs[0].id);
                setUnread(convs[0].unreadUser || 0);
              }
            }).catch(() => {});
        }).catch(() => {});
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetch("/api/chat/settings/public").then(r => { if (!r.ok) return; return r.json(); }).then(d => {
      if (d?.greeting) setGreeting(d.greeting);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const check = () => fetch("/api/chat/support-status").then(r => r.json()).then(d => setSupportOnline(!!d?.online)).catch(() => {});
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!canChat) return;
    const headers: Record<string, string> = isAuthenticated ? {} : guestHeaders();
    fetch("/api/chat/conversations", { credentials: "include", headers })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((convs: any[]) => {
        if (convs.length > 0) {
          setConversationId(convs[0].id);
          setUnread(convs[0].unreadUser || 0);
        }
      })
      .catch(() => {});
  }, [canChat, isAuthenticated]);

  const loadMessages = useCallback(async (overrideId?: string) => {
    const cid = overrideId || conversationId;
    if (!cid) return;
    try {
      const headers: Record<string, string> = isAuthenticated ? {} : guestHeaders();
      const res = await fetch(`/api/chat/conversations/${cid}/messages`, { credentials: "include", headers });
      if (!res.ok) return;
      const data: Message[] = await res.json();
      if (data.length > 0) {
        const lastMsg = data[data.length - 1];
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
        } else if (lastMsgIdRef.current && lastMsg.id !== lastMsgIdRef.current && lastMsg.role === "admin") {
          if (getSoundEnabled("cw_sound")) {
            playNotificationSound("client");
          }
        }
        lastMsgIdRef.current = lastMsg.id;
      }
      setMessages(data);
    } catch {}
  }, [conversationId, isAuthenticated]);

  useEffect(() => {
    if (conversationId) loadMessages();
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!minimized && conversationId) {
      loadMessages();
      const headers: Record<string, string> = isAuthenticated ? {} : guestHeaders();
      fetch(`/api/chat/conversations/${conversationId}/read`, { method: "POST", credentials: "include", headers }).catch(() => {});
      setUnread(0);
      pollRef.current = setInterval(loadMessages, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [minimized, conversationId, loadMessages, isAuthenticated]);

  const unreadInitRef = useRef(true);
  useEffect(() => {
    if (minimized && canChat) {
      const checkInterval = setInterval(() => {
        const headers: Record<string, string> = isAuthenticated ? {} : guestHeaders();
        fetch("/api/chat/unread", { credentials: "include", headers }).then(r => { if (!r.ok) return; return r.json(); }).then(d => {
          if (d) {
            const newUnread = d.unread || 0;
            if (unreadInitRef.current) {
              unreadInitRef.current = false;
            } else if (newUnread > unread && getSoundEnabled("cw_sound")) {
              playNotificationSound("client");
            }
            setUnread(newUnread);
          }
        }).catch(() => {});
      }, 10000);
      return () => clearInterval(checkInterval);
    }
  }, [minimized, canChat, isAuthenticated, unread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!minimized) setUnread(0);
  }, [minimized]);

  const handleGuestSubmit = () => {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem("cw_guest_name", name);
    setGuestName(name);
    setGuestReady(true);
  };

  const handleSend = async () => {
    const t = input.trim();
    if (!t || !canChat) return;
    setInput("");
    setLoading(true);
    try {
      let cid = conversationId;
      const headers: Record<string, string> = { "Content-Type": "application/json", ...(isAuthenticated ? {} : guestHeaders()) };
      if (!cid) {
        const res = await fetch("/api/chat/conversations", {
          method: "POST", credentials: "include", headers,
          body: JSON.stringify({ subject: t.substring(0, 100), guestName: isAuthenticated ? undefined : guestName }),
        });
        const conv = await res.json();
        cid = conv.id;
        setConversationId(cid);
      }
      await fetch("/api/chat/messages", {
        method: "POST", credentials: "include", headers,
        body: JSON.stringify({ conversationId: cid, text: t }),
      });
      await loadMessages(cid!);
    } catch {}
    setLoading(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!canChat || uploading) return;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) { alert("Файл слишком большой (макс. 50 МБ)"); return; }
    setUploading(true);
    setAttachMenu(false);
    try {
      let cid = conversationId;
      const headers: Record<string, string> = { "Content-Type": "application/json", ...(isAuthenticated ? {} : guestHeaders()) };
      if (!cid) {
        const res = await fetch("/api/chat/conversations", {
          method: "POST", credentials: "include", headers,
          body: JSON.stringify({ subject: `📎 ${file.name}`, guestName: isAuthenticated ? undefined : guestName }),
        });
        const conv = await res.json();
        cid = conv.id;
        setConversationId(cid);
      }
      const presignRes = await fetch("/api/chat/upload", {
        method: "POST", credentials: "include", headers,
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!presignRes.ok) throw new Error("Upload presign failed");
      const { uploadUrl, fileUrl } = await presignRes.json();
      const putRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("S3 upload failed");
      const msgText = input.trim() || `📎 ${file.name}`;
      await fetch("/api/chat/messages", {
        method: "POST", credentials: "include", headers,
        body: JSON.stringify({ conversationId: cid, text: msgText, fileUrl, fileName: file.name, fileType: file.type }),
      });
      setInput("");
      await loadMessages(cid!);
    } catch (err) {
      console.error("File upload error:", err);
    }
    setUploading(false);
  };

  const handleFilePick = (accept: string) => {
    setAttachMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleReact = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newReactions = [...(msg.reactions || []), emoji];
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", ...(isAuthenticated ? {} : guestHeaders()) };
      await fetch(`/api/chat/messages/${msgId}/reactions`, {
        method: "POST", credentials: "include", headers,
        body: JSON.stringify({ reactions: newReactions }),
      });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: newReactions } : m));
    } catch {}
  };

  if (isAdminPage) return null;

  const display = searchQ ? messages.filter(m => m.text.toLowerCase().includes(searchQ.toLowerCase())) : messages;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800&family=Nunito:wght@400;500;600;700&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(168,85,247,.4)}50%{box-shadow:0 0 0 8px rgba(168,85,247,0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .cw-scroll::-webkit-scrollbar{width:4px;height:4px}
        .cw-scroll::-webkit-scrollbar-track{background:transparent}
        .cw-scroll::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.4);border-radius:2px}
        .cw-qr::-webkit-scrollbar{height:4px}
        .cw-qr::-webkit-scrollbar-track{background:transparent}
        .cw-qr::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.4);border-radius:2px}
        .cw-qr{scrollbar-width:thin;scrollbar-color:rgba(124,58,237,0.35) transparent}
      `}</style>
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, zIndex: 1000 }}>
        {!minimized && (
          <div style={{
            width: 390, height: 600, background: "#110c22", borderRadius: 20,
            display: "flex", flexDirection: "column", overflow: "hidden",
            border: "1px solid rgba(124,58,237,0.25)", boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)"
          }}>
            <div style={{ background: "linear-gradient(135deg,#1a0e35 0%,#2d1b69 50%,#1a0e35 100%)", padding: "14px 16px 12px", borderBottom: "1px solid rgba(124,58,237,0.2)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: "0 0 12px rgba(168,85,247,0.4)", border: "2px solid rgba(255,255,255,0.1)" }}>👩‍💼</div>
                    {supportOnline && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: "#22c55e", borderRadius: "50%", border: "2px solid #1a0e35", animation: "pulse 2s infinite" }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 13, fontWeight: 700, color: "#fff" }}>В КУРСЕ? Поддержка</div>
                    <div style={{ fontSize: 11, color: supportOnline ? "#22c55e" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: supportOnline ? "#22c55e" : "#64748b", display: "inline-block" }} />
                      {supportOnline ? "Онлайн · отвечаем за 2 мин" : "Оффлайн · ответим позже"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={() => setShowSearch(p => !p)} style={{
                    background: showSearch ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 30, height: 30,
                    cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>🔍</button>
                  <button onClick={() => setMinimized(true)} style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, width: 30, height: 30, cursor: "pointer", color: "rgba(255,255,255,0.6)",
                    fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center"
                  }}>✕</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {([["chat", "Чат"], ["info", "Информация"], ["faq", "FAQ"]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setTab(v as any)} style={{
                    background: tab === v ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)",
                    border: "none", borderRadius: 10, padding: "5px 13px", fontSize: 12, fontWeight: 600,
                    color: tab === v ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer", transition: "all 0.2s",
                    fontFamily: "Nunito,sans-serif"
                  }}>{l}</button>
                ))}
              </div>
              {showSearch && (
                <div style={{ marginTop: 9 }}>
                  <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder="Поиск по сообщениям..."
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,58,237,0.35)",
                      borderRadius: 10, padding: "7px 11px", color: "#e2d9f3", fontSize: 12, fontFamily: "Nunito,sans-serif",
                      boxSizing: "border-box" as const, outline: "none"
                    }}
                  />
                  {searchQ && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Найдено: {display.length}</div>}
                </div>
              )}
            </div>

            {tab === "chat" && !canChat && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 24px", gap: 14 }}>
                <div style={{ fontSize: 44, marginBottom: 4 }}>👋</div>
                <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", textAlign: "center" }}>Добро пожаловать!</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.6, maxWidth: 260 }}>
                  Представьтесь, чтобы начать диалог с поддержкой
                </div>
                <div style={{ width: "100%", maxWidth: 260, display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                  <input
                    autoFocus value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleGuestSubmit(); }}
                    placeholder="Ваше имя..."
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,58,237,0.35)",
                      borderRadius: 12, padding: "11px 14px", color: "#e2d9f3", fontSize: 14,
                      fontFamily: "Nunito,sans-serif", boxSizing: "border-box" as const, outline: "none",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.7)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"}
                  />
                  <button onClick={handleGuestSubmit} disabled={!nameInput.trim()} style={{
                    width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
                    background: nameInput.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)",
                    color: nameInput.trim() ? "#fff" : "rgba(255,255,255,0.3)",
                    fontSize: 14, fontWeight: 700, fontFamily: "Nunito,sans-serif",
                    cursor: nameInput.trim() ? "pointer" : "default",
                    transition: "all 0.2s",
                    boxShadow: nameInput.trim() ? "0 4px 14px rgba(124,58,237,0.4)" : "none"
                  }}>Начать чат</button>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8 }}>Или войдите в аккаунт для полного доступа</div>
              </div>
            )}

            {tab === "chat" && canChat && (
              <>
                <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
                <div
                  className="cw-scroll"
                  style={{ flex: 1, overflowY: "auto", padding: "13px 13px 6px", display: "flex", flexDirection: "column", gap: 8, scrollbarWidth: "thin" as const, scrollbarColor: "rgba(124,58,237,0.35) transparent", position: "relative" }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
                  onDrop={handleDrop}
                >
                  {dragOver && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(124,58,237,0.15)", border: "2px dashed #a855f7",
                      borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20,
                      color: "#a855f7", fontSize: 14, fontWeight: 600, fontFamily: "Nunito,sans-serif"
                    }}>
                      Перетащите файл сюда
                    </div>
                  )}
                  {display.length === 0 && !loading && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.4)" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "#e2d9f3" }}>Начните диалог</div>
                      <div style={{ fontSize: 12 }}>{greeting}</div>
                    </div>
                  )}
                  {display.map(msg => <MsgBubble key={msg.id} msg={msg} onReact={handleReact} />)}
                  {typing && <TypingIndicator />}
                  {uploading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                      <div style={{ width: 16, height: 16, border: "2px solid rgba(168,85,247,0.3)", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Загрузка файла...
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
                <div className="cw-qr" style={{ padding: "7px 13px 0", display: "flex", gap: 5, overflowX: "auto", flexShrink: 0 }}>
                  {QUICK_REPLIES.map(r => (
                    <button key={r} onClick={() => setInput(r)} style={{
                      background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
                      borderRadius: 20, padding: "4px 11px", fontSize: 11,
                      color: "rgba(255,255,255,0.55)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Nunito,sans-serif", flexShrink: 0
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.3)"; e.currentTarget.style.color = "#e2d9f3"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                    >{r}</button>
                  ))}
                </div>
                <div style={{ padding: "9px 13px 13px", flexShrink: 0 }}>
                  {attachMenu && (
                    <div style={{ background: "#1a1230", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 13, padding: 5, display: "flex", flexDirection: "column", gap: 1, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", marginBottom: 6 }}>
                      {([["🖼️", "Изображение", "image/*"], ["📄", "Документ", ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"], ["🎥", "Видео", "video/*"]] as [string, string, string][]).map(([ic, lb, accept]) => (
                        <button key={lb} onClick={() => handleFilePick(accept)} style={{ background: "none", border: "none", borderRadius: 8, padding: "7px 11px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Nunito,sans-serif" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.2)"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                        >{ic} {lb}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 7, background: "rgba(255,255,255,0.04)", border: `1px solid ${input ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.09)"}`, borderRadius: 16, padding: "7px 7px 7px 12px", transition: "border-color 0.2s", position: "relative" }}>
                    <button onClick={() => setAttachMenu(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: uploading ? "#a855f7" : "rgba(255,255,255,0.35)", fontSize: 17, display: "flex", alignItems: "center", paddingBottom: 3 }}
                      onMouseEnter={e => { if (!uploading) e.currentTarget.style.color = "#a855f7"; }}
                      onMouseLeave={e => { if (!uploading) e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                      disabled={uploading}
                    >📎</button>
                    <textarea value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Напишите сообщение..." rows={1}
                      style={{ flex: 1, background: "none", border: "none", color: "#e2d9f3", fontSize: 13, fontFamily: "Nunito,sans-serif", resize: "none", lineHeight: 1.5, maxHeight: 78, overflowY: "hidden", outline: "none" }}
                      onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 78) + "px"; }}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || loading || uploading} style={{
                      width: 36, height: 36, borderRadius: 11,
                      background: input.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)",
                      border: "none", cursor: input.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                      transition: "all 0.2s", flexShrink: 0,
                      boxShadow: input.trim() ? "0 4px 14px rgba(124,58,237,0.4)" : "none",
                      opacity: loading || uploading ? 0.5 : 1
                    }}>➤</button>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Защищено SSL · В КУРСЕ? © 2024</div>
                </div>
              </>
            )}

            {tab === "info" && (
              <div className="cw-scroll" style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 4 }}>🕐 Время работы</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                    Пн–Пт: 09:00 – 22:00<br />Сб–Вс: 10:00 – 20:00<br />
                    {supportOnline
                      ? <span style={{ color: "#22c55e" }}>● Сейчас онлайн</span>
                      : <span style={{ color: "#64748b" }}>● Сейчас оффлайн</span>}
                  </div>
                </div>
                <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "11px 13px", marginBottom: 7, display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ fontSize: 20 }}>📱</span>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Telegram</div>
                    <div style={{ fontSize: 13, color: "#e2d9f3", fontWeight: 600 }}>@vkurse_support</div>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "10px 13px", marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🔊</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#d4c6f0" }}>Звук</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Звуковые уведомления</div>
                      </div>
                    </div>
                    <button onClick={() => { const v = !soundOn; setSoundOn(v); setSoundEnabled("cw_sound", v); }} style={{
                      width: 36, height: 20, borderRadius: 10,
                      background: soundOn ? "linear-gradient(90deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)",
                      border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s", flexShrink: 0
                    }}>
                      <div style={{ position: "absolute", top: 2, left: soundOn ? 17 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                    </button>
                  </div>
                </div>
                <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(168,85,247,0.1))", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 14, padding: 15, textAlign: "center", marginTop: 7 }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>⭐</div>
                  <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 26, fontWeight: 800, color: "#a855f7" }}>4.9/5</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>★★★★★ 12 847 отзывов</div>
                </div>
              </div>
            )}

            {tab === "faq" && (
              <div className="cw-scroll" style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ fontFamily: "Unbounded,sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 3 }}>Частые вопросы</div>
                {FAQ_ITEMS.map((item, i) => (
                  <FAQItem key={i} q={item.q} a={item.a} onAsk={() => { setTab("chat"); setInput(item.q); }} />
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setMinimized(p => !p)}
          style={{
            width: 58, height: 58, borderRadius: "50%",
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 25, boxShadow: "0 8px 28px rgba(124,58,237,0.5),0 0 0 3px rgba(168,85,247,0.2)",
            transition: "transform 0.2s", position: "relative",
            animation: minimized ? "pulse 2s infinite" : "none"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {minimized ? "💬" : "✕"}
          {minimized && unread > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              background: "#ef4444", borderRadius: "50%",
              width: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff", border: "2px solid #0d0a1a"
            }}>{unread}</span>
          )}
        </button>
      </div>
    </>
  );
}
