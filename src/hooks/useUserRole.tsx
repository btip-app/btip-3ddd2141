import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'analyst' | 'operator' | 'executive' | 'viewer';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setRole(data.role as AppRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const isAnalyst = role === 'analyst';
  const isOperator = role === 'operator';
  const isExecutive = role === 'executive' || role === 'viewer';

  return { role, loading, isAdmin, isAnalyst, isOperator, isExecutive };
}
