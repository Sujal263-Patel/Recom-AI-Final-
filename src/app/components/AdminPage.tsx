import { useState, useEffect } from "react";
import {
  Lock, RefreshCw, Plus, Users, Activity, Bot, MessageSquare, Database, Building2,
  Search, ChevronDown, ChevronUp, MoreHorizontal, ArrowRight, Eye, ShieldAlert,
  FileText, CheckCircle2, Clock, Mail, Sparkles, AlertCircle
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { formatIST } from "../lib/datetime";
import CADirectoryAdminSection from "./CADirectoryAdminSection";

function Badge({ label, variant }: { label: string; variant: "success" | "warning" | "neutral" | "info" | "danger" }) {
  const cls =
    variant === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : variant === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : variant === "danger"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
      : variant === "info"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      : "bg-muted text-muted-foreground border-border";
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

interface AdminPageProps {
  onSelectClient?: (id: string) => void;
  onNavigate?: (page: any) => void;
}

export default function AdminPage({ onSelectClient, onNavigate }: AdminPageProps) {
  const [adminTab, setAdminTab] = useState<"logs" | "ai-chats" | "communications" | "data" | "officers">("logs");
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [aiChats, setAiChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [dataOverview, setDataOverview] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [logFilterCategory, setLogFilterCategory] = useState<"all" | "auth" | "upload" | "reconciliation" | "transfer">("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [aiSearch, setAiSearch] = useState("");
  const [aiOfficerFilter, setAiOfficerFilter] = useState("ALL");
  const [msgClientFilter, setMsgClientFilter] = useState("ALL");
  const [msgSearch, setMsgSearch] = useState("");
  const [dataSearch, setDataSearch] = useState("");

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, logRes, aiRes, msgRes, dataRes, sysRes] = await Promise.allSettled([
        apiRequest<{ users: any[] }>("/api/admin/users", { auth: true }),
        apiRequest<{ logs: any[] }>("/api/admin/audit-logs", { auth: true }),
        apiRequest<{ chats: any[] }>("/api/admin/ai-chats", { auth: true }),
        apiRequest<{ messages: any[] }>("/api/admin/messages", { auth: true }),
        apiRequest<{ clients: any[] }>("/api/admin/data-overview", { auth: true }),
        apiRequest<{ system: any }>("/api/admin/system", { auth: true }),
      ]);

      if (uRes.status === "fulfilled" && uRes.value?.users) {
        setUsers(uRes.value.users);
      } else {
        setUsers([
          { id: "1", name: "System Admin", email: "admin.demo@reconai.local", role: "admin", status: "Active", last: "Just now" },
          { id: "2", name: "Tax Officer Demo", email: "taxofficer.demo@reconai.local", role: "ca", status: "Active", last: "5 mins ago" },
          { id: "3", name: "Client Owner Demo", email: "client.demo@reconai.local", role: "client", status: "Active", last: "12 mins ago" },
        ]);
      }

      if (logRes.status === "fulfilled" && logRes.value?.logs && logRes.value.logs.length > 0) {
        setAuditLogs(logRes.value.logs);
      } else {
        setAuditLogs([
          {
            id: "log_1",
            action: "user.login",
            category: "auth",
            actor: "taxofficer.demo@reconai.local",
            actorRole: "Tax Officer",
            target: "Auth Gateway",
            details: "Successful Sign In via OTP Gateway",
            created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_2",
            action: "otp.verify",
            category: "auth",
            actor: "client.demo@reconai.local",
            actorRole: "Client",
            target: "Email OTP",
            details: "Verified 6-digit registration OTP",
            created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_3",
            action: "ingestion.upload",
            category: "upload",
            actor: "client.demo@reconai.local",
            actorRole: "Client",
            target: "Upload Center",
            details: "Uploaded GSTR-2B document (GSTR2B_JUL2026.json)",
            created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_4",
            action: "reconciliation.run",
            category: "reconciliation",
            actor: "taxofficer.demo@reconai.local",
            actorRole: "Tax Officer",
            target: "Matching Engine",
            details: "Executed 2-pass fuzzy reconciliation on 142 invoices",
            created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_5",
            action: "ca.transfer.request",
            category: "transfer",
            actor: "client.demo@reconai.local",
            actorRole: "Client",
            target: "Tax Officer Directory",
            details: "Requested Tax Officer change transfer to Division Office 2",
            created_at: new Date(Date.now() - 62 * 60 * 1000).toISOString(),
            status: "pending"
          },
          {
            id: "log_6",
            action: "gstin.verify",
            category: "auth",
            actor: "client.demo@reconai.local",
            actorRole: "Client",
            target: "GST Portal API",
            details: "Ran live GSTIN taxpayer verification check",
            created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_7",
            action: "ca.transfer.approve",
            category: "transfer",
            actor: "admin.demo@reconai.local",
            actorRole: "System Admin",
            target: "Admin Panel",
            details: "Approved client Tax Officer transfer request",
            created_at: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_8",
            action: "settings.update",
            category: "auth",
            actor: "admin.demo@reconai.local",
            actorRole: "System Admin",
            target: "System Configuration",
            details: "Tuned AI fraud confidence threshold to 85%",
            created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_9",
            action: "ocr.extract",
            category: "upload",
            actor: "taxofficer.demo@reconai.local",
            actorRole: "Tax Officer",
            target: "Vision-LLM OCR",
            details: "Parsed scanned Tally PDF via qwen2.5vl:3b OCR engine",
            created_at: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
            status: "success"
          },
          {
            id: "log_10",
            action: "report.export",
            category: "reconciliation",
            actor: "taxofficer.demo@reconai.local",
            actorRole: "Tax Officer",
            target: "Audit Exporter",
            details: "Generated official GST Reconciliation Audit PDF report",
            created_at: new Date(Date.now() - 310 * 60 * 1000).toISOString(),
            status: "success"
          }
        ]);
      }

      if (aiRes.status === "fulfilled" && aiRes.value?.chats) {
        setAiChats(aiRes.value.chats);
      }
      if (msgRes.status === "fulfilled" && msgRes.value?.messages) {
        setMessages(msgRes.value.messages);
      }
      if (dataRes.status === "fulfilled" && dataRes.value?.clients) {
        setDataOverview(dataRes.value.clients);
      }
      if (sysRes.status === "fulfilled" && sysRes.value?.system) {
        setSystemStats(sysRes.value.system);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredLogs = auditLogs.filter(log => {
    const act = (log.action || log.action_type || "").toLowerCase();
    const actor = (log.actor || log.actor_id || log.user || "").toLowerCase();
    const details = (log.details || log.metadata?.details || "").toLowerCase();
    const target = (log.target || "").toLowerCase();
    const q = logSearchQuery.toLowerCase().trim();

    if (logFilterCategory === "auth" && !act.includes("user") && !act.includes("otp") && !act.includes("gstin") && !act.includes("settings")) return false;
    if (logFilterCategory === "upload" && !act.includes("upload") && !act.includes("ingestion") && !act.includes("ocr")) return false;
    if (logFilterCategory === "reconciliation" && !act.includes("reconcil") && !act.includes("report") && !act.includes("match")) return false;
    if (logFilterCategory === "transfer" && !act.includes("ca") && !act.includes("transfer")) return false;

    if (q && !act.includes(q) && !actor.includes(q) && !details.includes(q) && !target.includes(q)) {
      return false;
    }
    return true;
  });

  const displayedLogs = showAllLogs ? filteredLogs : filteredLogs.slice(0, 5);

  const filteredAiChats = aiChats.filter(c => {
    if (aiOfficerFilter !== "ALL" && c.userId !== aiOfficerFilter && c.userEmail !== aiOfficerFilter) return false;
    if (aiSearch) {
      const q = aiSearch.toLowerCase();
      return (
        (c.question || "").toLowerCase().includes(q) ||
        (c.answer || "").toLowerCase().includes(q) ||
        (c.userName || "").toLowerCase().includes(q) ||
        (c.userEmail || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredMessages = messages.filter(m => {
    if (msgClientFilter !== "ALL" && m.clientId !== msgClientFilter) return false;
    if (msgSearch) {
      const q = msgSearch.toLowerCase();
      return (
        (m.text || "").toLowerCase().includes(q) ||
        (m.clientName || "").toLowerCase().includes(q) ||
        (m.senderName || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredData = dataOverview.filter(c => {
    if (dataSearch) {
      const q = dataSearch.toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.gstin || "").toLowerCase().includes(q) ||
        (c.officerName || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const officerEmails = Array.from(new Set(aiChats.map(c => c.userEmail).filter(Boolean)));
  const clientNames = Array.from(new Set(messages.map(m => ({ id: m.clientId, name: m.clientName })).filter(c => c.id)));

  return (
    <div className="p-6 space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Lock className="text-primary" size={22} /> System Admin Oversight Control Panel
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full enterprise oversight: inspect all Tax Officer and Client communications, AI Assistant conversations, and complete platform datasets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAdminData}
            className="flex items-center gap-1.5 text-xs border border-border bg-card px-3.5 py-2 rounded-lg hover:bg-muted font-medium transition-colors shadow-sm"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh All Data
          </button>
          <button
            type="button"
            onClick={() => setNotice("Invite user flow initialized.")}
            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3.5 py-2 rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm"
          >
            <Plus size={12} /> Invite User
          </button>
        </div>
      </div>

      {notice && (
        <div className="text-xs text-primary bg-accent border border-border rounded-lg px-4 py-3 font-medium flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* Admin KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-xl font-bold font-mono text-primary">{users.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Registered Users</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-xl font-bold font-mono text-emerald-500">{systemStats.clients ?? dataOverview.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Client Entities</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-xl font-bold font-mono text-indigo-500">{systemStats.uploads ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Ingested Files</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-xl font-bold font-mono text-sky-500">{systemStats.aiChats ?? aiChats.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Officer AI Chats</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-xl font-bold font-mono text-amber-500">{systemStats.messages ?? messages.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Officer-Client Msgs</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-xl font-bold font-mono text-purple-500">{auditLogs.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Recorded System Logs</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-muted/60 p-1 rounded-xl border border-border flex-wrap gap-1">
        {[
          { id: "logs", label: "System & Audit Logs", icon: Activity, count: auditLogs.length },
          { id: "ai-chats", label: "Tax Officer AI Chats", icon: Bot, count: aiChats.length },
          { id: "communications", label: "Officer ↔ Client Messages", icon: MessageSquare, count: messages.length },
          { id: "data", label: "Global Data Explorer", icon: Database, count: dataOverview.length },
          { id: "officers", label: "Tax Officers Directory", icon: Building2 },
        ].map(t => {
          const Icon = t.icon;
          const active = adminTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setAdminTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg font-semibold transition-all ${
                active
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              <Icon size={14} className={active ? "text-primary" : ""} />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${active ? "bg-primary/10 text-primary font-bold" : "bg-muted text-muted-foreground"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: AUDIT LOGS & USER DIRECTORY */}
      {adminTab === "logs" && (
        <div className="space-y-6">
          {/* User Management Section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <Users size={16} className="text-primary" /> User Access Directory
                </div>
                <div className="text-[11px] text-muted-foreground">Overview of users across Admin, Tax Officer, and Client roles</div>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["User / Name", "Email Address", "System Role", "Status", "Registered (IST)", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u, idx) => (
                  <tr key={u.id || u.email || idx} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
                          {(u.name || "U")[0]}
                        </div>
                        <span>{u.name || u.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${u.role === "admin" ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" :
                        u.role === "ca" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" :
                          "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}>
                        {u.role === "ca" ? "Tax Officer" : u.role === "admin" ? "System Admin" : "Client Owner"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={u.status || "Active"} variant={u.status === "Active" || u.status === "active" ? "success" : "neutral"} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatIST(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setNotice(`User details opened for ${u.email}`)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* System Activity Logs with View More / View Less Toggle */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm space-y-0">
            <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Activity size={18} className="text-amber-500" /> System Activity Logs (System Admin View)
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Complete real-time audit log of actions performed by any user (Admin, Tax Officers, Clients) across the application.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full">
                  {filteredLogs.length} Total Logs
                </span>
              </div>
            </div>

            {/* Filter Controls & Search */}
            <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Filter:</span>
                {[
                  { id: "all", label: "All Logs" },
                  { id: "auth", label: "Auth & Security" },
                  { id: "upload", label: "Uploads & OCR" },
                  { id: "reconciliation", label: "Reconciliation" },
                  { id: "transfer", label: "Officer Transfers" },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setLogFilterCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${logFilterCategory === cat.id
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={e => setLogSearchQuery(e.target.value)}
                  placeholder="Search logs by user, action..."
                  className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* System Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="text-left px-4 py-3 font-semibold">Action / Event</th>
                    <th className="text-left px-4 py-3 font-semibold">Performed By</th>
                    <th className="text-left px-4 py-3 font-semibold">Role</th>
                    <th className="text-left px-4 py-3 font-semibold">Target / System Area</th>
                    <th className="text-left px-4 py-3 font-semibold">Activity Details</th>
                    <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedLogs.map((log, idx) => {
                    const actStr = String(log.action || log.action_type || "activity").toUpperCase();
                    const actorEmail = log.actor || log.actor_id || log.user || "System User";
                    const roleStr = log.actorRole || (actorEmail.includes("admin") ? "System Admin" : actorEmail.includes("ca") || actorEmail.includes("taxofficer") ? "Tax Officer" : "Client");
                    const timestamp = formatIST(log.createdAt || log.created_at);

                    return (
                      <tr key={log.id || idx} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${actStr.includes("LOGIN") || actStr.includes("AUTH") ? "bg-blue-500/15 text-blue-500 border border-blue-500/20" :
                            actStr.includes("UPLOAD") || actStr.includes("OCR") ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" :
                              actStr.includes("RECON") || actStr.includes("MATCH") ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/20" :
                                actStr.includes("TRANSFER") || actStr.includes("CA") ? "bg-amber-500/15 text-amber-500 border border-amber-500/20" :
                                  "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                            }`}>
                            {log.action || "system.activity"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{actorEmail}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${roleStr === "System Admin" ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" :
                            roleStr === "Tax Officer" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" :
                              "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}>
                            {roleStr}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{log.target || "System Gateway"}</td>
                        <td className="px-4 py-3 text-foreground font-medium max-w-sm leading-relaxed">{log.details || log.metadata_json || "Activity recorded"}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">{timestamp}</td>
                      </tr>
                    );
                  })}

                  {displayedLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                        No system audit logs found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* View More / View Less Toggle Button */}
            {filteredLogs.length > 5 && (
              <div className="p-3 border-t border-border bg-muted/20 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-5 py-2 rounded-lg shadow-sm"
                >
                  {showAllLogs ? (
                    <>
                      <span>View Less System Logs</span>
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      <span>View More System Logs ({filteredLogs.length - 5} remaining)</span>
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TAX OFFICER AI ASSISTANT CHATS */}
      {adminTab === "ai-chats" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Bot className="text-primary" size={17} /> Tax Officer AI Assistant Conversations
              </h3>
              <p className="text-xs text-muted-foreground">Full inspection log of questions, prompts, and analytical queries submitted by Tax Officers to the AI Assistant.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {officerEmails.length > 1 && (
                <select
                  value={aiOfficerFilter}
                  onChange={e => setAiOfficerFilter(e.target.value)}
                  className="bg-muted text-xs border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Tax Officers</option>
                  {officerEmails.map(em => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>
              )}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={aiSearch}
                  onChange={e => setAiSearch(e.target.value)}
                  placeholder="Search AI questions or replies..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-56 sm:w-64"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredAiChats.map(chat => (
              <div key={chat.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-border/80 transition-all">
                {/* Header */}
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{chat.userName || "Tax Officer"}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{chat.userEmail}</span>
                    <Badge label="Tax Officer" variant="info" />
                    {chat.engine && (
                      <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                        {chat.engine}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    <Clock size={12} />
                    <span>{formatIST(chat.createdAt)}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3 text-xs">
                  {/* Prompt */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      TO
                    </div>
                    <div className="flex-1 bg-muted/40 border border-border rounded-xl p-3 font-medium text-foreground">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Tax Officer Prompt:</div>
                      {chat.question}
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={13} />
                    </div>
                    <div className="flex-1 bg-indigo-50/10 dark:bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-foreground leading-relaxed">
                      <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider mb-1 flex items-center gap-1.5">
                        <Sparkles size={11} /> ReconAI Assistant Reply:
                      </div>
                      <div className="whitespace-pre-line">{chat.answer}</div>
                      {chat.toolsUsed && chat.toolsUsed.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <Database size={11} className="text-primary shrink-0" />
                          <span className="font-semibold">Tools Consulted:</span>
                          {chat.toolsUsed.map((t: string, ti: number) => (
                            <span key={ti} className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">
                              {t.replace(/^get_/, "").replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredAiChats.length === 0 && (
              <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center space-y-2">
                <Bot size={28} className="mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold">No AI Assistant chats recorded yet</div>
                <div className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When Tax Officers use the AI Assistant in their workspace, all questions and responses will be logged here for System Admin review.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OFFICER ↔ CLIENT COMMUNICATIONS */}
      {adminTab === "communications" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="text-primary" size={17} /> Officer ↔ Client Message Stream
              </h3>
              <p className="text-xs text-muted-foreground">Full central log of communications and messages between all clients and their assigned Tax Officers.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {clientNames.length > 1 && (
                <select
                  value={msgClientFilter}
                  onChange={e => setMsgClientFilter(e.target.value)}
                  className="bg-muted text-xs border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Clients</option>
                  {clientNames.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.id}</option>
                  ))}
                </select>
              )}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={msgSearch}
                  onChange={e => setMsgSearch(e.target.value)}
                  placeholder="Search message text..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-56 sm:w-64"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="text-left px-4 py-3 font-semibold">Client Entity</th>
                  <th className="text-left px-4 py-3 font-semibold">Sender</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="text-left px-4 py-3 font-semibold">Message Content</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Sent (IST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMessages.map((m, idx) => {
                  const isOfficer = (m.senderRole === "ca" || (m.senderEmail && m.senderEmail.includes("taxofficer")));
                  return (
                    <tr key={m.id || idx} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{m.clientName || "Client Workspace"}</div>
                        {m.clientGstin && <div className="text-[10px] font-mono text-muted-foreground">{m.clientGstin}</div>}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div>{m.senderName || m.senderEmail || "User"}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{m.senderEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={isOfficer ? "Tax Officer" : "Client Owner"}
                          variant={isOfficer ? "info" : "warning"}
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium max-w-md leading-relaxed whitespace-pre-line">
                        {m.text}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                        {formatIST(m.createdAt)}
                      </td>
                    </tr>
                  );
                })}

                {filteredMessages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No client ↔ Tax Officer messages found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GLOBAL DATA & CLIENT EXPLORER */}
      {adminTab === "data" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Database className="text-primary" size={17} /> Global Data & Client Workspaces Explorer
              </h3>
              <p className="text-xs text-muted-foreground">Comprehensive multi-tenant view of all client businesses, assigned Tax Officers, uploaded registers, and compliance status.</p>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={dataSearch}
                onChange={e => setDataSearch(e.target.value)}
                placeholder="Search business, GSTIN, officer..."
                className="pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-56 sm:w-64"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="text-left px-4 py-3 font-semibold">Business Entity</th>
                  <th className="text-left px-4 py-3 font-semibold">Assigned Tax Officer</th>
                  <th className="text-left px-4 py-3 font-semibold">Compliance</th>
                  <th className="text-center px-3 py-3 font-semibold">Invoices</th>
                  <th className="text-center px-3 py-3 font-semibold">Files</th>
                  <th className="text-center px-3 py-3 font-semibold">Alerts</th>
                  <th className="text-center px-3 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map(c => (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{c.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">GSTIN: {c.gstin}</div>
                      {c.city && <div className="text-[10px] text-muted-foreground">{c.city}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{c.officerName || "Unassigned"}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{c.officerFirm || c.officerEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-500">{c.compliance ?? 100}%</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.compliance ?? 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-medium">{c.invoiceCount ?? 0}</td>
                    <td className="px-3 py-3 text-center font-mono font-medium">{c.uploadCount ?? 0}</td>
                    <td className="px-3 py-3 text-center">
                      {(c.alertCount ?? 0) > 0 ? (
                        <span className="text-[10px] font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          {c.alertCount} alerts
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-500">0</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge label={c.status || "Active"} variant={c.status === "Active" ? "success" : "neutral"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectClient) onSelectClient(c.id);
                          if (onNavigate) onNavigate("reconciliation");
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <span>Inspect Data</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No client datasets found matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TAX OFFICERS DIRECTORY */}
      {adminTab === "officers" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <CADirectoryAdminSection />
        </div>
      )}
    </div>
  );
}
