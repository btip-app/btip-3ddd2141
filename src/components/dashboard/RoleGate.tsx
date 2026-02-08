import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { Shield } from 'lucide-react';

interface RoleGateProps {
  allowed: AppRole[];
  children: ReactNode;
  fallback?: 'redirect' | 'hidden' | 'denied';
}

export function RoleGate({ allowed, children, fallback = 'redirect' }: RoleGateProps) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground text-xs font-mono">Loading...</div>
      </div>
    );
  }

  if (!role || !allowed.includes(role)) {
    if (fallback === 'redirect') {
      return <Navigate to="/dashboard/brief" replace />;
    }
    if (fallback === 'hidden') {
      return null;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Shield className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-xs font-mono text-muted-foreground">ACCESS DENIED</p>
        <p className="text-[10px] font-mono text-muted-foreground/60">
          Your role ({role ?? 'none'}) does not have access to this module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
