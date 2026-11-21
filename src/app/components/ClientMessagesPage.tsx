import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Send, User, Building2, Search, RefreshCw,
  CheckCircle2, Clock, ShieldCheck, AlertCircle, Loader2
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { formatIST } from "../lib/datetime";

interface ClientRecord {
  id: string | number;
  name: string;
  gstin: string;
  email?: string;
  compliance?: number;
  city?: string;
  status?: string;
}

interface MessageItem {
  id: string;
  clientId: string | number;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

interface ClientMessagesPageProps {
  user: {
    name: string;
    email: string;
    role: "admin" | "ca" | "client";
    firmName?: string;
  };
  initialClientId?: string;
  onRefreshUnreadCounts?: () => void;
}

export default function ClientMessagesPage({ user, initialClientId, onRefreshUnreadCounts }: ClientMessagesPageProps) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [unreadByClient, setUnreadByClient] = useState<Record<string, number>>({});
  const [inputText, setInputText] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch unread counts per client
  const fetchUnreadCounts = async () => {
    try {
      const res = await apiRequest<{ totalUnread: number; byClient: Record<string, number> }>("/api/messages/unread-counts", { auth: true });
      if (res?.byClient) {
        setUnreadByClient(res.byClient);
      }
    } catch { }
  };

  // 2. Fetch Tax Officer's assigned clients
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await apiRequest<{ clients: ClientRecord[] }>("/api/clients", { auth: true });
      const clientList = res.clients || [];
      setClients(clientList);

      if (clientList.length > 0) {
        // Select initial client or first available
        const target = initialClientId
          ? clientList.find(c => String(c.id) === String(initialClientId)) || clientList[0]
          : clientList[0];
        setSelectedClient(target);
      }
    } catch (err) {
      console.error("Failed to fetch clients for messaging", err);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 15000);
    return () => clearInterval(interval);
  }, [initialClientId]);

  // 3. Fetch conversation whenever selected client changes
  const fetchMessages = async (clientId: string | number, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await apiRequest<{ messages: MessageItem[] }>(`/api/messages?clientId=${clientId}&markRead=true`, { auth: true });
      setMessages(res.messages || []);
      // Clear local unread for this client
      setUnreadByClient(prev => ({ ...prev, [String(clientId)]: 0 }));
      if (onRefreshUnreadCounts) onRefreshUnreadCounts();
    } catch (err) {
      console.error("Failed to fetch client messages", err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedClient?.id) {
      fetchMessages(selectedClient.id);
    }
  }, [selectedClient?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Send reply message
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !selectedClient?.id || sending) return;

    setSending(true);
    try {
      const res = await apiRequest<{ message: MessageItem }>("/api/messages", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          clientId: selectedClient.id,
          text: text,
        }),
      });

      if (res.message) {
        setMessages(prev => [...prev, res.message]);
        setInputText("");
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredClients = clients.filter(c =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.gstin || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 text-left space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <MessageSquare className="text-primary" size={22} /> Client Inquiries & Direct Messaging
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official two-way communication channel between you and your assigned business clients.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (selectedClient?.id) fetchMessages(selectedClient.id);
            fetchClients();
          }}
          className="flex items-center gap-1.5 text-xs border border-border bg-card px-3.5 py-2 rounded-lg hover:bg-muted font-medium transition-colors shadow-sm"
        >
          <RefreshCw size={12} className={loadingMessages ? "animate-spin" : ""} /> Refresh Messages
        </button>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)] min-h-[500px]">
        {/* Left Pane: Assigned Clients List */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-border bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 size={14} className="text-primary" /> Assigned Clients
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {clients.length} Active
              </span>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search client or GSTIN..."
                className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loadingClients ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Loading client roster...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No assigned clients found matching criteria.
              </div>
            ) : (
              filteredClients.map(cli => {
                const isSelected = selectedClient?.id === cli.id;
                const unreadCount = unreadByClient[String(cli.id)] || 0;

                return (
                  <button
                    key={cli.id}
                    type="button"
                    onClick={() => {
                      setSelectedClient(cli);
                      // Clear unread for this client immediately
                      setUnreadByClient(prev => ({ ...prev, [String(cli.id)]: 0 }));
                      if (onRefreshUnreadCounts) onRefreshUnreadCounts();
                    }}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-l-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                        {(cli.name || "C")[0]}
                      </div>
                      {unreadCount > 0 && !isSelected && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="text-xs font-bold text-foreground truncate">{cli.name}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-red-500 text-white rounded-full min-w-4 h-4 px-1.5 flex items-center justify-center animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                          {cli.compliance !== undefined && (
                            <span className="text-[10px] font-mono font-bold text-emerald-500">
                              {cli.compliance}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {cli.gstin}
                      </div>
                      {cli.city && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {cli.city}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Conversation & Reply */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
          {selectedClient ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-3.5 px-5 border-b border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedClient.name || "C")[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      {selectedClient.name}
                      <span className="text-[10px] font-mono bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground">
                        {selectedClient.gstin}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{selectedClient.city || "Headquarters"}</span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <ShieldCheck size={12} /> Assigned to You
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-500">
                    Compliance: {selectedClient.compliance ?? 100}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Status: {selectedClient.status || "Active"}
                  </div>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/5">
                {loadingMessages ? (
                  <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <MessageSquare size={22} />
                    </div>
                    <div className="text-sm font-semibold text-foreground">No messages yet with {selectedClient.name}</div>
                    <div className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Initiate statutory guidance or request missing invoice details. The client will see your messages directly on their portal.
                    </div>
                  </div>
                ) : (
                  messages.map(m => {
                    const isFromOfficer = m.senderRole === "ca" || m.senderId === user.email || (m.senderName && m.senderName.toLowerCase().includes("officer"));
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 max-w-[85%] ${isFromOfficer ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                            isFromOfficer
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted border border-border text-foreground"
                          }`}
                        >
                          {isFromOfficer ? "TO" : "CL"}
                        </div>

                        <div className="space-y-1">
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-line ${
                              isFromOfficer
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-card border border-border text-foreground rounded-tl-none"
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
                              {isFromOfficer ? "Tax Officer (You)" : m.senderName || "Client"}
                            </div>
                            {m.text}
                          </div>
                          <div
                            className={`text-[10px] font-mono text-muted-foreground px-1 ${
                              isFromOfficer ? "text-right" : "text-left"
                            }`}
                          >
                            {formatIST(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3.5 border-t border-border bg-card">
                <div className="flex items-end gap-2.5">
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder={`Reply to ${selectedClient.name}... (Press Enter to send, Shift+Enter for new line)`}
                    className="flex-1 bg-muted border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || sending}
                    className="h-10 px-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
              Select an assigned client from the left pane to view conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

