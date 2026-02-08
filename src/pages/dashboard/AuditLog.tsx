import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ClipboardList, Shield, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditRow {
  id: string;
  user_email: string | null;
  action: string;
  category: string;
  context: string | null;
  created_at: string;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('id, user_email, action, category, context, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setEntries((data as AuditRow[]) || []);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel('audit-log-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setEntries(prev => [payload.new as AuditRow, ...prev].slice(0, 200));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-mono font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
            System activity log • {entries.length} entries recorded
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">ADMIN ONLY</Badge>
      </div>

      <Card className="border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-[9px] font-mono text-muted-foreground w-[160px]">TIMESTAMP</TableHead>
              <TableHead className="text-[9px] font-mono text-muted-foreground w-[100px]">CATEGORY</TableHead>
              <TableHead className="text-[9px] font-mono text-muted-foreground w-[200px]">USER</TableHead>
              <TableHead className="text-[9px] font-mono text-muted-foreground w-[180px]">ACTION</TableHead>
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
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Shield className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[10px] font-mono text-muted-foreground">No audit entries recorded yet.</p>
                  <p className="text-[9px] font-mono text-muted-foreground/50 mt-1">
                    Actions across the platform will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              entries.map(entry => (
                <TableRow key={entry.id} className="border-border">
                  <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[8px] font-mono uppercase">{entry.category}</Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-foreground py-2 truncate max-w-[200px]">
                    {entry.user_email || '—'}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[8px] font-mono">{entry.action}</Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground py-2 truncate">
                    {entry.context || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
