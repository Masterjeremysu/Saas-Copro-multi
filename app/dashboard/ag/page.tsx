'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Search, Users, CalendarDays, FileText, 
  CheckCircle2, Clock, MapPin, Plus, Loader2, PlayCircle, FileSignature,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { AddAgModal } from './add-ag-modal'; 
import { motion } from 'framer-motion';

export default function AssembleesPage() {
  const [assemblees, setAssemblees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'tous' | 'prochaines' | 'passees'>('prochaines');
  
  const router = useRouter();
  const supabase = createClient();

  const fetchAGs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assemblees')
      .select('*, resolutions(count)')
      .order('date_tenue', { ascending: true });

    if (error) toast.error("Erreur de chargement des AG");
    else setAssemblees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAGs(); }, []);

  const filteredAGs = assemblees.filter(ag => {
    const matchesSearch = ag.titre?.toLowerCase().includes(searchTerm.toLowerCase());
    const isUpcoming = new Date(ag.date_tenue) > new Date();
    
    if (selectedFilter === 'prochaines') return matchesSearch && isUpcoming;
    if (selectedFilter === 'passees') return matchesSearch && !isUpcoming;
    return matchesSearch;
  });

  const agAVenir = assemblees.filter(ag => new Date(ag.date_tenue) > new Date()).length;
  const agPassees = assemblees.filter(ag => new Date(ag.date_tenue) <= new Date() && ag.statut === 'terminee').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] animate-in fade-in duration-500 pb-20">
      
      {/* HERO HEADER */}
      <div className="bg-slate-900 pt-10 pb-20 px-6 lg:px-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-600/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-blue-600/10 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div className="space-y-4">
              <Badge className="bg-indigo-500/10 text-indigo-400 border-none px-4 py-1.5 uppercase text-[10px] font-black tracking-widest">
                Gouvernance & Décisions
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white italic uppercase leading-none">
                Assemblées <span className="text-indigo-500">Générales</span>
              </h1>
              <p className="text-slate-400 font-bold max-w-xl">
                Pilotez la vie démocratique de votre copropriété : planification, convocations et votes en temps réel.
              </p>
            </div>
            <div className="flex gap-3">
              <AddAgModal />
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            <StatCard label="Prochaines" value={agAVenir} icon={CalendarDays} color="indigo" />
            <StatCard label="Terminées" value={agPassees} icon={CheckCircle2} color="emerald" />
            <StatCard label="Présence" value="74%" icon={Users} color="blue" />
            <StatCard label="Décisions" value="12" icon={FileText} color="amber" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 -mt-10 relative z-20 space-y-8">
        
        {/* CONTROLS */}
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Rechercher une AG..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 bg-slate-50 dark:bg-white/5 border-none rounded-2xl font-bold text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex bg-slate-50 dark:bg-white/5 p-1.5 rounded-2xl w-full lg:w-auto">
            <FilterButton active={selectedFilter === 'prochaines'} label="À venir" onClick={() => setSelectedFilter('prochaines')} />
            <FilterButton active={selectedFilter === 'passees'} label="Historique" onClick={() => setSelectedFilter('passees')} />
            <FilterButton active={selectedFilter === 'tous'} label="Tout" onClick={() => setSelectedFilter('tous')} />
          </div>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-600" /></div>
        ) : filteredAGs.length === 0 ? (
          <div className="py-32 text-center bg-white dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
            <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Aucune assemblée trouvée</h3>
            <p className="text-slate-500 font-bold mt-2">Essayez de modifier vos filtres ou créez-en une nouvelle.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assemblée & Lieu</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date & Timing</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Résolutions</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filteredAGs.map((ag) => (
                    <AGRow key={ag.id} ag={ag} router={router} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
              {filteredAGs.map((ag) => (
                <AGCard key={ag.id} ag={ag} router={router} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  };
  return (
    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 space-y-2">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function FilterButton({ active, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        active ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    terminee: { label: 'Terminée', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
    en_cours: { label: 'En séance', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: PlayCircle },
    convoquee: { label: 'Convoquée', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Clock },
    brouillon: { label: 'Brouillon', bg: 'bg-slate-50 dark:bg-white/5', text: 'text-slate-500 dark:text-slate-400', icon: FileText },
  };
  const config = configs[status] || configs.brouillon;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" /> {config.label}
    </span>
  );
}

function AGRow({ ag, router }: any) {
  const daysUntil = differenceInDays(new Date(ag.date_tenue), new Date());
  return (
    <tr 
      onClick={() => router.push(`/dashboard/ag/${ag.id}`)}
      className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer"
    >
      <td className="px-8 py-6">
        <div className="space-y-1">
          <p className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase italic tracking-tight">{ag.titre}</p>
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <MapPin className="h-3.5 w-3.5" /> {ag.lieu || 'Non défini'}
          </p>
        </div>
      </td>
      <td className="px-8 py-6">
        <div className="space-y-1">
          <p className="font-black text-slate-700 dark:text-slate-300 text-sm">{format(new Date(ag.date_tenue), 'dd MMMM yyyy', { locale: fr })}</p>
          {daysUntil > 0 && ag.statut !== 'terminee' ? (
            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Dans {daysUntil} jours</p>
          ) : (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{format(new Date(ag.date_tenue), 'HH:mm')}</p>
          )}
        </div>
      </td>
      <td className="px-8 py-6 text-center">
        <Badge variant="outline" className="rounded-lg font-black border-slate-200 dark:border-white/10 text-slate-500">{ag.resolutions?.[0]?.count || 0}</Badge>
      </td>
      <td className="px-8 py-6">
        <StatusBadge status={ag.statut} />
      </td>
      <td className="px-8 py-6 text-right">
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </td>
    </tr>
  );
}

function AGCard({ ag, router }: any) {
  const daysUntil = differenceInDays(new Date(ag.date_tenue), new Date());
  return (
    <div 
      onClick={() => router.push(`/dashboard/ag/${ag.id}`)}
      className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6"
    >
      <div className="flex justify-between items-start">
        <StatusBadge status={ag.statut} />
        {daysUntil > 0 && ag.statut !== 'terminee' && (
          <Badge className="bg-indigo-600 text-white border-none rounded-lg font-black text-[10px]">J-{daysUntil}</Badge>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic leading-tight tracking-tighter">{ag.titre}</h3>
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-indigo-500" /> {ag.lieu || 'Non défini'}
        </p>
      </div>
      <div className="pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date de session</p>
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">
            {format(new Date(ag.date_tenue), 'dd MMM yyyy', { locale: fr })} à {format(new Date(ag.date_tenue), 'HH:mm')}
          </p>
        </div>
        <ChevronRight className="h-6 w-6 text-slate-300" />
      </div>
    </div>
  );
}