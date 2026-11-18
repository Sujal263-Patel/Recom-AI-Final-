import { useState, useEffect } from "react";
import {
  Bot, Clock, Search, RefreshCw, User, Sparkles, Database,
  CheckCircle2, AlertCircle, MessageSquare, Filter, ChevronRight
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { formatIST } from "../lib/datetime";

interface OfficerChat {
  id: string | number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  question: string;
  answer: string;
  engine?: string;
  toolsUsed?: string[];
  refused?: boolean;
  createdAt: string;
}

export default function TaxOfficerChatHistory() {
  const [chats, setChats] = useState<OfficerChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("ALL");
  const [notice, setNotice] = useState("");

  const loadChats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ chats: OfficerChat[] }>("/api/admin/ai-chats", { auth: true });
      if (res && res.chats && res.chats.length > 0) {
        setChats(res.chats);
      } else {
        // Fallback demo chats if backend has no recorded queries yet
        setChats([
          {
            id: "chat_demo_1",
            userName: "Tax Officer Demo",
            userEmail: "taxofficer.demo@reconai.local",
            userRole: "ca",
            question: "Which invoices of Suraksha Fabricators Pvt Ltd have ITC risk for July 2026?",
            answer: "Suraksha Fabricators Pvt Ltd has **2 invoices** with high risk:\n\n1. **SPE/26-27/0017** (₹2,26,466.40): Missing in counterparty GSTR-2B filing. Full ITC at stake.\n2. **SPE/26-27/0011** (₹4,98,337.45): GST rate is 12.2%, significantly lower than client normal baseline (15.6%). Requires verification against physical tax invoice.",
            engine: "Gemini 2.5 Flash",
            toolsUsed: ["get_invoices", "get_fraud_alerts"],
            refused: false,
            createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          },
          {
            id: "chat_demo_2",
            userName: "Tax Officer Demo",
            userEmail: "taxofficer.demo@reconai.local",
            userRole: "ca",
            question: "Show open circular trading rings or supplier risks across all my assigned clients.",
            answer: "Ran network graph anomaly detection across all clients:\n\n• **No closed circular loops** detected for the current filing cycle.\n• **High-volume supplier alert**: Pioneer Auto Components accounts for 38% of ITC claims across 2 client portfolios. Recommend spot-checking E-Way bills for shipments exceeding ₹50,000.",
            engine: "Gemini 2.5 Flash",
            toolsUsed: ["get_circular_trading", "get_supplier_risk"],
            refused: false,
            createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
          },
          {
            id: "chat_demo_3",
            userName: "Tax Officer Demo",
            userEmail: "taxofficer.demo@reconai.local",
            userRole: "ca",
            question: "What is the compliance score breakdown for Shreeji Plastics Industries?",
            answer: "Shreeji Plastics Industries compliance score is **94/100** (High Compliance):\n\n• Timely GSTR-3B filings: 100%\n• Counterparty 2B Match Rate: 96.4%\n• Tax rate consistency: Clean (18% standard)\n• Invoices with zero ITC issues: 18 of 19 invoices verified cleanly.",
            engine: "Gemini 2.5 Flash",
            toolsUsed: ["get_clients", "get_reconciliation_summary"],
            refused: false,
            createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load officer AI chats:", err);
      setNotice(err instanceof Error ? err.message : "Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  const officerEmails = Array.from(new Set(chats.map(c => c.userEmail).filter(Boolean))) as string[];

  const filteredChats = chats.filter(chat => {
    if (selectedOfficer !== "ALL" && chat.userEmail !== selectedOfficer && chat.userId !== selectedOfficer) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (chat.question || "").toLowerCase().includes(q) ||
        (chat.answer || "").toLowerCase().includes(q) ||
        (chat.userName || "").toLowerCase().includes(q) ||
        (chat.userEmail || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-border bg-card shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold flex items-center gap-2 text-foreground">
              <Clock size={18} className="text-primary" /> Tax Officer AI Chat History
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Live audit and inspection of all questions, queries, and analytical prompts submitted by Tax Officers to the AI Assistant.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
              {filteredChats.length} {filteredChats.length === 1 ? "Conversation" : "Conversations"}
            </span>
            <button
              type="button"
              onClick={loadChats}
              disabled={loading}
              className="text-xs border border-border bg-muted/40 hover:bg-muted text-foreground px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter size={13} />
              <span className="font-semibold text-foreground">Officer:</span>
            </div>
            <select
              value={selectedOfficer}
              onChange={e => setSelectedOfficer(e.target.value)}
              className="text-xs bg-muted border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="ALL">All Tax Officers ({chats.length})</option>
              {officerEmails.map(email => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Tax Officer queries or AI replies..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {notice && (
        <div className="mx-6 mt-4 p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
          {notice}
        </div>
      )}

      {/* Main Conversation List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading && chats.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-xs text-muted-foreground gap-2">
            <RefreshCw size={16} className="animate-spin text-primary" /> Loading Tax Officer chat records...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center space-y-2 max-w-lg mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <MessageSquare size={22} />
            </div>
            <div className="text-sm font-bold text-foreground">No Chat Records Found</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {searchQuery || selectedOfficer !== "ALL"
                ? "No Tax Officer AI chats matched your search query or selected filter criteria."
                : "When Tax Officers interact with the AI Assistant to query reconciliation, ITC risks, or client GST data, all their conversations will appear here."}
            </div>
            {(searchQuery || selectedOfficer !== "ALL") && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setSelectedOfficer("ALL"); }}
                className="mt-2 text-xs text-primary font-semibold hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredChats.map((chat, idx) => (
            <div
              key={chat.id || idx}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-border/80 transition-all text-left"
            >
              {/* Card Header */}
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                    TO
                  </div>
                  <span className="font-bold text-foreground">{chat.userName || "Tax Officer"}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{chat.userEmail}</span>
                  <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    Tax Officer
                  </span>
                  {chat.engine && (
                    <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                      {chat.engine}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Clock size={12} />
                  <span>{formatIST(chat.createdAt)}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3.5 text-xs">
                {/* Tax Officer Prompt */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                  <div className="flex-1 bg-muted/40 border border-border rounded-xl p-3 font-medium text-foreground">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      Tax Officer Prompt:
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {chat.question}
                    </div>
                  </div>
                </div>

                {/* AI Assistant Response */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                  <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-foreground leading-relaxed">
                    <div className="text-[10px] uppercase font-bold text-primary tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles size={11} /> ReconAI Assistant Reply:
                    </div>
                    <div className="space-y-1.5 text-xs text-foreground">
                      {chat.answer.split("\n").map((line, li) => (
                        <p key={li} className={li > 0 ? "mt-1" : ""}>
                          {line.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
                            part.startsWith("**") ? (
                              <strong key={pi} className="font-semibold text-foreground">
                                {part.slice(2, -2)}
                              </strong>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      ))}
                    </div>

                    {chat.toolsUsed && chat.toolsUsed.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/80 text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <Database size={11} className="text-primary shrink-0" />
                        <span className="font-semibold text-foreground">Data Tools Consulted:</span>
                        {chat.toolsUsed.map((t: string, ti: number) => (
                          <span key={ti} className="bg-muted px-2 py-0.5 rounded font-mono text-foreground border border-border">
                            {t.replace(/^get_/, "").replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
