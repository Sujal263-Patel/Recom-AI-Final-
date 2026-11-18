import { useState, useEffect, useMemo } from "react";
import {
  Layers, RefreshCw, Calendar, Activity, Search, X, AlertTriangle, CheckCircle2,
  Sparkles, Loader2, Eye, Info, CheckSquare, Square, Zap, FileText, MinusSquare
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { formatIST } from "../lib/datetime";
import { ItcBadge } from "./ItcStatus";
import { uploadMatchesPeriod, periodToMmYyyy } from "../lib/periodUtils";

interface ClientDocumentsPageProps {
  onVerifyDoc?: (docId: string) => void;
  isRedirect?: boolean;
  selectedClientId?: string;
}

const MAX_BATCH_LIMIT = 10;

const DOC_TYPE_META: Record<string, { label: string; emoji: string; color: string; badgeCls: string }> = {
  PURCHASE_REGISTER: { label: "Purchase Register", emoji: "📒", color: "emerald", badgeCls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800" },
  GSTR2B: { label: "GSTR-2B Portal Data", emoji: "🏛️", color: "blue", badgeCls: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-300 dark:border-blue-800" },
  TAX_INVOICE: { label: "Tax Invoice", emoji: "📄", color: "amber", badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-300 dark:border-amber-800" },
  PURCHASE_ORDER: { label: "Purchase Order", emoji: "🛒", color: "sky", badgeCls: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-sky-300 dark:border-sky-800" },
  SUPPLIER_MASTER: { label: "Supplier Master", emoji: "🗂️", color: "violet", badgeCls: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border-violet-300 dark:border-violet-800" },
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
      <FileText size={28} className="text-muted-foreground/60" />
      <span>{message}</span>
    </div>
  );
}

export default function ClientDocumentsPage({
  onVerifyDoc,
  isRedirect = false,
  selectedClientId,
}: ClientDocumentsPageProps) {
  const [uploads, setUploads] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNPROCESSED" | "PROCESSED">("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Multi-document selection & concurrent processing state
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{
    isActive: boolean;
    total: number;
    completed: number;
    currentFiles: string[];
  }>({
    isActive: false,
    total: 0,
    completed: 0,
    currentFiles: [],
  });

  const isDocProcessed = (u: any) => {
    const st = (u.status || "").toLowerCase();
    if (st === "parsed" || st === "processed" || st === "parsed_with_warnings") return true;
    if ((u.parsedRows ?? 0) > 0 || (u.processCount ?? 0) > 0) return true;
    return false;
  };

  const loadUploads = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ uploads: any[] }>("/api/ingestion/uploads", { auth: true });
      setUploads(res.uploads || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to load client documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUploads();
  }, [selectedClientId]);

  const clientId = selectedClientId && selectedClientId !== "ALL" ? selectedClientId : null;

  // Filter uploads belonging to the selected client
  const clientUploads = useMemo(() => {
    if (!clientId) return uploads;
    return uploads.filter(u => {
      const uClientId = String(u.clientId || u.client_id || "");
      return uClientId === String(clientId);
    });
  }, [uploads, clientId]);

  // Extract all available periods that actually exist on this client's uploads
  const availablePeriods = useMemo(() => {
    const targetUploads = clientUploads;
    const set = new Set<string>();
    targetUploads.forEach(u => {
      const periods = u.taxPeriods || u.tax_periods;
      if (Array.isArray(periods)) {
        periods.forEach((p: string) => {
          if (p && p.trim()) {
            const canon = periodToMmYyyy(p);
            set.add(canon || p.trim());
          }
        });
      }
      const pStr = u.taxPeriod || u.tax_period;
      if (pStr && typeof pStr === "string") {
        pStr.split(",").forEach((p: string) => {
          if (p && p.trim()) {
            const canon = periodToMmYyyy(p);
            set.add(canon || p.trim());
          }
        });
      }
      const fy = u.financialYear || u.financial_year;
      if (fy && typeof fy === "string" && fy.trim()) {
        set.add(fy.trim());
      }
      const fname = u.fileName || u.file_name || "";
      const match = fname.match(/(\d{2})_(\d{4})/);
      if (match) {
        set.add(`${match[1]}-${match[2]}`);
      }
    });
    return Array.from(set).sort((a, b) => {
      const ma = a.match(/^(\d{2})-(\d{4})$/);
      const mb = b.match(/^(\d{2})-(\d{4})$/);
      if (ma && mb) {
        return (Number(ma[2]) * 100 + Number(ma[1])) - (Number(mb[2]) * 100 + Number(mb[1]));
      }
      return a.localeCompare(b);
    });
  }, [clientUploads]);

  useEffect(() => {
    if (selectedPeriod !== "ALL" && !availablePeriods.includes(selectedPeriod)) {
      setSelectedPeriod("ALL");
    }
  }, [availablePeriods, selectedPeriod]);

  // Filter uploads by selected period
  const periodFilteredUploads = useMemo(() => {
    if (!selectedPeriod || selectedPeriod === "ALL") return clientUploads;
    return clientUploads.filter(u => uploadMatchesPeriod(u, selectedPeriod));
  }, [clientUploads, selectedPeriod]);

  const unprocessedCount = useMemo(() => {
    return periodFilteredUploads.filter(u => !isDocProcessed(u)).length;
  }, [periodFilteredUploads]);

  const processedCount = useMemo(() => {
    return periodFilteredUploads.filter(u => isDocProcessed(u)).length;
  }, [periodFilteredUploads]);

  const filtered = useMemo(() => {
    return periodFilteredUploads.filter(u => {
      const isProc = isDocProcessed(u);
      if (statusFilter === "UNPROCESSED" && isProc) return false;
      if (statusFilter === "PROCESSED" && !isProc) return false;

      const docType = (u.documentType || u.category || "TAX_INVOICE").toUpperCase();
      if (filter !== "ALL" && docType !== filter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (u.fileName || "").toLowerCase().includes(q) ||
        (u.clientName || "").toLowerCase().includes(q) ||
        (u.gstin || "").toLowerCase().includes(q) ||
        (u.taxPeriod || "").toLowerCase().includes(q)
      );
    });
  }, [periodFilteredUploads, statusFilter, filter, search]);

  // Selection state helpers (Maximum 10 at a time)
  const isAllMaxSelected =
    filtered.length > 0 &&
    filtered.slice(0, MAX_BATCH_LIMIT).every(u => selectedDocIds.has(u.id));

  const toggleSelectAll = () => {
    if (selectedDocIds.size > 0) {
      setSelectedDocIds(new Set());
      setMessage("");
    } else {
      const next = new Set<string>();
      filtered.slice(0, MAX_BATCH_LIMIT).forEach(u => next.add(u.id));
      setSelectedDocIds(next);
      if (filtered.length > MAX_BATCH_LIMIT) {
        setMessage(`Selected first ${MAX_BATCH_LIMIT} documents (maximum batch processing limit).`);
      }
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setMessage("");
      } else {
        if (next.size >= MAX_BATCH_LIMIT) {
          setMessage(`⚠️ Maximum ${MAX_BATCH_LIMIT} documents can be chosen at a time. Deselect an item or process the selected ${MAX_BATCH_LIMIT} first.`);
          return prev;
        }
        next.add(id);
        setMessage("");
      }
      return next;
    });
  };

  const selectTenUnprocessed = () => {
    const unproc = filtered.filter(u => !isDocProcessed(u));
    if (unproc.length === 0) {
      setMessage("All visible documents in this filter have already been processed.");
      return;
    }
    const next = new Set<string>();
    unproc.slice(0, MAX_BATCH_LIMIT).forEach(u => next.add(u.id));
    setSelectedDocIds(next);
    setMessage(`Selected ${next.size} unprocessed document${next.size === 1 ? "" : "s"} (max ${MAX_BATCH_LIMIT}). Click 'Process Selected' to execute.`);
  };

  const selectTenVisible = () => {
    const next = new Set<string>();
    filtered.slice(0, MAX_BATCH_LIMIT).forEach(u => next.add(u.id));
    setSelectedDocIds(next);
    setMessage(`Selected ${next.size} document${next.size === 1 ? "" : "s"} (max ${MAX_BATCH_LIMIT}).`);
  };

  const deselectAll = () => {
    setSelectedDocIds(new Set());
    setMessage("");
  };

  // ── Concurrent Multiple Document Processing (Max 10) ────────────────────────
  const processMultipleDocuments = async (docIdsToProcess: string[]) => {
    if (docIdsToProcess.length === 0) return;

    // Strict cap at maximum 10 at a time
    const batch = docIdsToProcess.slice(0, MAX_BATCH_LIMIT);
    const total = batch.length;

    // Mark all as actively processing
    setProcessingIds(new Set(batch));
    setBatchProgress({
      isActive: true,
      total,
      completed: 0,
      currentFiles: batch.map(id => {
        const doc = uploads.find(u => u.id === id);
        return doc ? doc.fileName : id;
      }),
    });

    let completedCounter = 0;
    const errors: string[] = [];

    // Parallel execution across all chosen documents concurrently at the same time
    const promises = batch.map(async (docId) => {
      try {
        const res = await apiRequest<{ ok: boolean; message: string }>(`/api/extract/rerun/${docId}?engine=gemini`, {
          method: "POST",
          auth: true,
          body: JSON.stringify({ engine: "gemini" })
        });
        if (res?.ok === false) {
          errors.push(res.message || `Failed to process document ${docId}`);
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Error on ${docId}`);
      } finally {
        completedCounter++;
        setBatchProgress(prev => ({
          ...prev,
          completed: completedCounter,
        }));
        // Remove individual doc from active set as it finishes
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
      }
    });

    await Promise.allSettled(promises);

    // Finalize
    await loadUploads();
    setSelectedDocIds(new Set());
    setProcessingIds(new Set());
    setBatchProgress({
      isActive: false,
      total: 0,
      completed: 0,
      currentFiles: [],
    });

    if (errors.length === 0) {
      setMessage(`⚡ Successfully processed ${total} document${total === 1 ? "" : "s"} concurrently! Invoices & reconciliation records updated.`);
    } else {
      setMessage(`⚡ Processed ${total - errors.length} of ${total} documents. ${errors.length} had issues: ${errors[0]}`);
    }
  };

  const handleProcessDoc = (docId: string) => {
    processMultipleDocuments([docId]);
  };

  const handleProcessSelected = () => {
    processMultipleDocuments(Array.from(selectedDocIds));
  };

  return (
    <div className="p-6 space-y-5 text-left">
      {isRedirect && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs px-4 py-3 rounded-xl flex items-start gap-2.5 shadow-sm">
          <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Uploads are managed directly by the Client.</span>
            <p className="mt-0.5 text-muted-foreground">The Upload Center has been removed for Tax Officers to enforce independent data integrity. Review client-submitted reconciliation files below.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Layers className="text-primary" size={20} /> Client Documents (Read-Only)
          </h1>
          <p className="text-xs text-muted-foreground">
            Immutable client-submitted statutory datasets for GST reconciliation and 3-way matching.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tax Period Selector */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-sm">
            <Calendar size={13} className="text-primary shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Periods ({clientUploads.length})</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadUploads}
            className="flex items-center gap-1.5 text-xs border border-border bg-card hover:bg-muted px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          {/* Quick Select Buttons in Header */}
          {selectedDocIds.size === 0 ? (
            <button
              type="button"
              onClick={selectTenUnprocessed}
              className="flex items-center gap-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 border border-border px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <CheckSquare size={13} className="text-primary" />
              <span>Select 10 Unprocessed</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={deselectAll}
              className="flex items-center gap-1.5 text-xs font-medium border border-border bg-card hover:bg-muted px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
              <span>Deselect All</span>
            </button>
          )}

          {selectedDocIds.size > 0 && (
            <button
              type="button"
              disabled={batchProgress.isActive}
              onClick={handleProcessSelected}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap size={13} className="text-amber-300 fill-amber-300" />
              <span>Process Selected ({selectedDocIds.size}/10)</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* Concurrent Batch Processing Progress Banner */}
      {batchProgress.isActive && (
        <div className="bg-indigo-950/40 border border-indigo-500/50 rounded-xl p-4 space-y-2.5 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-indigo-200 font-semibold">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-400" />
              <span>
                Processing {batchProgress.total} documents simultaneously ({batchProgress.completed}/{batchProgress.total} done)...
              </span>
            </div>
            <span className="font-mono font-bold text-indigo-400">
              {Math.round((batchProgress.completed / batchProgress.total) * 100)}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-400 truncate font-mono">
            Simultaneous active streams: {batchProgress.currentFiles.slice(0, 4).join(", ")}
            {batchProgress.currentFiles.length > 4 ? ` +${batchProgress.currentFiles.length - 4} more` : ""}
          </div>
        </div>
      )}

      {/* Interactive Selection Toolbar (Select / Deselect Max 10) */}
      <div className="bg-muted/40 border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span>Selection:</span>
            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
              selectedDocIds.size > 0
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-border"
            }`}>
              {selectedDocIds.size} / {MAX_BATCH_LIMIT} selected
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            (Choose maximum 10 at a time for simultaneous processing)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={selectTenVisible}
            disabled={selectedDocIds.size >= MAX_BATCH_LIMIT}
            className="text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <CheckSquare size={13} className="text-primary" />
            <span>Select 10 Visible</span>
          </button>

          <button
            type="button"
            onClick={selectTenUnprocessed}
            disabled={unprocessedCount === 0}
            className="text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>Select 10 Unprocessed</span>
          </button>

          <button
            type="button"
            onClick={deselectAll}
            disabled={selectedDocIds.size === 0}
            className="text-xs font-semibold border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
          >
            <MinusSquare size={13} />
            <span>Deselect</span>
          </button>

          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

          {/* Prominent Process Button */}
          <button
            type="button"
            disabled={selectedDocIds.size === 0 || batchProgress.isActive}
            onClick={handleProcessSelected}
            className="flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap size={14} className="text-amber-300 fill-amber-300" />
            <span>Process Selected ({selectedDocIds.size})</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-border/80 rounded-2xl p-3 shadow-xs space-y-3">
        {/* Top Filter Bar: Processing Status Tabs + Search + Clear */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Processing Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground px-2 flex items-center gap-1">
              <Activity size={12} className="text-primary" /> Status:
            </span>
            {[
              { id: "ALL", label: "All Docs", count: periodFilteredUploads.length },
              { id: "UNPROCESSED", label: "Unprocessed", count: unprocessedCount, dotColor: "bg-amber-500", pulse: unprocessedCount > 0 },
              { id: "PROCESSED", label: "Processed", count: processedCount, dotColor: "bg-emerald-500", pulse: false },
            ].map((st) => {
              const isActive = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 shrink-0 ${isActive
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    }`}
                >
                  {st.dotColor && (
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor} shrink-0 ${st.pulse ? "animate-ping" : ""}`} />
                  )}
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium transition-colors ${isActive
                      ? "bg-muted text-foreground"
                      : "bg-muted/60 text-muted-foreground"
                      }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box + Clear Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[220px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents or GSTIN..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-muted/40 hover:bg-muted/70 focus:bg-card border border-border/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60 shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {(filter !== "ALL" || statusFilter !== "ALL" || search.trim() !== "") && (
              <button
                type="button"
                onClick={() => {
                  setFilter("ALL");
                  setStatusFilter("ALL");
                  setSearch("");
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20 transition-colors"
                title="Reset all filters"
              >
                <X size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Filter Bar: Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Layers size={12} className="text-primary" /> Category:
          </span>
          {["ALL", "PURCHASE_REGISTER", "GSTR2B", "TAX_INVOICE", "PURCHASE_ORDER", "SUPPLIER_MASTER"].map((cat) => {
            const meta = DOC_TYPE_META[cat];
            const count = cat === "ALL"
              ? periodFilteredUploads.filter(u => statusFilter === "ALL" || (statusFilter === "PROCESSED" ? isDocProcessed(u) : !isDocProcessed(u))).length
              : periodFilteredUploads.filter(u => {
                if ((u.documentType || u.category || "").toUpperCase() !== cat) return false;
                if (statusFilter === "PROCESSED" && !isDocProcessed(u)) return false;
                if (statusFilter === "UNPROCESSED" && isDocProcessed(u)) return false;
                return true;
              }).length;
            const active = filter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${active
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                {meta?.emoji ? `${meta.emoji} ` : ""}{meta?.label || "All"} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                <th className="px-3 py-3 w-8 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title={
                      selectedDocIds.size > 0
                        ? "Deselect all"
                        : "Select up to 10 visible documents"
                    }
                  >
                    {isAllMaxSelected ? (
                      <CheckSquare size={15} className="text-primary" />
                    ) : selectedDocIds.size > 0 ? (
                      <MinusSquare size={15} className="text-primary" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Document Type</th>
                <th className="px-4 py-3 text-left">File Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Tax Period(s) / FY</th>
                <th className="px-4 py-3 text-left">Client & GSTIN</th>
                <th className="px-4 py-3 text-left">Rows / Items</th>
                <th className="px-4 py-3 text-left">Uploaded / Processed (IST)</th>
                <th className="px-4 py-3 text-right">Inspection Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => {
                const rawType = (u.documentType || u.category || "TAX_INVOICE").toUpperCase();
                const meta = DOC_TYPE_META[rawType] || DOC_TYPE_META["TAX_INVOICE"];
                const periodWarns = Array.isArray(u.periodWarnings) ? u.periodWarnings : [];
                const hasWarns = periodWarns.length > 0;
                const processed = isDocProcessed(u);
                const isSelected = selectedDocIds.has(u.id);
                const isProcessing = processingIds.has(u.id);

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectDoc(u.id)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={isSelected ? "Deselect" : "Select (Max 10)"}
                      >
                        {isSelected ? (
                          <CheckSquare size={15} className="text-primary" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${meta.badgeCls}`}>
                        <span>{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        <span title={u.fileName}>{u.fileName}</span>
                        {hasWarns && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                            title={periodWarns.join(" | ")}
                          >
                            <AlertTriangle size={9} /> Date Mismatch
                          </span>
                        )}
                      </div>
                      {hasWarns && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 truncate max-w-xs font-sans">
                          {periodWarns[0]}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isProcessing ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                          <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
                          <span>Processing concurrently...</span>
                        </span>
                      ) : processed ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                          <span>Processed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          <span>Unprocessed</span>
                        </span>
                      )}
                      {u.itc && <div className="mt-1"><ItcBadge itc={u.itc} /></div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {u.taxPeriod ? (
                        <span className="bg-muted px-2 py-0.5 rounded border border-border">
                          📅 {u.taxPeriod} {u.financialYear ? `(${u.financialYear})` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">None specified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-foreground">{u.clientName || "Client Workspace"}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{u.gstin || "—"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">
                      <span className="font-semibold text-foreground">{u.parsedRows ?? 0}</span> {rawType === "SUPPLIER_MASTER" ? "vendors" : "rows"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[11px]">
                      <div>{formatIST(u.createdAt)}</div>
                      {u.processedAt && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Processed {formatIST(u.processedAt)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!processed && (
                          <button
                            type="button"
                            disabled={isProcessing || batchProgress.isActive}
                            onClick={() => handleProcessDoc(u.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 size={12} className="animate-spin" /> Processing...
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} className="text-amber-300" /> Process Document
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onVerifyDoc?.(u.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                        >
                          <Eye size={12} /> View Document
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      message={
                        statusFilter === "UNPROCESSED"
                          ? "Great job! All client documents in this view have already been processed."
                          : statusFilter === "PROCESSED"
                            ? "No processed documents found matching the filter."
                            : filter === "ALL"
                              ? (clientId || selectedPeriod !== "ALL"
                                ? "No client documents match the selected client / period filter."
                                : "No client documents uploaded yet.")
                              : `No documents found in category ${DOC_TYPE_META[filter]?.label || filter}.`
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
