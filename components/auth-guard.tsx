'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// ================================================================
// TYPES
// ================================================================
export type UserRole =
  | 'copropriétaire'
  | 'membre_cs'
  | 'syndic'
  | 'administrateur'
  | 'artisan';

// ================================================================
// HOOK — useUserRole
// Utilise ce hook dans n'importe quel composant pour accéder au rôle
// ================================================================
export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole((data?.role as UserRole) || null);
      }
      setLoading(false);
    }
    getRole();
  }, [supabase]);

  return {
    userRole,
    loading,
    isArtisan: userRole === 'artisan',
    isSyndic: userRole === 'syndic',
    isAdmin: userRole === 'administrateur',
    isCS: userRole === 'membre_cs',
    isResident: userRole === 'copropriétaire',
    hasRole: (roles: UserRole[]) => userRole ? roles.includes(userRole) : false,
  };
}

// ================================================================
// COMPOSANT — HasRole
// Affiche les enfants SEULEMENT si le user a le bon rôle
// Usage : <HasRole roles={['syndic', 'administrateur']}> ... </HasRole>
// ================================================================
interface HasRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode; // optionnel : afficher autre chose si pas le droit
}

export function HasRole({ roles, children, fallback = null }: HasRoleProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  if (loading) return null;
  if (!userRole || !roles.includes(userRole as UserRole)) return <>{fallback}</>;
  return <>{children}</>;
}

// ================================================================
// COMPOSANT — HideForArtisan
// Raccourci pratique pour cacher quelque chose aux artisans
// Usage : <HideForArtisan> ... </HideForArtisan>
// ================================================================
export function HideForArtisan({ children }: { children: React.ReactNode }) {
  return (
    <HasRole
      roles={[
        'copropriétaire',
        'membre_cs',
        'syndic',
        'administrateur',
      ]}
    >
      {children}
    </HasRole>
  );
}

// ================================================================
// COMPOSANT — OnlyArtisan
// Affiche uniquement pour les artisans
// Usage : <OnlyArtisan> ... </OnlyArtisan>
// ================================================================
export function OnlyArtisan({ children }: { children: React.ReactNode }) {
  return <HasRole roles={['artisan']}>{children}</HasRole>;
}

// ================================================================
// COMPOSANT — RequireRole
// Guard de PAGE entière : redirige si pas le bon rôle
// Usage : wrape tout le return() de ta page avec ça
// ================================================================
interface RequireRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function RequireRole({
  roles,
  children,
  redirectTo = '/dashboard',
}: RequireRoleProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        const role = data?.role || null;
        setUserRole(role);
        if (role && !roles.includes(role as UserRole)) {
          router.replace(redirectTo);
        }
      }
      setLoading(false);
    }
    getRole();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!userRole || !roles.includes(userRole as UserRole)) return null;
  return <>{children}</>;
}

// ================================================================
// COMPOSANT — ArtisanOnlyPage
// Guard spécifique : page réservée aux artisans
// ================================================================
export function ArtisanOnlyPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['artisan']} redirectTo="/dashboard">
      {children}
    </RequireRole>
  );
}

// ================================================================
// COMPOSANT — NoArtisanPage
// Guard spécifique : page interdite aux artisans
// ================================================================
export function NoArtisanPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole
      roles={['copropriétaire', 'membre_cs', 'syndic', 'administrateur']}
      redirectTo="/dashboard"
    >
      {children}
    </RequireRole>
  );
}

// ================================================================
// COMPOSANT — GovernancePage
// Guard spécifique : page de gouvernance (CS, Syndic, Admin)
// ================================================================
export function GovernancePage({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole
      roles={['membre_cs', 'syndic', 'administrateur']}
      redirectTo="/dashboard"
    >
      {children}
    </RequireRole>
  );
}

// ================================================================
// COMPOSANT — AdminOnlyPage
// Guard spécifique : page réservée syndic + admin uniquement
// ================================================================
export function AdminOnlyPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole
      roles={['syndic', 'administrateur']}
      redirectTo="/dashboard"
    >
      {children}
    </RequireRole>
  );
}
