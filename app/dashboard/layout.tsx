'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Settings,
  LogOut,
  X,
  Search,
  MessageSquare,
  Users,
  Vote,
  Calendar,
  ShieldAlert,
  FolderLock,
  Wrench,
  BookOpen,
  PieChart,
  FileText,
  ClipboardList,
  Building2,
  ScrollText,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './notification-bell';
import { Logo } from '@/components/ui/logo';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// ================================================================
// CONFIGURATION DE NAVIGATION
// roles      = rôles qui PEUVENT voir
// hiddenFor  = rôles qui ne peuvent PAS voir (prioritaire sur roles)
// ================================================================
const NAVIGATION: {
  group: string;
  roles?: string[];
  hiddenFor?: string[];
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles?: string[];
    hiddenFor?: string[];
  }[];
}[] = [
  {
    group: 'PRINCIPAL',
    items: [
      { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
      {
        name: 'Le Mur Officiel',
        href: '/dashboard/annonces',
        icon: Megaphone,
        hiddenFor: ['artisan'],
      },
      {
        name: 'Vie de la Résidence',
        href: '/dashboard/communaute',
        icon: MessageSquare,
        hiddenFor: ['artisan'],
      },
      { name: 'Signalements', href: '/dashboard/tickets', icon: Wrench },
    ],
  },
  {
    group: 'COMMUNAUTÉ',
    hiddenFor: ['artisan'], // tout le groupe caché pour l'artisan
    items: [
      { name: 'Annuaire', href: '/dashboard/annuaire', icon: Users },
      { name: 'Votes & Sondages', href: '/dashboard/votes', icon: Vote },
      {
        name: 'Agenda Résidentiel',
        href: '/dashboard/agenda',
        icon: Calendar,
      },
    ],
  },
  {
    group: 'RESSOURCES',
    items: [
      {
        name: 'Coffre-fort',
        href: '/dashboard/documents',
        icon: FolderLock,
        hiddenFor: ['artisan', 'copropriétaire'],
      },
      { name: 'Wiki Résidence', href: '/dashboard/wiki', icon: BookOpen },
      {
        name: 'Contrats',
        href: '/dashboard/contrats',
        icon: FileText,
        roles: ['syndic', 'administrateur', 'membre_cs'],
      },
      {
        name: "Carnet d'Entretien",
        href: '/dashboard/carnet',
        icon: ClipboardList,
        hiddenFor: ['artisan'],
      },
    ],
  },
  {
    group: 'GOUVERNANCE',
    roles: ['syndic', 'administrateur', 'membre_cs'],
    items: [
      {
        name: 'Conseil Syndical',
        href: '/dashboard/conseil',
        icon: ShieldAlert,
      },
      {
        name: 'Assemblées Générales',
        href: '/dashboard/ag',
        icon: Building2,
      },
      {
        name: "Journal d'Audit",
        href: '/dashboard/audit',
        icon: ScrollText,
      },
      { name: 'Statistiques', href: '/dashboard/stats', icon: PieChart },
    ],
  },
];

const MOBILE_TABS = [
  { name: 'Tableau', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Annonces', href: '/dashboard/annonces', icon: Megaphone, hiddenFor: ['artisan'] },
  { name: 'Signaler', href: '/dashboard/tickets', icon: ShieldAlert },
  { name: 'Social', href: '/dashboard/communaute', icon: MessageSquare, hiddenFor: ['artisan'] },
  { name: 'Menu', href: '#menu', icon: Users },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userInitials, setUserInitials] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // CMD + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadUserInfo = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('prenom, nom, role')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUserInitials(
          `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`
        );
        setUserName(`${profile.prenom} ${profile.nom}`);
        setUserRole(profile.role || 'Résident');
      }
    }
  }, [supabase]);

  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ================================================================
  // FILTRE DE NAVIGATION selon le rôle du user
  // ================================================================
  const visibleNavigation = NAVIGATION
    .filter((group) => {
      // Si le groupe est caché pour ce rôle → on le retire
      if (group.hiddenFor?.includes(userRole)) return false;
      // Si le groupe a des rôles requis → vérifier
      if (group.roles && !group.roles.includes(userRole)) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.hiddenFor?.includes(userRole)) return false;
        if (item.roles && !item.roles.includes(userRole)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0); // supprimer groupes vides

  // Tabs mobiles filtrées
  const visibleMobileTabs = MOBILE_TABS.filter(
    (tab) => !(tab as { hiddenFor?: string[] }).hiddenFor?.includes(userRole)
  );

  // Navigation pour la command palette (tous les items visibles à plat)
  const allVisibleItems = visibleNavigation.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex font-sans selection:bg-indigo-500/30">

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-[100] w-[280px] bg-[#0F172A] text-slate-300 transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-10 px-2">
            <Link href="/dashboard">
              <Logo
                variant="light"
                className="scale-90 origin-left hover:scale-100 transition-transform duration-500"
              />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-white hover:bg-white/5 rounded-xl"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Badge rôle artisan */}
          {userRole === 'artisan' && (
            <div className="mb-6 mx-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Espace Artisan
              </p>
              <p className="text-[9px] text-slate-500 mt-1">
                Accès limité à vos missions
              </p>
            </div>
          )}

          <nav className="flex-1 space-y-8">
            {visibleNavigation.map((group) => (
              <div key={group.group} className="space-y-3">
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 px-4 uppercase">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href ||
                          pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300
                          ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-white border border-transparent hover:border-white/5'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="pt-8 mt-8 border-t border-white/5 space-y-2">
            <Link
              href="/dashboard/parametre"
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                pathname === '/dashboard/parametre'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings
                className={`h-5 w-5 ${
                  pathname === '/dashboard/parametre'
                    ? 'text-white'
                    : 'text-slate-500'
                }`}
              />
              Paramètres
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-rose-400 hover:bg-rose-400/10 transition-all"
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">

        {/* TOP BAR */}
        <header
          className={`
            sticky top-0 z-40 flex items-center justify-between px-4 lg:px-10 h-16 lg:h-20 transition-all duration-300
            ${
              scrolled
                ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl shadow-sm'
                : 'bg-transparent'
            }
          `}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden h-10 w-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 shadow-sm transition-all"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5 text-indigo-600" />
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>

            <div
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex items-center bg-slate-100/50 dark:bg-white/5 px-4 h-12 rounded-2xl border border-slate-200/50 dark:border-white/10 w-[400px] group hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-500 shadow-sm cursor-pointer"
            >
              <Search className="h-4 w-4 text-slate-400 mr-3 group-hover:text-indigo-500 transition-colors" />
              <span className="text-sm font-bold text-slate-400 flex-1">
                Rechercher un document, un ticket...
              </span>
              <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 font-mono text-[10px] font-medium text-slate-500">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>

            <div
              className={`lg:hidden transition-all duration-500 ${
                scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            >
              <Logo withText={false} className="scale-75" />
            </div>
          </div>

          {/* COMMAND PALETTE */}
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogContent className="sm:max-w-[600px] p-0 border-none shadow-2xl bg-white dark:bg-slate-950 overflow-hidden rounded-[2.5rem]">
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center gap-4">
                <Search className="h-6 w-6 text-indigo-600" />
                <input
                  autoFocus
                  placeholder="Que cherchez-vous ?"
                  className="flex-1 bg-transparent border-none text-lg font-bold outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                />
                <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 font-mono text-[10px] font-medium text-slate-500">
                  ESC
                </kbd>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 mb-3">
                      Navigation Rapide
                    </p>
                    <div className="space-y-1">
                      {/* On utilise allVisibleItems — déjà filtré par rôle */}
                      {allVisibleItems
                        .filter(
                          (item) =>
                            !searchTerm ||
                            item.name.toLowerCase().includes(searchTerm)
                        )
                        .slice(0, 8)
                        .map((item) => (
                          <button
                            key={item.href}
                            onClick={() => {
                              router.push(item.href);
                              setIsSearchOpen(false);
                            }}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group text-left"
                          >
                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-indigo-500/20 group-hover:shadow-sm transition-all">
                              <item.icon className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-sm">{item.name}</span>
                            <ArrowUpRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-3 lg:gap-6">
            <NotificationBell />

            <div className="h-11 w-[1px] bg-slate-200 dark:bg-white/5 hidden sm:block mx-2"></div>

            <Link
              href="/dashboard/parametre"
              className="flex items-center gap-3 group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                  {userName || 'Chargement...'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {userRole}
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl border-2 border-transparent group-hover:border-indigo-500/50 transition-all duration-500 bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500"></div>
                <span className="relative z-10">{userInitials || '..'}</span>
              </div>
            </Link>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-32 lg:pb-10">
          <div className="p-0">{children}</div>
        </main>

        {/* MOBILE BOTTOM TAB BAR */}
        <nav
          className={`
            fixed bottom-4 left-4 right-4 z-40 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/10 h-16 rounded-2xl lg:hidden flex items-center justify-around px-2 shadow-2xl transition-all duration-500
            ${
              sidebarOpen
                ? 'translate-y-[200%] opacity-0'
                : 'translate-y-0 opacity-100'
            }
          `}
        >
          {visibleMobileTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const isMenu = tab.href === '#menu';
            const isAction = tab.name === 'Signaler';

            return (
              <button
                key={tab.name}
                onClick={() => {
                  if (isMenu) {
                    setSidebarOpen(true);
                  } else {
                    router.push(tab.href);
                  }
                }}
                className={`flex flex-col items-center justify-center transition-all duration-300 flex-1 relative ${
                  isActive ? 'scale-100' : 'opacity-60 grayscale-[0.5]'
                }`}
              >
                <div
                  className={`
                    flex items-center justify-center transition-all
                    ${
                      isAction
                        ? 'h-12 w-12 bg-indigo-600 -translate-y-4 rounded-full border-4 border-[#F8FAFC] dark:border-[#020617] shadow-xl shadow-indigo-600/40 text-white'
                        : 'h-10 w-10 text-slate-400'
                    }
                    ${isActive && !isAction ? 'text-indigo-400' : ''}
                  `}
                >
                  <tab.icon className={isAction ? 'h-6 w-6' : 'h-5 w-5'} />
                </div>
                {!isAction && (
                  <span
                    className={`text-[8px] font-black uppercase tracking-tight -mt-1 ${
                      isActive ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {tab.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
