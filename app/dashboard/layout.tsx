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
  ScrollText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './notification-bell';
import { Logo } from '@/components/ui/logo';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const NAVIGATION: { group: string, roles?: string[], items: { name: string, href: string, icon: React.ComponentType<{className?: string}>, roles?: string[] }[] }[] = [
  { group: "PRINCIPAL", items: [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Le Mur Officiel', href: '/dashboard/annonces', icon: Megaphone },
    { name: 'Vie de la Résidence', href: '/dashboard/communaute', icon: MessageSquare },
    { name: 'Signalements', href: '/dashboard/tickets', icon: Wrench },
  ]},
  { group: "COMMUNAUTÉ", items: [
    { name: 'Annuaire', href: '/dashboard/annuaire', icon: Users },
    { name: 'Votes & Sondages', href: '/dashboard/votes', icon: Vote },
    { name: 'Agenda Résidentiel', href: '/dashboard/agenda', icon: Calendar },
  ]},
  { group: "RESSOURCES", items: [
    { name: 'Coffre-fort', href: '/dashboard/documents', icon: FolderLock },
    { name: 'Wiki Résidence', href: '/dashboard/wiki', icon: BookOpen },
    { name: 'Contrats', href: '/dashboard/contrats', icon: FileText, roles: ['syndic', 'administrateur', 'membre_cs'] },
    { name: 'Carnet d\'Entretien', href: '/dashboard/carnet', icon: ClipboardList },
  ]},
  { group: "GOUVERNANCE", roles: ['syndic', 'administrateur', 'membre_cs'], items: [
    { name: 'Conseil Syndical', href: '/dashboard/conseil', icon: ShieldAlert },
    { name: 'Assemblées Générales', href: '/dashboard/ag', icon: Building2 },
    { name: 'Journal d\'Audit', href: '/dashboard/audit', icon: ScrollText },
    { name: 'Statistiques', href: '/dashboard/stats', icon: PieChart },
  ]},
];


const MOBILE_TABS = [
  { name: 'Tableau', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Annonces', href: '/dashboard/annonces', icon: Megaphone },
  { name: 'Signaler', href: '/dashboard/tickets', icon: ShieldAlert },
  { name: 'Social', href: '/dashboard/communaute', icon: MessageSquare },
  { name: 'Menu', href: '#menu', icon: Users }, // '#menu' sera intercepté pour ouvrir la sidebar
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
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadUserInfo = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('prenom, nom, role').eq('id', user.id).single();
      if (profile) {
        setUserInitials(`${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`);
        setUserName(`${profile.prenom} ${profile.nom}`);
        setUserRole(profile.role || 'Résident');
      }
    }
  }, [supabase]);

  // Sync user info
  useEffect(() => { 
    const init = async () => {
      await loadUserInfo();
    };
    init();
  }, [loadUserInfo]);

  // Fermer la sidebar lors d'une navigation pour éviter les rendus en cascade
  useEffect(() => { 
    const timer = setTimeout(() => {
      setSidebarOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]); // On ne déclenche l'effet que lors d'un changement de page

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

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
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-[280px] bg-[#0F172A] text-slate-300 transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-10 px-2">
            <Link href="/dashboard">
              <Logo variant="light" className="scale-90 origin-left hover:scale-100 transition-transform duration-500" />
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white hover:bg-white/5 rounded-xl">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <nav className="flex-1 space-y-8">
            {NAVIGATION
              .filter((group) => !(group as Record<string, unknown>).roles || ((group as Record<string, unknown>).roles as string[]).includes(userRole))
              .map((group) => (
              <div key={group.group} className="space-y-3">
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 px-4 uppercase">{group.group}</p>
                <div className="space-y-1">
                  {group.items
                    .filter((item) => !item.roles || item.roles.includes(userRole))
                    .map((item) => {
                    // FIX : Match exact pour le dashboard pour éviter le double highlight
                    const isActive = item.href === '/dashboard' 
                      ? pathname === '/dashboard' 
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300
                          ${isActive 
                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' 
                            : 'text-slate-400 hover:bg-white/[0.03] hover:text-white border border-transparent hover:border-white/5'}
                        `}
                      >
                        <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
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
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${pathname === '/dashboard/parametre' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <Settings className={`h-5 w-5 ${pathname === '/dashboard/parametre' ? 'text-white' : 'text-slate-500'}`} />
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
        <header className={`
          sticky top-0 z-40 flex items-center justify-between px-4 lg:px-10 h-16 lg:h-20 transition-all duration-300
          ${scrolled ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'}
        `}>
          <div className="flex items-center gap-4">
            {/* Hamburger pour mobile — ouvre la sidebar */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="lg:hidden h-10 w-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 shadow-sm transition-all"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5 text-indigo-600" />
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
            <div className="hidden lg:flex items-center bg-slate-100/50 dark:bg-white/5 px-4 h-12 rounded-2xl border border-slate-200/50 dark:border-white/10 w-[400px] group focus-within:w-[500px] focus-within:border-indigo-500/50 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all duration-500 shadow-sm">
              <Search className="h-4 w-4 text-slate-400 mr-3 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Rechercher un document, un ticket, un voisin..." 
                className="bg-transparent border-none text-sm outline-none w-full font-bold placeholder:font-medium placeholder:text-slate-400"
              />
            </div>
            {/* Logo mobile visible au scroll */}
            <div className={`lg:hidden transition-all duration-500 ${scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <Logo withText={false} className="scale-75" />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            {/* Notification Bell avec Realtime */}
            <NotificationBell />
            
            <div className="h-11 w-[1px] bg-slate-200 dark:bg-white/5 hidden sm:block mx-2"></div>

            <Link href="/dashboard/parametre" className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{userName || 'Chargement...'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userRole}</p>
              </div>
              <div className="h-11 w-11 rounded-2xl border-2 border-transparent group-hover:border-indigo-500/50 transition-all duration-500 bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500"></div>
                <span className="relative z-10">{userInitials || '..'}</span>
              </div>
            </Link>
          </div>
        </header>

        {/* MAIN SCROLL AREA */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-32 lg:pb-10">
          <div className="p-0">
            {children}
          </div>
        </main>

        {/* MOBILE BOTTOM TAB BAR */}
        <nav className={`
          fixed bottom-4 left-4 right-4 z-40 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/10 h-16 rounded-2xl lg:hidden flex items-center justify-around px-2 shadow-2xl transition-all duration-500
          ${sidebarOpen ? 'translate-y-[200%] opacity-0' : 'translate-y-0 opacity-100'}
        `}>
          {MOBILE_TABS.map((tab) => {
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
                className={`flex flex-col items-center justify-center transition-all duration-300 flex-1 relative ${isActive ? 'scale-100' : 'opacity-60 grayscale-[0.5]'}`}
              >
                <div className={`
                  flex items-center justify-center transition-all
                  ${isAction ? 'h-12 w-12 bg-indigo-600 -translate-y-4 rounded-full border-4 border-[#F8FAFC] dark:border-[#020617] shadow-xl shadow-indigo-600/40 text-white' : 'h-10 w-10 text-slate-400'}
                  ${isActive && !isAction ? 'text-indigo-400' : ''}
                `}>
                  <tab.icon className={isAction ? "h-6 w-6" : "h-5 w-5"} />
                </div>
                {!isAction && (
                  <span className={`text-[8px] font-black uppercase tracking-tight -mt-1 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
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