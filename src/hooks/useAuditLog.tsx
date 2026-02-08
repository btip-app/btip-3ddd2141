import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface AuditEntry {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  category: string;
  context: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditLogContextType {
  entries: AuditEntry[];
  log: (action: string, context: string, category?: string, metadata?: Record<string, unknown>) => void;
  loading: boolean;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(undefined);

export function AuditLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Log login events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && user) {
      supabase.from('audit_log').insert([{
          user_id: user.id,
          user_email: user.email ?? null,
          action: 'login',
          category: 'auth',
          context: 'User signed in',
        }]).then();
      }
    });
    return () => subscription.unsubscribe();
  }, [user]);

  const log = useCallback(
    (action: string, context: string, category = 'general', metadata: Record<string, string> = {}) => {
      if (!user) return;
      const dbEntry = {
        user_id: user.id,
        user_email: user.email ?? null,
        action,
        category,
        context,
        metadata: metadata as Record<string, string>,
      };
      supabase.from('audit_log').insert([dbEntry]).then();
      setEntries(prev => [
        { ...dbEntry, id: `temp-${Date.now()}`, created_at: new Date().toISOString(), metadata: metadata as Record<string, unknown> },
        ...prev,
      ]);
    },
    [user],
  );

  return (
    <AuditLogContext.Provider value={{ entries, log, loading }}>
      {children}
    </AuditLogContext.Provider>
  );
}

export function useAuditLog() {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error('useAuditLog must be used within AuditLogProvider');
  }
  return context;
}
