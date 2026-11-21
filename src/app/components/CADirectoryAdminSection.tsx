import { useState, useEffect } from "react";
import { Building2, RefreshCw, User, Users, AlertCircle, ChevronRight, ShieldAlert, FileText, Check, Plus, Loader2 } from "lucide-react";
import { apiRequest } from "../lib/api";

function Badge({ label, variant }: { label: string; variant: "success" | "warning" | "neutral" | "danger" | "info" }) {
  const cls =
    variant === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : variant === "warning"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        : variant === "danger"
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          : variant === "info"
            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
            : "bg-muted text-muted-foreground border-border";
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

interface CADirectoryAdminSectionProps {
  refreshKey?: number;
  onOpenAddModal?: () => void;
  onClientReassigned?: () => void;
  onInspectClient?: (client: { id: string; name: string; gstin: string }) => void;
}

export default function CADirectoryAdminSection({ refreshKey, onOpenAddModal, onClientReassigned, onInspectClient }: CADirectoryAdminSectionProps) {
  const [caWorkload, setCaWorkload] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCa, setExpandedCa] = useState<string | null>(null);
  const [assigningClientId, setAssigningClientId] = useState<string | null>(null);
  const [targetCaByClient, setTargetCaByClient] = useState<Record<string, string>>({});
  const [actionNotice, setActionNotice] = useState("");

  const fetchCADirectory = async () => {
    setLoading(true);
    try {
      const [workloadRes, casRes] = await Promise.allSettled([
        apiRequest<{ taxOfficers: any[] }>("/api/admin/tax-officers/workload", { auth: true }),
        apiRequest<{ cas: any[]; unassignedClients: any[] }>("/api/cas", { auth: true }),
      ]);

      if (workloadRes.status === "fulfilled" && workloadRes.value?.taxOfficers) {
        setCaWorkload(workloadRes.value.taxOfficers);
      }
      if (casRes.status === "fulfilled" && casRes.value?.unassignedClients) {
        setUnassigned(casRes.value.unassignedClients);
      }
    } catch (err) {
      console.error("Failed to load CA Directory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCADirectory();
  }, [refreshKey]);

  const handleAssignUnassigned = async (clientId: string) => {
    const targetCaId = targetCaByClient[clientId];
    if (!targetCaId) return;

    setAssigningClientId(clientId);
    try {
      await apiRequest(`/api/admin/clients/${clientId}/reassign`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ newCaId: targetCaId, reason: "Manual assignment from Admin Directory" }),
      });
      setActionNotice("Client successfully allocated to Tax Officer.");
      fetchCADirectory();
      if (onClientReassigned) onClientReassigned();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Assignment failed.");
    } finally {
      setAssigningClientId(null);
    }
  };

  const totalAssignedClients = caWorkload.reduce((acc, ca) => acc + (ca.clientCount || 0), 0);
  const totalInvoices = caWorkload.reduce((acc, ca) => acc + (ca.invoiceCount || 0), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
            <Building2 className="text-primary" size={18} /> Tax Officers Directory & Workload Balancer
          </h3>
          <p className="text-xs text-muted-foreground">
            Multi-officer allocation oversight: monitor client workloads, active invoice volumes, and assign clients evenly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="text-xs bg-primary text-primary-foreground px-3.5 py-1.5 rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus size={13} /> Add Tax Officer
            </button>
          )}
          <button
            type="button"
            onClick={fetchCADirectory}
            className="text-xs border border-border bg-card px-3 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-1.5 font-medium shadow-sm"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Breakdown
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3.5 py-2.5 flex items-center justify-between font-medium">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice("")} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-bold font-mono text-primary">{caWorkload.length}</div>
            <div className="text-muted-foreground mt-0.5 font-medium">Active Tax Officers</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <User size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-500">{totalAssignedClients}</div>
            <div className="text-muted-foreground mt-0.5 font-medium">Assigned Clients</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-bold font-mono text-indigo-500">{totalInvoices}</div>
            <div className="text-muted-foreground mt-0.5 font-medium">Invoices Under Audit</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
            <FileText size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-bold font-mono text-amber-500">{unassigned.length}</div>
            <div className="text-muted-foreground mt-0.5 font-medium">Unassigned Clients</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {/* Officers List with Workload details */}
      <div className="space-y-3">
        {caWorkload.map(ca => {
          const isExpanded = expandedCa === ca.id;
          const clientList = ca.clients || [];
          const statusCls =
            ca.workloadStatus === "Heavy"
              ? "danger"
              : ca.workloadStatus === "Optimal"
                ? "info"
                : "success";

          return (
            <div key={ca.id} className="bg-card border border-border rounded-xl overflow-hidden transition-all shadow-sm">
              <div
                onClick={() => setExpandedCa(isExpanded ? null : ca.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors flex-wrap gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2 text-foreground">
                      {ca.name}
                      {ca.firmName && <span className="text-xs font-normal text-muted-foreground">({ca.firmName})</span>}
                      {ca.icaiNumber && (
                        <span className="text-[10px] font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                          {ca.icaiNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {ca.email} {ca.city ? `· ${ca.city}` : ""} · Spec: {ca.specialization || "GST"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-right text-xs">
                    <span className="font-mono font-bold text-foreground">{ca.invoiceCount}</span> invoices
                    {ca.openAlertCount > 0 && (
                      <span className="text-rose-500 font-mono ml-2 font-semibold">· {ca.openAlertCount} alerts</span>
                    )}
                  </div>
                  <Badge label={`${ca.clientCount} Client(s)`} variant={statusCls} />
                  <Badge label={ca.workloadStatus || "Active"} variant={statusCls} />
                  <ChevronRight size={16} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-border bg-muted/20 space-y-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Assigned Client Workspaces ({clientList.length}):
                  </div>
                  {clientList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {clientList.map((cli: any) => (
                        <div key={cli.id} className="bg-card border border-border rounded-xl p-3 text-xs flex items-center justify-between shadow-sm">
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground">{cli.name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">GSTIN: {cli.gstin}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Active
                            </span>
                            {onInspectClient && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInspectClient({ id: String(cli.id), name: cli.name, gstin: cli.gstin });
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded transition-colors"
                              >
                                <span>Inspect</span>
                                <ChevronRight size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic p-3 bg-card border border-border rounded-lg">
                      No clients currently assigned to this Tax Officer. Next client signup will automatically route here.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned Clients Awaiting Allocation */}
        {unassigned.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle size={14} /> Unassigned Clients Awaiting Allocation ({unassigned.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {unassigned.map((cli: any) => (
                <div key={cli.id} className="bg-card border border-border rounded-xl p-3 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground">{cli.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{cli.gstin}</div>
                    </div>
                    <Badge label="Awaiting Officer" variant="warning" />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={targetCaByClient[cli.id] || ""}
                      onChange={e => setTargetCaByClient(prev => ({ ...prev, [cli.id]: e.target.value }))}
                      className="flex-1 bg-muted border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Tax Officer...</option>
                      {caWorkload.map(ca => (
                        <option key={ca.id} value={ca.id}>
                          {ca.name} ({ca.clientCount} clients · {ca.workloadStatus})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssignUnassigned(cli.id)}
                      disabled={!targetCaByClient[cli.id] || assigningClientId === cli.id}
                      className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      {assigningClientId === cli.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      <span>Assign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
