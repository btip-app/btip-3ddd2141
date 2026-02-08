import { useState, useRef, useEffect } from "react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  Target,
  Terminal,
} from "lucide-react";

// --- Types ---

type RiskLevel = "low" | "medium" | "high" | "critical";

interface LinkedIncident {
  id: string;
  title: string;
  severity: number;
}

interface CopilotResponse {
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  evidence: string[];
  recommendations: string[];
  linkedIncidents: LinkedIncident[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  response?: CopilotResponse;
}

interface AuditEntry {
  id: string;
  query: string;
  riskLevel: RiskLevel | null;
  confidence: number | null;
  timestamp: string;
}

// --- Mock response bank ---

const MOCK_RESPONSES: Record<string, CopilotResponse> = {
  lagos: {
    riskLevel: "high",
    confidence: 82,
    summary: "Lagos metropolitan area shows elevated threat activity over the past 72 hours. Multiple armed robbery incidents reported near Victoria Island and Lekki corridors. Pattern suggests coordinated targeting of commercial vehicles during early morning hours.",
    evidence: [
      "3 armed robbery incidents within 5km of Lagos HQ in past 48h",
      "Carjacking reported 2.1km from Exec Residence - VI",
      "SIGINT intercept suggests organized criminal network activity",
      "Social media monitoring flagged 12 related posts in Ikoyi area",
    ],
    recommendations: [
      "Elevate security posture for Lagos HQ to Level 3",
      "Restrict non-essential vehicle movements before 0700 and after 2100",
      "Brief executive protection team on updated threat vectors",
      "Consider temporary route diversions for VI-Lekki corridor",
    ],
    linkedIncidents: [
      { id: "i1", title: "Armed Robbery - Commercial Vehicles", severity: 4 },
      { id: "i9", title: "Carjacking Near Ikoyi", severity: 4 },
      { id: "i8", title: "Civil Unrest - Market Area", severity: 3 },
    ],
  },
  route: {
    riskLevel: "medium",
    confidence: 71,
    summary: "The Lagos–Abuja express corridor has moderate risk. Highway banditry reports near Lokoja waypoint persist. No direct threats to convoy movements detected, but pattern analysis suggests increased activity on weekends.",
    evidence: [
      "Highway banditry report 8km from Lokoja Waypoint",
      "2 road blockade incidents on alternative routes in past 7 days",
      "Local security contacts report militia movement near Kabba junction",
      "No direct threats intercepted against identified convoys",
    ],
    recommendations: [
      "Maintain armed escort for executive travel on this route",
      "Schedule movements during 0800–1400 window for optimal security",
      "Pre-position response assets at Ibadan Checkpoint",
      "Consider air transport for high-priority personnel",
    ],
    linkedIncidents: [
      { id: "i11", title: "Highway Banditry Report", severity: 3 },
      { id: "i4", title: "Political Demonstration", severity: 2 },
    ],
  },
  phc: {
    riskLevel: "critical",
    confidence: 88,
    summary: "Port Harcourt / Rivers State region presents critical risk. Kidnapping threat intelligence targeting industrial zone personnel is assessed as credible. Pipeline vandalism attempts have increased, and a severity escalation was recorded in the past 24 hours.",
    evidence: [
      "SIGINT intercept confirming kidnapping planning against industrial workers",
      "Pipeline vandalism attempt 3km from PHC Refinery Complex",
      "Severity escalation from level 3 to 5 recorded at 2026-02-07 10:15",
      "3 incidents within 10km radius of Bonny Island Terminal in 7 days",
      "Partner agency issued regional travel advisory",
    ],
    recommendations: [
      "Elevate PHC Refinery Complex to maximum security posture immediately",
      "Suspend non-essential staff travel to Rivers State",
      "Activate emergency evacuation plan for Bonny Island Terminal",
      "Coordinate with naval patrol for maritime corridor protection",
      "Brief all personnel on duress protocols and safe room procedures",
    ],
    linkedIncidents: [
      { id: "i2", title: "Kidnapping Threat - Industrial Zone", severity: 5 },
      { id: "i10", title: "Pipeline Vandalism Attempt", severity: 4 },
      { id: "i7", title: "Suspicious Vessel Activity", severity: 3 },
    ],
  },
  default: {
    riskLevel: "low",
    confidence: 65,
    summary: "Based on available intelligence, no immediate threats have been identified for the specified area or topic. Baseline monitoring continues. Current threat posture remains at standard operating levels.",
    evidence: [
      "No incidents reported within specified parameters in past 48h",
      "Open source monitoring shows normal activity levels",
      "No relevant SIGINT intercepts detected",
    ],
    recommendations: [
      "Maintain standard security protocols",
      "Continue routine monitoring cycles",
      "Review threat assessment at next scheduled interval",
    ],
    linkedIncidents: [],
  },
};

function matchResponse(query: string): CopilotResponse {
  const q = query.toLowerCase();
  if (q.includes("lagos") || q.includes("lekki") || q.includes("vi") || q.includes("victoria island") || q.includes("hq"))
    return MOCK_RESPONSES.lagos;
  if (q.includes("route") || q.includes("abuja") || q.includes("corridor") || q.includes("travel") || q.includes("convoy"))
    return MOCK_RESPONSES.route;
  if (q.includes("port harcourt") || q.includes("phc") || q.includes("bonny") || q.includes("refinery") || q.includes("rivers") || q.includes("pipeline") || q.includes("kidnap"))
    return MOCK_RESPONSES.phc;
  return MOCK_RESPONSES.default;
}

function formatNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const RISK_META: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: "LOW", className: "bg-primary/20 text-primary" },
  medium: { label: "MEDIUM", className: "bg-accent/20 text-accent" },
  high: { label: "HIGH", className: "bg-orange-600/20 text-orange-400" },
  critical: { label: "CRITICAL", className: "bg-destructive/20 text-destructive" },
};

function getSeverityLabel(s: number) {
  if (s >= 5) return "CRIT";
  if (s >= 4) return "HIGH";
  if (s >= 3) return "MOD";
  return "LOW";
}

// --- Suggested queries ---

const SUGGESTED_QUERIES = [
  "What is the current threat level around Lagos HQ?",
  "Assess risk along the Lagos–Abuja route corridor",
  "Evaluate security posture for PHC Refinery Complex",
  "Are there kidnapping threats near Bonny Island?",
];

const DISCLAIMER = "This is decision-support intelligence, not a guarantee. Assessments are based on available mock data and should be validated against ground-truth sources before operational use.";

// --- Component ---

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { log: auditLogGlobal } = useAuditLog();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit() {
    if (!input.trim() || isProcessing) return;
    const query = input.trim();
    setInput("");
    const ts = formatNow();

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: ts,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Log query to audit log immediately
    const auditEntry: AuditEntry = {
      id: `audit-${Date.now()}`,
      query,
      riskLevel: null,
      confidence: null,
      timestamp: ts,
    };
    setAuditLog(prev => [auditEntry, ...prev]);
    auditLogGlobal("COPILOT_QUERY", query);

    // Simulate processing delay (1.5–3s)
    const delay = 1500 + Math.random() * 1500;
    setTimeout(() => {
      const response = matchResponse(query);
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.summary,
        timestamp: formatNow(),
        response,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setSelectedMessage(assistantMsg);

      // Update audit log entry with result
      setAuditLog(prev =>
        prev.map(e => e.id === auditEntry.id
          ? { ...e, riskLevel: response.riskLevel, confidence: response.confidence }
          : e
        )
      );
      setIsProcessing(false);
    }, delay);
  }

  function handleSuggestion(query: string) {
    setInput(query);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold text-foreground">Copilot</h1>
            <p className="text-muted-foreground text-[10px] font-mono">
              Decision support system • Mock responses active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-mono h-7"
            onClick={() => setShowAuditLog(!showAuditLog)}
          >
            <ClipboardList className="h-3 w-3 mr-1" />
            AUDIT LOG ({auditLog.length})
          </Button>
          <Badge variant="outline" className="text-[10px] font-mono">
            <Terminal className="h-3 w-3 mr-1" />
            {messages.filter(m => m.role === "assistant").length} analyses
          </Badge>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded border border-accent/20 bg-accent/5">
        <ShieldAlert className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
        <p className="text-[9px] font-mono text-accent/80 leading-relaxed">
          {DISCLAIMER}
        </p>
      </div>

      {/* Audit log (collapsible) */}
      {showAuditLog && (
        <Card className="mb-3 border-border bg-card max-h-[160px] overflow-auto">
          <div className="px-3 pt-2 pb-1">
            <h3 className="text-[9px] font-mono font-bold text-muted-foreground">QUERY AUDIT LOG</h3>
          </div>
          <div className="px-3 pb-2 space-y-1">
            {auditLog.length === 0 ? (
              <p className="text-[9px] font-mono text-muted-foreground/50 py-2">No queries logged yet.</p>
            ) : (
              auditLog.map(entry => (
                <div key={entry.id} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                  <span className="text-[8px] font-mono text-muted-foreground w-16 flex-shrink-0">{entry.timestamp}</span>
                  <span className="text-[9px] font-mono text-foreground flex-1 truncate">{entry.query}</span>
                  {entry.riskLevel ? (
                    <Badge className={`${RISK_META[entry.riskLevel].className} text-[7px] font-mono px-1 py-0`}>
                      {RISK_META[entry.riskLevel].label}
                    </Badge>
                  ) : (
                    <span className="text-[8px] font-mono text-muted-foreground/50">pending</span>
                  )}
                  {entry.confidence !== null && (
                    <span className="text-[8px] font-mono text-muted-foreground w-10 text-right">{entry.confidence}%</span>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Main split */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Left: Conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages area */}
          <Card className="flex-1 flex flex-col bg-card border-border overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Shield className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-xs font-mono text-muted-foreground mb-1">BTIP Copilot Ready</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60 mb-6 text-center max-w-sm">
                    Ask about threat assessments, asset risk levels, route safety, or regional security posture.
                  </p>
                  <div className="space-y-2 w-full max-w-md">
                    <p className="text-[9px] font-mono text-muted-foreground/50 uppercase">Suggested queries</p>
                    {SUGGESTED_QUERIES.map((q, i) => (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2 rounded border border-border bg-secondary/30 text-[10px] font-mono text-foreground/80 hover:bg-secondary/60 hover:border-primary/30 transition-colors"
                        onClick={() => handleSuggestion(q)}
                      >
                        <ArrowRight className="h-3 w-3 inline mr-2 text-primary" />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-primary/10 border border-primary/20 rounded-lg rounded-br-sm"
                          : "bg-secondary/50 border border-border rounded-lg rounded-bl-sm cursor-pointer hover:border-primary/30 transition-colors"
                      } px-3 py-2.5`}
                      onClick={() => msg.role === "assistant" && setSelectedMessage(msg)}
                    >
                      {/* Role indicator */}
                      <div className="flex items-center gap-2 mb-1.5">
                        {msg.role === "user" ? (
                          <MessageSquare className="h-3 w-3 text-primary" />
                        ) : (
                          <Brain className="h-3 w-3 text-primary" />
                        )}
                        <span className="text-[8px] font-mono text-muted-foreground uppercase">
                          {msg.role === "user" ? "you" : "copilot"} • {msg.timestamp}
                        </span>
                        {msg.response && (
                          <Badge className={`${RISK_META[msg.response.riskLevel].className} text-[7px] font-mono px-1 py-0 ml-auto`}>
                            {RISK_META[msg.response.riskLevel].label}
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-[11px] font-mono text-foreground leading-relaxed">
                        {msg.content}
                      </p>

                      {/* Guardrail disclaimer on every response */}
                      {msg.role === "assistant" && (
                        <div className="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded bg-accent/5 border border-accent/10">
                          <Info className="h-2.5 w-2.5 text-accent/60 mt-0.5 flex-shrink-0" />
                          <span className="text-[7px] font-mono text-accent/60 leading-relaxed">
                            Mock intelligence assessment — not a guarantee of safety. Validate before operational use.
                          </span>
                        </div>
                      )}

                      {/* Quick stats for assistant */}
                      {msg.response && (
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                          <span className="text-[8px] font-mono text-muted-foreground">
                            CONF: {msg.response.confidence}%
                          </span>
                          <span className="text-[8px] font-mono text-muted-foreground">
                            {msg.response.evidence.length} evidence points
                          </span>
                          <span className="text-[8px] font-mono text-muted-foreground">
                            {msg.response.linkedIncidents.length} linked incidents
                          </span>
                          <span className="text-[8px] font-mono text-primary ml-auto flex items-center gap-1">
                            <ExternalLink className="h-2.5 w-2.5" /> details
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 border border-border rounded-lg rounded-bl-sm px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 text-primary animate-spin" />
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Analyzing threat data
                        <span className="inline-block w-[3ch] text-left">...</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Describe your intelligence query..."
                  className="flex-1 min-h-[40px] max-h-[80px] resize-none text-xs font-mono bg-secondary border-border"
                  disabled={isProcessing}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={handleSubmit}
                  disabled={!input.trim() || isProcessing}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[8px] font-mono text-muted-foreground/50 mt-1.5">
                Press Enter to send • Shift+Enter for new line • Mock responses only
              </p>
            </div>
          </Card>
        </div>

        {/* Right: Evidence & Sources */}
        <Card className="w-[360px] flex-shrink-0 flex flex-col border-border bg-card overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <h2 className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              EVIDENCE & SOURCES
            </h2>
          </div>
          <Separator />

          {selectedMessage?.response ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Risk Assessment */}
                <div>
                  <div className="text-[9px] font-mono text-muted-foreground mb-2">RISK ASSESSMENT</div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${RISK_META[selectedMessage.response.riskLevel].className} text-[10px] font-mono px-2 py-0.5`}>
                      {RISK_META[selectedMessage.response.riskLevel].label} RISK
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${selectedMessage.response.confidence}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-foreground">{selectedMessage.response.confidence}%</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Evidence */}
                <div>
                  <div className="text-[9px] font-mono text-muted-foreground mb-2">
                    EVIDENCE ({selectedMessage.response.evidence.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedMessage.response.evidence.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-secondary/30 border border-border">
                        <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-[10px] font-mono text-foreground leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Recommendations */}
                <div>
                  <div className="text-[9px] font-mono text-muted-foreground mb-2">
                    RECOMMENDATIONS ({selectedMessage.response.recommendations.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedMessage.response.recommendations.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                        <Target className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-[10px] font-mono text-foreground leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMessage.response.linkedIncidents.length > 0 && (
                  <>
                    <Separator />

                    {/* Linked Incidents */}
                    <div>
                      <div className="text-[9px] font-mono text-muted-foreground mb-2">
                        LINKED INCIDENTS ({selectedMessage.response.linkedIncidents.length})
                      </div>
                      <div className="space-y-1.5">
                        {selectedMessage.response.linkedIncidents.map(inc => (
                          <button
                            key={inc.id}
                            className="w-full flex items-center gap-2 p-2 rounded bg-secondary/30 border border-border hover:border-primary/30 transition-colors text-left"
                          >
                            <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                            <span className="text-[10px] font-mono text-foreground flex-1 truncate">{inc.title}</span>
                            <Badge variant="outline" className="text-[7px] font-mono px-1 py-0 flex-shrink-0">
                              SEV {getSeverityLabel(inc.severity)}
                            </Badge>
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Analysis metadata */}
                <Separator />
                <div className="text-[8px] font-mono text-muted-foreground/50 space-y-0.5">
                  <div>Analysis ID: {selectedMessage.id}</div>
                  <div>Generated: {selectedMessage.timestamp}</div>
                  <div>Data source: Mock intelligence feed</div>
                  <div className="mt-1.5 pt-1.5 border-t border-border/30 text-accent/50">
                    ⚠ Decision-support only. Not a guarantee.
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-2">
                <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto" />
                <p className="text-[10px] font-mono text-muted-foreground">
                  Select an analysis to view evidence
                </p>
                <p className="text-[8px] font-mono text-muted-foreground/50">
                  Click any Copilot response in the conversation thread
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
