import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  context: string;
  timestamp: string;
}

interface AuditLogContextType {
  entries: AuditEntry[];
  log: (action: string, context: string) => void;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(undefined);

function formatTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function AuditLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const log = useCallback((action: string, context: string) => {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user: user?.email ?? 'unknown',
      action,
      context,
      timestamp: formatTimestamp(),
    };
    setEntries(prev => [entry, ...prev]);
  }, [user]);

  return (
    <AuditLogContext.Provider value={{ entries, log }}>
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
