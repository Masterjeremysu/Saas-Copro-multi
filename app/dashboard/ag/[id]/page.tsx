'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, CalendarDays, MapPin,
  FileText, Loader2,
  Scale, Trash2, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { AddResolutionModal } from './add-resolution-modal';

interface Assemblee {
  id: string;
  titre: string;
  statut: string;
  date_tenue: string;
  lieu?: string | null;
}

interface Resolution {
  id: string;
  numero_ordre: number;
  titre: string;
  description?: string | null;
  type_majorite: string;
  montant_alloue?: number | null;
}

export default function AssembleeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ag, setAg] = useState<Assemblee | null>(null);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchAGDetails = useCallback(async () => {
    setLoading(true);
    
    // 1. Charger l'AG
    const { data: agData, error: agError } = await supabase
      .from('assemblees')
      .select('*')
      .eq('id', params.id)
      .single();

    if (agError) {
      toast.error("Assemblée introuvable");
      router.push('/dashboard/ag');
      return;
    }
    setAg(agData);

    // 2. Charger les résolutions (Ordre du jour)
    const { data: resData } = await supabase
      .from('resolutions')
      .select('*')
      .eq('assemblee_id', params.id)
      .order('numero_ordre', { ascending: true });

    setResolutions(resData || []);
    setLoading(false);
  }, [params.id, router, supabase]);

  useEffect(() => { fetchAGDetails(); }, [fetchAGDetails]);

  const handleDeleteResolution = async (id: string, titre: string) => {
    if (!window.confirm(`Supprimer la résolution : "${titre}" ?`)) return;
    
    const tid = toast.loading("Suppression...");
    try {
      const { error } = await supabase.from('resolutions').delete().eq('id', id);
      if (error) throw error;
      toast.success("Résolution retirée de l'ordre du jour", { id: tid });
      fetchAGDetails();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(message, { id: tid });
    }
  };

  const getMajoriteBadge = (type: string) => {
    switch (type) {
      case 'art_24': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Art. 24 (Majorité simple)</Badge>;
      case 'art_25': return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Art. 25 (Majorité absolue)</Badge>;
      case 'art_26': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Art. 26 (Double majorité)</Badge>;
      case 'unanimite': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Unanimité</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 md:p-10 space-y-8 font-sans">
      
      {/* HEADER NAVIGATION */}
      <button 
        onClick={() => router.push('/dashboard/ag')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux Assemblées
      </button>

      {/* AG INFO BANNER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-slate-100 text-slate-600 uppercase tracking-widest text-[10px] font-black">
                {ag.statut.replace('_', ' ')}
              </Badge>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AG Ordinaire</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{ag.titre}</h1>
            
            <div className="flex flex-wrap items-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                {format(new Date(ag.date_tenue), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <MapPin className="h-4 w-4 text-indigo-500" />
                {ag.lieu || 'Lieu à définir'}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="h-11 border-slate-200 font-bold text-slate-700">
              Générer Convocation (PDF)
            </Button>
            <Button className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Ouvrir la Séance
            </Button>
          </div>
        </div>
      </div>

      {/* ORDRE DU JOUR (RÉSOLUTIONS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Ordre du Jour
            </h2>
            <p className="text-sm text-slate-500 mt-1">Gérez les résolutions qui seront soumises au vote.</p>
          </div>
          <AddResolutionModal assembleeId={params.id as string} nextNumero={resolutions.length + 1} onRefresh={fetchAGDetails} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {resolutions.length === 0 ? (
            <div className="p-16 text-center">
              <Scale className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900">L&apos;ordre du jour est vide</p>
              <p className="text-sm text-slate-500 mt-1">Ajoutez la première résolution pour commencer.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {resolutions.map((res) => (
                <div key={res.id} className="p-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors group">
                  <div className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  
                  <div className="h-8 w-8 shrink-0 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center font-black text-sm">
                    {res.numero_ordre}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{res.titre}</h3>
                      <div className="flex items-center gap-3 shrink-0">
                        {getMajoriteBadge(res.type_majorite)}
                        <Button 
                          onClick={() => handleDeleteResolution(res.id, res.titre)}
                          variant="ghost" size="icon" 
                          className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {res.description && (
                      <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                        {res.description}
                      </p>
                    )}
                    
                    {res.montant_alloue && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700 mt-2">
                        Budget alloué : {Number(res.montant_alloue).toLocaleString('fr-FR')} €
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
