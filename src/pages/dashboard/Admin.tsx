import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <div className="text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
          Verifying admin access
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard/brief" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-mono font-bold">Administration</h1>
        <p className="text-muted-foreground text-xs font-mono">System configuration and user management</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-mono font-semibold mb-4">User Management</h2>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-xs font-mono">[USER_MANAGEMENT]</div>
            <div className="text-muted-foreground/50 text-[10px] font-mono">Awaiting implementation</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-mono font-semibold mb-4">Organization Settings</h2>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-xs font-mono">[ORG_SETTINGS]</div>
            <div className="text-muted-foreground/50 text-[10px] font-mono">Awaiting implementation</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-mono font-semibold mb-4">Role Configuration</h2>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-xs font-mono">[ROLE_CONFIG]</div>
            <div className="text-muted-foreground/50 text-[10px] font-mono">Awaiting implementation</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-mono font-semibold mb-4">System Logs</h2>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-xs font-mono">[SYSTEM_LOGS]</div>
            <div className="text-muted-foreground/50 text-[10px] font-mono">Awaiting implementation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
