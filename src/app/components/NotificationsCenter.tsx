import { useState, useEffect } from "react";
import {
  Bell, CheckCircle2, AlertTriangle, AlertCircle, Info, X, Search,
  RefreshCw, FileText, Upload, ShieldAlert, Cpu, Sparkles, Filter, Check
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { formatIST } from "../lib/datetime";

export interface AppNotification {
  id: string | number;
  type: "critical" | "warning" | "success" | "info";
  category: "upload" | "itc" | "approved" | "fraud" | "system" | "all";
  title: string;
  msg: string;
  client?: string;
  actor?: string;
  time: string;
  read: boolean;
}

interface NotificationsCenterProps {
  user: {
    name: string;
    email: string;
    role: "admin" | "ca" | "client";
    firmName?: string;
  };
}

export default function NotificationsCenter({ user }: NotificationsCenterProps) {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const role = user?.role || "ca";

  const getSeedNotifsForRole = (): AppNotification[] => {
    const now = Date.now();
    if (role === "admin") {
      return [
        {
          id: "seed_admin_1",
          type: "info",
          category: "upload",
          title: "Client Document Upload: purchase_register.csv",
          msg: "Suraksha Fabricators Pvt Ltd uploaded purchase_register.csv containing 14 invoices for July 2026. Successfully ingested into books.",
          client: "Suraksha Fabricators Pvt Ltd",
          actor: "Client",
          time: new Date(now - 12 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_admin_2",
          type: "success",
          category: "itc",
          title: "Tax Officer ITC Claim: Batch Extraction Verified",
          msg: "Tax Officer executed batch OCR & claimed ₹2,26,466.40 in eligible ITC for Suraksha Fabricators. Reconciled against GSTR-2B.",
          client: "Suraksha Fabricators Pvt Ltd",
          actor: "Tax Officer Demo",
          time: new Date(now - 34 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_admin_3",
          type: "info",
          category: "upload",
          title: "Client Document Upload: GSTR2B_JUL2026.json",
          msg: "Zenith Office Solutions uploaded statutory counterparty GSTR-2B JSON return for July 2026.",
          client: "Zenith Office Solutions",
          actor: "Client",
          time: new Date(now - 65 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_admin_4",
          type: "critical",
          category: "fraud",
          title: "Critical ITC Risk Alert: Invoice SPE/26-27/0017",
          msg: "Suraksha Fabricators Pvt Ltd: ₹2,26,466.40 ITC at stake. Missing in GSTR-2B portal filing — cannot verify statutory eligibility.",
          client: "Suraksha Fabricators Pvt Ltd",
          actor: "AI Fraud Engine",
          time: new Date(now - 110 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_admin_5",
          type: "success",
          category: "itc",
          title: "Tax Officer Audit: 2-Pass Reconciliation Run",
          msg: "Tax Officer completed 2-pass fuzzy matching on Pioneer Auto Components (42 total items, 96.4% match rate).",
          client: "Pioneer Auto Components",
          actor: "Tax Officer Demo",
          time: new Date(now - 180 * 60 * 1000).toISOString(),
          read: true,
        },
        {
          id: "seed_admin_6",
          type: "info",
          category: "system",
          title: "System Access: Tax Officer Sign In",
          msg: "taxofficer.demo@reconai.local authenticated successfully via OTP gateway from verified IP.",
          client: "Global System",
          actor: "System Gateway",
          time: new Date(now - 240 * 60 * 1000).toISOString(),
          read: true,
        },
      ];
    } else if (role === "ca") {
      return [
        {
          id: "seed_ca_1",
          type: "info",
          category: "upload",
          title: "New Client Files Uploaded: 10 Tax Invoices",
          msg: "Zenith Office Solutions uploaded 10 Tax Invoices (PDF/Scanned). Ready for AI Vision-LLM batch processing in Client Documents.",
          client: "Zenith Office Solutions",
          actor: "Zenith Office Solutions",
          time: new Date(now - 8 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_ca_2",
          type: "warning",
          category: "upload",
          title: "Pending Batch Extractions: 14 Unprocessed Items",
          msg: "Suraksha Fabricators Pvt Ltd has 14 documents pending extraction. Maximum 10 can be processed simultaneously.",
          client: "Suraksha Fabricators Pvt Ltd",
          actor: "Extraction Queue",
          time: new Date(now - 28 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_ca_3",
          type: "critical",
          category: "itc",
          title: "ITC Discrepancy Alert: Invoice SPE/26-27/0017",
          msg: "Suraksha Fabricators Pvt Ltd: ₹2,26,466.40 ITC at risk — invoice is missing in counterparty GSTR-2B return.",
          client: "Suraksha Fabricators Pvt Ltd",
          actor: "Reconciliation Engine",
          time: new Date(now - 55 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_ca_4",
          type: "info",
          category: "upload",
          title: "Client Upload: GSTR-2B Statement",
          msg: "Pioneer Auto Components uploaded GSTR-2B counterparty filing for July 2026. Ready for reconciliation.",
          client: "Pioneer Auto Components",
          actor: "Pioneer Auto Components",
          time: new Date(now - 140 * 60 * 1000).toISOString(),
          read: true,
        },
        {
          id: "seed_ca_5",
          type: "success",
          category: "itc",
          title: "ITC Clean Match: Shreeji Plastics Industries",
          msg: "18 of 19 invoices matched counterparty return with zero discrepancies. ₹1,42,800 ITC verified.",
          client: "Shreeji Plastics Industries",
          actor: "Matching Engine",
          time: new Date(now - 210 * 60 * 1000).toISOString(),
          read: true,
        },
      ];
    } else {
      // Client role
      return [
        {
          id: "seed_cli_1",
          type: "success",
          category: "approved",
          title: "Document Approved: SPE-26-27-0001.pdf",
          msg: "Your Tax Officer verified and approved Tax Invoice SPE-26-27-0001. Line items and GST rates validated.",
          client: user.firmName || "Your Company",
          actor: "Tax Officer",
          time: new Date(now - 15 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_cli_2",
          type: "success",
          category: "itc",
          title: "ITC Claim Approved: ₹2,26,466 Eligible",
          msg: "Your Tax Officer approved and verified ₹2,26,466.40 eligible ITC claim for the July 2026 GST filing return.",
          client: user.firmName || "Your Company",
          actor: "Tax Officer",
          time: new Date(now - 45 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_cli_3",
          type: "success",
          category: "approved",
          title: "Batch Verification Complete: 10 Tax Invoices",
          msg: "All 10 uploaded Tax Invoices were successfully verified against counterparty GSTR-2B entries.",
          client: user.firmName || "Your Company",
          actor: "Tax Officer",
          time: new Date(now - 90 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: "seed_cli_4",
          type: "info",
          category: "upload",
          title: "Purchase Register Received",
          msg: "Your purchase_register.csv was uploaded and is currently under review by your assigned Tax Officer.",
          client: user.firmName || "Your Company",
          actor: "System Upload",
          time: new Date(now - 180 * 60 * 1000).toISOString(),
          read: true,
        },
      ];
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ notifications: AppNotification[] }>("/api/notifications", { auth: true });
      if (res && res.notifications && res.notifications.length > 0) {
        setNotifs(res.notifications);
      } else {
        setNotifs(getSeedNotifsForRole());
      }
    } catch {
      setNotifs(getSeedNotifsForRole());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [role]);

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotif = (id: string | number) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  // Category definitions based on role
  const categories = role === "admin"
    ? [
        { id: "all", label: "All Activity" },
        { id: "upload", label: "Client Document Uploads" },
        { id: "itc", label: "Tax Officer ITC Claims" },
        { id: "fraud", label: "Reconciliation & Fraud" },
        { id: "system", label: "System & Access" },
      ]
    : role === "ca"
    ? [
        { id: "all", label: "All Notifications" },
        { id: "upload", label: "Client Uploaded Files" },
        { id: "itc", label: "ITC Claims & Matching" },
      ]
    : [
        { id: "all", label: "All Notifications" },
        { id: "approved", label: "Approved Documents" },
        { id: "itc", label: "ITC Claims Verified" },
        { id: "upload", label: "Upload Status" },
      ];

  const filteredNotifs = notifs.filter(n => {
    if (activeCategory !== "all" && n.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        n.title.toLowerCase().includes(q) ||
        n.msg.toLowerCase().includes(q) ||
        (n.client && n.client.toLowerCase().includes(q)) ||
        (n.actor && n.actor.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  const iconMap = {
    critical: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
  };

  const colorMap = {
    critical: {
      icon: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300",
      pill: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    },
    warning: {
      icon: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
      pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    success: {
      icon: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
      pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    info: {
      icon: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
      pill: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {role === "admin"
                  ? "System Notification & Activity Dispatch Center"
                  : role === "ca"
                  ? "Tax Officer Notification Hub"
                  : "Client Notification & ITC Claims Center"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {role === "admin"
                  ? "Real-time feed of all client document uploads, Tax Officer ITC claims, batch extractions, and compliance alerts."
                  : role === "ca"
                  ? "Instant alerts for client uploaded documents, pending AI batch extractions, and ITC verification requirements."
                  : "Real-time status updates on all approved documents, verified ITC claims, and Tax Officer audit confirmations."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
              {unreadCount} Unread
            </span>
          )}
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="text-xs border border-border bg-card px-3 py-1.5 rounded-lg hover:bg-muted font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check size={13} /> Mark all read
          </button>
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="text-xs border border-border bg-card px-3 py-1.5 rounded-lg hover:bg-muted font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(cat => {
            const count = cat.id === "all" ? notifs.length : notifs.filter(n => n.category === cat.id).length;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-card border border-border text-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading && notifs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-primary" /> Loading live notifications...
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center space-y-2">
            <Bell size={32} className="mx-auto text-muted-foreground/60" />
            <div className="text-sm font-semibold text-foreground">No notifications in this view</div>
            <div className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || activeCategory !== "all"
                ? "No notifications match your search query or selected category filter."
                : "You have caught up with all current notifications."}
            </div>
            {(searchQuery || activeCategory !== "all") && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                className="mt-2 text-xs text-primary font-semibold hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          filteredNotifs.map(n => {
            const Icon = iconMap[n.type] || Info;
            const styling = colorMap[n.type] || colorMap.info;

            return (
              <div
                key={n.id}
                className={`bg-card border border-border rounded-xl p-4 transition-all hover:border-border/80 shadow-sm flex items-start gap-3.5 ${
                  !n.read ? "border-l-4 border-l-primary bg-accent/20" : ""
                }`}
              >
                {/* Status Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${styling.bg}`}>
                  <Icon size={16} className={styling.icon} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">{n.title}</span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" title="Unread" />
                    )}

                    {/* Category Tag */}
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
                      {n.category === "upload"
                        ? "Document Upload"
                        : n.category === "itc"
                        ? "ITC Claim / Audit"
                        : n.category === "approved"
                        ? "Approved"
                        : n.category === "fraud"
                        ? "Risk Alert"
                        : "System Event"}
                    </span>

                    {/* Client / Target pill */}
                    {n.client && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                        {n.client}
                      </span>
                    )}

                    {/* Actor pill */}
                    {n.actor && (
                      <span className="text-[10px] text-muted-foreground">
                        via <span className="font-semibold text-foreground">{n.actor}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{n.msg}</p>

                  <div className="text-[11px] font-mono text-muted-foreground/70 pt-0.5">
                    {formatIST(n.time)}
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => dismissNotif(n.id)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors shrink-0"
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
