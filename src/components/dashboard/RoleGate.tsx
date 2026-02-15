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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <img src="/logo-full.png" alt="Loading" className="h-6 w-auto opacity-50" />
        <div className="text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
          Verifying access
        </div>
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
        <img src="/logo-full.png" alt="Bastion Intelligence" className="h-10 w-auto opacity-50" />
        <p className="text-xs font-mono text-muted-foreground">ACCESS DENIED</p>
        <p className="text-[10px] font-mono text-muted-foreground/60">
          Your role ({role ?? 'none'}) does not have access to this module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
