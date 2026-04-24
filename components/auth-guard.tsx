'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

// On définit les rôles pour éviter les fautes de frappe
type Role = 'copropriétaire' | 'membre_cs' | 'syndic' | 'administrateur' | 'artisan';

interface HasRoleProps {
  roles: Role[];
  children: React.ReactNode;
}

export function HasRole({ roles, children }: HasRoleProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(data?.role || null);
      }
      setLoading(false);
    }
    getRole();
  }, [supabase]);

  // Pendant le chargement, on n'affiche rien pour éviter les flashs d'UI
  if (loading) return null;

  // Si le rôle de l'utilisateur n'est pas dans la liste autorisée, on cache tout
  if (!userRole || !roles.includes(userRole as Role)) {
    return null;
  }

  return <>{children}</>;
}