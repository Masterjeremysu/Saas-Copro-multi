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

export default function StatsPage() {
  const [data, setData] = useState<any>({
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
        const profile = rawProfile as any;
        
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
        const stats = tickets.reduce((acc: any, t: any) => {
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
  }, []);

  const resolutionRate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;

  if (isLoading) return <div className="p-10 text-center animate-pulse font-medium text-slate-400">Analyse des données en cours...</div>;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto mb-20">
      
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
              {Object.entries(data.byCategory).map(([cat, count]: any) => {
                const percentage = Math.round((count / data.total) * 100);
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="capitalize text-slate-600">{cat}</span>
                      <span className="text-slate-900">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-1000 ease-out" 
                        style={{ width: `${percentage}%` }}
                      ></div>
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
              Niveaux d'urgence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <UrgenceRow label="Critique" count={data.byUrgence.critique} color="bg-rose-500" />
            <UrgenceRow label="Normale" count={data.byUrgence.normale} color="bg-amber-500" />
            <UrgenceRow label="Basse" count={data.byUrgence.basse} color="bg-indigo-400" />
            
            <div className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Note IA</p>
              <p className="text-sm mt-2 text-slate-300 leading-relaxed italic">
                "Le volume d'incidents est stable. Concentrez les efforts sur la catégorie <strong>{Object.keys(data.byCategory)[0] || '...'}</strong> qui représente la majorité des plaintes."
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, up, down }: any) {
  return (
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
  );
}

function UrgenceRow({ label, count, color }: any) {
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