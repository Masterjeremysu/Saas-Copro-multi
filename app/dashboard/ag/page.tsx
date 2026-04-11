'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Search, Users, CalendarDays, FileText, 
  CheckCircle2, Clock, MapPin, Plus, Loader2, PlayCircle, FileSignature
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import { AddAgModal } from './add-ag-modal'; 

export default function AssembleesPage() {
  const [assemblees, setAssemblees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();
  const supabase = createClient();

  const fetchAGs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assemblees')
      .select('*, resolutions(count)')
      .order('date_tenue', { ascending: true }); // Les prochaines en premier

    if (error) toast.error("Erreur de chargement des AG");
    else setAssemblees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAGs(); }, []);

  const filteredAGs = assemblees.filter(ag => 
    ag.titre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPIs
  const agAVenir = assemblees.filter(ag => new Date(ag.date_tenue) > new Date()).length;
  const agPassees = assemblees.filter(ag => new Date(ag.date_tenue) <= new Date() && ag.statut === 'terminee').length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 md:p-10 space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Assemblées Générales</h1>
          <p className="text-sm text-slate-500 mt-1">Planification, convocations et ordres du jour.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-3">
          <AddAgModal />
        </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Prochaines AG</p>
          <div>
            <p className="text-3xl font-bold text-indigo-700">{agAVenir}</p>
            <p className="text-xs text-indigo-600/70 mt-1">À préparer ou convoquer</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">AG Terminées</p>
          <div>
            <p className="text-3xl font-bold text-slate-900">{agPassees}</p>
            <p className="text-xs text-slate-500 mt-1">Historique des sessions</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux de présence (Moyen)</p>
          <div>
            <p className="text-3xl font-bold text-slate-900">74%</p>
            <p className="text-xs text-slate-500 mt-1">Sur la dernière année</p>
          </div>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher une assemblée..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white border-slate-200 rounded-lg shadow-sm focus-visible:ring-slate-300" 
          />
        </div>
      </div>

      {/* TABLEAU DES AG */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Titre & Lieu</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date prévue</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ordre du jour</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" /></td></tr>
              ) : filteredAGs.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-500">Aucune Assemblée Générale trouvée.</td></tr>
              ) : filteredAGs.map((ag) => {
                
                const daysUntil = differenceInDays(new Date(ag.date_tenue), new Date());
                
                let statusBadge;
                if (ag.statut === 'terminee') statusBadge = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Terminée</span>;
                else if (ag.statut === 'en_cours') statusBadge = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700"><PlayCircle className="h-3 w-3" /> En cours</span>;
                else if (ag.statut === 'convoquee') statusBadge = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700"><Clock className="h-3 w-3" /> Convoquée</span>;
                else statusBadge = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600"><FileText className="h-3 w-3" /> Brouillon</span>;

                return (
                  <tr 
                    key={ag.id} 
                    onClick={() => router.push(`/dashboard/ag/${ag.id}`)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{ag.titre}</p>
                      <span className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" /> {ag.lieu || 'Non défini'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-900">{format(new Date(ag.date_tenue), 'dd MMMM yyyy', { locale: fr })}</p>
                      {daysUntil > 0 && ag.statut !== 'terminee' && (
                        <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-widest">Dans {daysUntil} jours</p>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-700">{ag.resolutions?.[0]?.count || 0} Résolution(s)</p>
                    </td>

                    <td className="px-6 py-4 align-top">
                      {statusBadge}
                    </td>

                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        {ag.statut === 'brouillon' && (
                          <Button 
                            onClick={(e) => e.stopPropagation()} 
                            variant="outline" size="sm" 
                            className="h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm"
                          >
                            Générer Convocations
                          </Button>
                        )}
                        {ag.statut === 'convoquee' && (
                          <Button 
                            onClick={(e) => e.stopPropagation()} 
                            variant="outline" size="sm" 
                            className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm"
                          >
                            Ouvrir la séance
                          </Button>
                        )}
                        {ag.statut === 'terminee' && (
                          <Button 
                            onClick={(e) => e.stopPropagation()} 
                            variant="outline" size="sm" 
                            className="h-8 text-slate-600 border-slate-200 hover:bg-slate-100 shadow-sm"
                          >
                            <FileSignature className="h-4 w-4 mr-1.5" /> PV de l'AG
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}