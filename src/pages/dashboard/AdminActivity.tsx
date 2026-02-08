import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Activity, LogIn, Bot, AlertTriangle, Loader2, Shield, Clock, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AuditRow {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  category: string;
  context: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Escalation {
  id: string;
  incident_title: string;
  priority: string;
  status: string;
  assigned_to: string;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  auth: { icon: LogIn, color: 'text-blue-400', label: 'Authentication' },
  copilot: { icon: Bot, color: 'text-primary', label: 'Copilot' },
  escalation: { icon: AlertTriangle, color: 'text-amber-400', label: 'Escalation' },
  general: { icon: Activity, color: 'text-muted-foreground', label: 'General' },
  alert: { icon: Shield, color: 'text-destructive', label: 'Alert' },
  export: { icon: Activity, color: 'text-emerald-400', label: 'Export' },
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-600 text-white',
  routine: 'bg-yellow-600 text-black',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-destructive/20 text-destructive',
  acknowledged: 'bg-blue-600/20 text-blue-400',
  resolved: 'bg-emerald-600/20 text-emerald-400',
};

export default function AdminActivity() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();

    const logChannel = supabase
      .channel('admin-activity-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setLogs(prev => [payload.new as AuditRow, ...prev].slice(0, 200));
      })
      .subscribe();

    const escChannel = supabase
      .channel('admin-activity-esc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, () => {
        fetchEscalations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logChannel);
      supabase.removeChannel(escChannel);
    };
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchEscalations()]);
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs((data as AuditRow[]) || []);
  };

  const fetchEscalations = async () => {
    const { data } = await supabase
      .from('escalations')
      .select('id, incident_title, priority, status, assigned_to, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setEscalations((data as Escalation[]) || []);
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard/brief" replace />;

  const filteredLogs = categoryFilter === 'all'
    ? logs
    : logs.filter(l => l.category === categoryFilter);

  // Stats
  const loginCount = logs.filter(l => l.category === 'auth').length;
  const copilotCount = logs.filter(l => l.category === 'copilot').length;
  const openEscalations = escalations.filter(e => e.status === 'open').length;
  const uniqueUsers = new Set(logs.map(l => l.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-mono font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Overview
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
            Unified view of platform activity • Real-time updates
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">ADMIN ONLY</Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={LogIn} label="Logins" value={loginCount} color="text-blue-400" />
        <StatCard icon={Bot} label="Copilot Queries" value={copilotCount} color="text-primary" />
        <StatCard icon={AlertTriangle} label="Open Escalations" value={openEscalations} color="text-amber-400" />
        <StatCard icon={Users} label="Active Users" value={uniqueUsers} color="text-emerald-400" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="timeline" className="text-xs font-mono">Activity Timeline</TabsTrigger>
          <TabsTrigger value="escalations" className="text-xs font-mono">Escalations</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-muted-foreground">{filteredLogs.length} events</p>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="text-[10px] font-mono">All Categories</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-[10px] font-mono">{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-card border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[9px] font-mono text-muted-foreground w-[140px]">TIME</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground w-[100px]">CATEGORY</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground w-[180px]">USER</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground w-[140px]">ACTION</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">CONTEXT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Shield className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-[10px] font-mono text-muted-foreground">No activity recorded yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map(entry => {
                    const cfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.general;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={entry.id} className="border-border">
                        <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3 w-3 ${cfg.color}`} />
                            <span className={`text-[9px] font-mono uppercase ${cfg.color}`}>{entry.category}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-foreground py-2 truncate max-w-[180px]">
                          {entry.user_email || entry.user_id.slice(0, 8) + '…'}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[8px] font-mono">{entry.action}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground py-2 truncate max-w-[300px]">
                          {entry.context || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Escalations Tab */}
        <TabsContent value="escalations" className="space-y-3">
          <p className="text-[10px] font-mono text-muted-foreground">{escalations.length} escalations</p>
          <Card className="bg-card border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[9px] font-mono text-muted-foreground">TIME</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">INCIDENT</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">PRIORITY</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">STATUS</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">ASSIGNED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <AlertTriangle className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-[10px] font-mono text-muted-foreground">No escalations found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  escalations.map(esc => (
                    <TableRow key={esc.id} className="border-border">
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {format(new Date(esc.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-foreground py-2 truncate max-w-[200px]">
                        {esc.incident_title}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge className={`${PRIORITY_STYLES[esc.priority] || 'bg-muted'} text-[8px] font-mono`}>
                          {esc.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className={`${STATUS_STYLES[esc.status] || ''} text-[8px] font-mono`}>
                          {esc.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {esc.assigned_to}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: number; color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-[9px] font-mono text-muted-foreground uppercase">{label}</span>
        </div>
        <div className="text-2xl font-mono font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
