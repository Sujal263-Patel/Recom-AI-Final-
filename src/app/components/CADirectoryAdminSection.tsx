import { useState, useEffect } from "react";
import { Building2, RefreshCw, User, Users, AlertCircle, ChevronRight } from "lucide-react";
import { apiRequest } from "../lib/api";

function Badge({ label, variant }: { label: string; variant: "success" | "warning" | "neutral" }) {
  const cls =
    variant === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : variant === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-muted text-muted-foreground border-border";
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

export default function CADirectoryAdminSection({ refreshKey }: { refreshKey?: number }) {
  const [caList, setCaList] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCa, setExpandedCa] = useState<string | null>(null);

  const fetchCADirectory = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ cas: any[]; unassignedClients: any[] }>("/api/cas", { auth: true });
      setCaList(res.cas || []);
      setUnassigned(res.unassignedClients || []);
    } catch (err) {
      console.error("Failed to load CA Directory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCADirectory();
  }, [refreshKey]);

  const totalAssignedClients = caList.reduce((acc, ca) => acc + (ca.clientCount || (ca.clients ? ca.clients.length : 0)), 0);

  return (
    <div className="space-y-4 pt-6 border-t border-border mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Building2 className="text-primary" size={18} /> Tax Officers & Client Mapping
          </h3>
          <p className="text-xs text-muted-foreground">Real-time System Admin directory of registered Tax Officers and their assigned client workspaces</p>
        </div>
        <button onClick={fetchCADirectory} className="text-xs border border-border bg-card px-3 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-1.5 font-medium">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Breakdown
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold font-mono text-primary">{caList.length}</div>
            <div className="text-muted-foreground mt-0.5 font-medium">Registered Tax Officers</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <User size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-500">{totalAssignedClients}</div>
            <div className="text-muted-foreground mt-0.5 font-medium">Assigned Clients</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold font-mono text-amber-500">{unassigned.length}</div>
            <div className="text-muted-foreground mt-0.5 font-medium">Unassigned Clients</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <AlertCircle size={18} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {caList.map(ca => {
          const isExpanded = expandedCa === ca.id;
          const clientList = ca.clients || [];
          return (
            <div key={ca.id} className="bg-card border border-border rounded-xl overflow-hidden transition-all shadow-sm">
              <div
                onClick={() => setExpandedCa(isExpanded ? null : ca.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      {ca.firm_name || ca.name}
                      {ca.icai_number && <span className="text-[10px] font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">ID: {ca.icai_number}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{ca.email} · Officer: {ca.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                    {clientList.length} Client(s) Assigned
                  </span>
                  <ChevronRight size={16} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-border bg-muted/20 space-y-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Linked Client Workspaces ({clientList.length}):
                  </div>
                  {clientList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {clientList.map((cli: any) => (
                        <div key={cli.id} className="bg-card border border-border rounded-xl p-3 text-xs flex items-center justify-between shadow-sm">
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground">{cli.name}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{cli.email || "No email"}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">GSTIN: {cli.gstin} {cli.city ? `· ${cli.city}` : ""}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-emerald-500">{cli.compliance ?? 100}% Score</div>
                            <Badge label={cli.status || "Active"} variant={cli.status === "Active" ? "success" : "neutral"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic p-3 bg-card border border-border rounded-lg">
                      No clients currently assigned to this Tax Officer.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {unassigned.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle size={14} /> Unassigned Clients Awaiting Tax Officer Selection ({unassigned.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {unassigned.map((cli: any) => (
                <div key={cli.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="font-bold text-foreground">{cli.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{cli.email} · {cli.gstin}</div>
                  </div>
                  <Badge label="Awaiting Officer" variant="warning" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
