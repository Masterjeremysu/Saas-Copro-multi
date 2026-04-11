'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  Home, Ticket, BookOpen, LogOut, UserCog, 
  ShieldCheck, Zap, HistoryIcon, BarChart3, 
  HardHat, Menu, Megaphone, Wallet, FileSignature, Vote,
  ShieldAlert, FolderLock, Users // <-- Ajout de Users pour les AG
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './notification-bell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(data);
      }
    }
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
      <aside className="hidden lg:flex w-72 flex-col bg-[#0F172A] text-slate-300 shrink-0 shadow-2xl z-50">
        <div className="h-24 flex items-center px-8 text-white border-b border-slate-800/50">
          <div className="p-2 bg-indigo-600 rounded-xl mr-3 shadow-lg shadow-indigo-500/20">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <span className="font-black text-xl tracking-tighter">COPROSYNC</span>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-hide">
          <p className="px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Principal</p>
          <NavItem href="/dashboard" icon={<Home className="h-5 w-5" />} label="Vue d'ensemble" active={pathname === '/dashboard'} />
          <NavItem href="/dashboard/annonces" icon={<Megaphone className="h-5 w-5" />} label="Le Mur" active={pathname.startsWith('/dashboard/annonces')} />
          <NavItem href="/dashboard/documents" icon={<FolderLock className="h-5 w-5" />} label="Coffre-fort" active={pathname.startsWith('/dashboard/documents')} />
          <NavItem href="/dashboard/votes" icon={<Vote className="h-5 w-5" />} label="Votes & Sondages" active={pathname.startsWith('/dashboard/votes')} />
          
          {/* NOUVEAU LIEN : Assemblées Générales */}
          <NavItem href="/dashboard/ag" icon={<Users className="h-5 w-5" />} label="Assemblées Générales" active={pathname.startsWith('/dashboard/ag')} />
          
          <NavItem href="/dashboard/tickets" icon={<Ticket className="h-5 w-5" />} label="Signalements" active={pathname.startsWith('/dashboard/tickets')} />
          
          <div className="pt-8">
            <p className="px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Ressources</p>
            <NavItem href="/dashboard/prestataires" icon={<HardHat className="h-5 w-5" />} label="Prestataires" active={pathname.startsWith('/dashboard/prestataires')} />
            <NavItem href="/dashboard/contrats" icon={<FileSignature className="h-5 w-5" />} label="Contrats" active={pathname.startsWith('/dashboard/contrats')} />
            <NavItem href="/dashboard/wiki" icon={<BookOpen className="h-5 w-5" />} label="Wiki Résidence" active={pathname.startsWith('/dashboard/wiki')} />
          </div>

          <div className="pt-8">
            <p className="px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Gestion & Data</p>
            {/* CORRECTION : /dashboard/finance devient /dashboard/finances */}
            <NavItem href="/dashboard/finances" icon={<Wallet className="h-5 w-5" />} label="Finances & Budget" active={pathname.startsWith('/dashboard/finances')} />
            <NavItem href="/dashboard/carnet" icon={<HistoryIcon className="h-5 w-5" />} label="Carnet d'Entretien" active={pathname.startsWith('/dashboard/carnet')} />
            <NavItem href="/dashboard/stats" icon={<BarChart3 className="h-5 w-5" />} label="Statistiques" active={pathname === '/dashboard/stats'} />
            <NavItem href="/dashboard/audit" icon={<ShieldAlert className="h-5 w-5" />} label="Journal d'Audit" active={pathname.startsWith('/dashboard/audit')} />
          </div>

          <div className="pt-8 border-t border-slate-800/50 mt-8">
            <p className="px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Mon Compte</p>
            {userProfile?.role === 'administrateur' && (
              <NavItem href="/dashboard/admin" icon={<ShieldCheck className="h-5 w-5" />} label="Admin Parc" active={pathname.startsWith('/dashboard/admin')} color="text-rose-400" />
            )}
            <NavItem href="/dashboard/profil" icon={<UserCog className="h-5 w-5" />} label="Paramètres Profil" active={pathname.startsWith('/dashboard/profil')} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-4 h-12 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all font-bold">
            <LogOut className="h-5 w-5" /> Déconnexion
          </Button>
        </div>
      </aside>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 shrink-0 z-40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-6 w-6 text-slate-600" />
            </Button>
            <div className="hidden sm:block">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">CoproSync v3.0</h2>
              <p className="text-sm font-bold text-slate-900 capitalize italic leading-none">{pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
            <NotificationBell />
            <Link href="/dashboard/profil">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center cursor-pointer hover:bg-indigo-100 transition-colors group">
                <UserCog className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-[1600px] mx-auto pb-20">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active = false, color = "text-slate-400" }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-300 group ${active ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 font-bold translate-x-1" : `hover:bg-white/5 hover:text-white ${color}`}`}>
      <span className={`${active ? "text-white" : "group-hover:text-indigo-400"} transition-colors`}>{icon}</span>
      <span className="text-[13px] tracking-tight">{label}</span>
    </Link>
  );
}