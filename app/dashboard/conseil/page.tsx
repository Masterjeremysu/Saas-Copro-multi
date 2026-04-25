'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  FileText, 
  Clock, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface CouncilStats {
  activeMembers: string;
  urgentTickets: string;
  activeVotes: string;
  budgetValue: string;
}

interface Activity {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
}

export default function ConseilPage() {
  const [stats, setStats] = useState<CouncilStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user.id).single();
      const coproId = profile?.copropriete_id;

      const { count: memberCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('copropriete_id', coproId);

      const { count: urgentCount } = await supabase
        .from('annonces')
        .select('*', { count: 'exact', head: true })
        .eq('copropriete_id', coproId)
        .eq('prioritaire', true);

      const { count: voteCount } = await supabase
        .from('sondages')
        .select('*', { count: 'exact', head: true })
        .eq('copropriete_id', coproId)
        .gte('date_fin', new Date().toISOString());

      const { data: recentAnnonces } = await supabase
        .from('annonces')
        .select('id, titre, created_at, type')
        .eq('copropriete_id', coproId)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        activeMembers: `${memberCount || 0}`,
        urgentTickets: `${urgentCount || 0}`,
        activeVotes: `${voteCount || 0}`,
        budgetValue: 'N/A'
      });

      if (recentAnnonces) {
        setActivities(recentAnnonces.map(a => ({
          id: a.id,
          title: a.titre,
          date: new Date(a.created_at).toLocaleDateString('fr-FR'),
          status: 'Publié',
          type: a.type
        })));
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const STAT_CARDS: { label: string, value: string, icon: React.ComponentType<{className?: string}>, color: string, bg: string }[] = [
    { label: 'Membres Copropriété', value: stats?.activeMembers || '0', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Alertes Prioritaires', value: stats?.urgentTickets || '0', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Votes Actifs', value: stats?.activeVotes || '0', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Budget Consommé', value: stats?.budgetValue || 'N/A', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] p-4 lg:p-10 animate-in fade-in duration-500 pb-32">
      
      {/* TACTICAL HERO - MISSION CONTROL STYLE */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl mb-10 mx-2 lg:mx-0">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="space-y-6 text-center lg:text-left flex-1">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
               <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Stratégie Live</span>
            </div>
            
            <h1 className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic pr-4">
               Conseil <br className="hidden lg:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Syndical</span>
            </h1>
            
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <p className="text-slate-400 font-medium text-sm lg:text-xl max-w-xl leading-relaxed mx-auto lg:mx-0">
                 Pilotage stratégique et surveillance en temps réel des actifs de la copropriété.
              </p>
              
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck className="h-3.5 w-3.5" /> Données Certifiées
              </Badge>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
             <div className="h-32 w-32 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                <ShieldAlert className="h-8 w-8 text-indigo-400 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Membres</p>
                <p className="text-xl font-black">{stats?.activeMembers || '0'}</p>
             </div>
             <Button variant="outline" onClick={() => loadData()} className="h-32 w-32 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all border-none">
                <RotateCcw className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actualiser</p>
             </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STAT_CARDS.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`h-12 w-12 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{stat.label}</h3>
              <p className="text-3xl font-black text-slate-900 dark:text-white italic">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tighter uppercase italic">Historique de la Copropriété</h2>
            </div>
            <div className="p-2">
              {activities.length > 0 ? activities.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[1.5rem] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 dark:text-white text-sm leading-tight truncate">{action.title}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{action.type} · {action.date}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 shrink-0">
                    {action.status}
                  </Badge>
                </div>
              )) : (
                <p className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">Aucune activité récente</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Centre de Commande</h3>
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-lg font-black text-slate-900 dark:text-white italic">Accès Syndic</p>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">Données en direct</p>
              </div>
            </div>
            <Link href="/dashboard/votes">
              <Button className="w-full h-14 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 group">
                Lancer une Décision <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
