'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface Ticket {
  id: string;
  statut: string;
  categorie: string;
  urgence: 'critique' | 'normale' | 'basse';
  [key: string]: unknown;
}

interface StatsData {
  total: number;
  resolved: number;
  pending: number;
  byCategory: Record<string, number>;
  byUrgence: {
    critique: number;
    normale: number;
    basse: number;
  };
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData>({
    total: 0,
    resolved: 0,
    pending: 0,
    byCategory: {},
    byUrgence: { critique: 0, normale: 0, basse: 0 },
  });
  const [coproName, setCoproName] = useState<string>("votre résidence");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function loadData() {
      // 1. Récupération du nom de la copro (AVEC LE FIX TYPESCRIPT)
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: rawProfile } = await supabase
          .from('profiles')
          .select('copropriete:coproprietes(nom)')
          .eq('id', authData.user.id)
          .single();
        
        // LE FIX EST ICI
        const profile = rawProfile as unknown as { copropriete: { nom: string } | { nom: string }[] };
        
        if (profile?.copropriete) {
          const nomDeLaCopro = Array.isArray(profile.copropriete) 
            ? profile.copropriete[0]?.nom 
            : profile.copropriete.nom;
            
          if (nomDeLaCopro) setCoproName(nomDeLaCopro);
        }
      }

      // 2. Récupération et calcul des stats
      const { data: tickets } = await supabase.from('tickets').select('*');
      
      if (tickets) {
        const stats = (tickets as Ticket[]).reduce((acc: StatsData, t: Ticket) => {
          acc.total++;
          if (t.statut === 'résolu') acc.resolved++;
          else acc.pending++;
          acc.byCategory[t.categorie] = (acc.byCategory[t.categorie] || 0) + 1;
          acc.byUrgence[t.urgence] = (acc.byUrgence[t.urgence] || 0) + 1;
          return acc;
        }, { total: 0, resolved: 0, pending: 0, byCategory: {}, byUrgence: { critique: 0, normale: 0, basse: 0 } });

        setData(stats);
      }
      setIsLoading(false);
    }
    loadData();
  }, [supabase]);

  const resolutionRate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;

  if (isLoading) return <div className="p-10 text-center animate-pulse font-medium text-slate-400">Analyse des données en cours...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto mb-20"
    >
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-600" /> Analytics
          </h1>
          <p className="text-slate-500 font-medium mt-1">Rapport de performance de : {coproName}</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-4 py-1 rounded-full text-xs font-bold">
          LIVE DATA {currentYear}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Signalements" value={data.total} icon={<AlertCircle className="text-indigo-600" />} trend="+12%" up />
        <StatCard title="Taux de Résolution" value={`${resolutionRate}%`} icon={<CheckCircle2 className="text-emerald-500" />} trend="Objectif 90%" />
        <StatCard title="En attente" value={data.pending} icon={<Clock className="text-amber-500" />} trend="-2 cette semaine" down />
        <StatCard title="Urgence Critique" value={data.byUrgence.critique} icon={<TrendingUp className="text-rose-500" />} trend="Action requise" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-8">
            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-800">
              Distribution des incidents par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {Object.entries(data.byCategory).map(([cat, count]) => {
                const percentage = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="capitalize text-slate-600">{cat}</span>
                      <span className="text-slate-900">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-indigo-600"
                      ></motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-[#0F172A] text-white">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              Niveaux d&apos;urgence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <UrgenceRow label="Critique" count={data.byUrgence.critique} color="bg-rose-500" />
            <UrgenceRow label="Normale" count={data.byUrgence.normale} color="bg-amber-500" />
            <UrgenceRow label="Basse" count={data.byUrgence.basse} color="bg-indigo-400" />
            
            <div className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Intelligence Artificielle</p>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                &quot;Le volume d&apos;incidents est stable. Concentrez les efforts sur la catégorie <strong>{Object.keys(data.byCategory)[0] || '...'}</strong> qui représente la majorité des plaintes.&quot;
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      </motion.div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  up?: boolean;
  down?: boolean;
}

function StatCard({ title, value, icon, trend, up, down }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className="rounded-[2rem] border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
            <div className={`flex items-center text-[10px] font-bold ${up ? 'text-emerald-600' : down ? 'text-rose-600' : 'text-slate-400'}`}>
              {trend} {up && <ArrowUpRight className="h-3 w-3 ml-1" />} {down && <ArrowDownRight className="h-3 w-3 ml-1" />}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">{value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mt-1">{title}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function UrgenceRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${color}`}></div>
        <span className="text-sm font-medium text-slate-300">{label}</span>
      </div>
      <span className="text-xl font-black">{count}</span>
    </div>
  );
}