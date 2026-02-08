import { useAuditLog } from '@/hooks/useAuditLog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, Shield } from 'lucide-react';

export default function AuditLog() {
  const { entries } = useAuditLog();

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
        <Badge variant="outline" className="text-[10px] font-mono">
          ADMIN ONLY
        </Badge>
      </div>

      <Card className="border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-[9px] font-mono text-muted-foreground w-[160px]">TIMESTAMP</TableHead>
              <TableHead className="text-[9px] font-mono text-muted-foreground w-[200px]">USER</TableHead>
              <TableHead className="text-[9px] font-mono text-muted-foreground w-[180px]">ACTION</TableHead>
              <TableHead className="text-[9px] font-mono text-muted-foreground">CONTEXT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
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
                    {entry.timestamp}
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-foreground py-2 truncate max-w-[200px]">
                    {entry.user}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[8px] font-mono">
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground py-2 truncate">
                    {entry.context}
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
