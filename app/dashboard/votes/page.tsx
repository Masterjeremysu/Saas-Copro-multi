'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Vote, Plus, Loader2, PieChart,
  Filter, Calendar, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, 
  DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';
import { DecisionCard, Consultation } from '@/components/decisions/decision-card';
import { AvailabilityPicker } from '@/components/decisions/availability-picker';
import { notifyCopropriete } from '@/utils/notification-service';

interface Slot {
  date: string;
  time: string;
}

export default function VotesPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Creation Wizard State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'poll' as Consultation['type'],
    title: '',
    description: '',
    closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_anonymous: false,
    allow_multiple: false,
    quorum_percentage: 50,
    options: ['', ''],
    availability_slots: [] as Slot[]
  });

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { data: sondagesData } = await supabase
      .from('sondages')
      .select(`
        *,
        options:sondage_options(*),
        votes:sondage_votes(*)
      `)
      .order('created_at', { ascending: false });

    if (sondagesData) {
      interface RawSondage {
        id: string;
        type: string;
        titre: string;
        description: string | null;
        date_fin: string;
        is_anonymous: boolean;
        allow_multiple: boolean;
        quorum_percentage: number;
        created_at: string;
        options: { id: string; texte: string }[];
        votes: { id: string; option_id: string; user_id: string }[];
      }

      const mapped: Consultation[] = (sondagesData as unknown as RawSondage[]).map(s => {
        const totalVotes = s.votes?.length || 0;
        const totalEligible = 100; 
        return {
          id: s.id,
          type: (s.type as Consultation['type']) || 'poll',
          title: s.titre,
          description: s.description || '',
          closing_date: s.date_fin,
          is_anonymous: s.is_anonymous || false,
          allow_multiple: s.allow_multiple || false,
          quorum_percentage: s.quorum_percentage || 50,
          status: (new Date(s.date_fin) < new Date() ? 'closed' : 'active') as 'draft' | 'active' | 'closed',
          created_at: s.created_at,
          options: s.options.map((o) => ({
            id: o.id,
            label: o.texte,
            votes_count: s.votes?.filter((v) => v.option_id === o.id).length || 0
          })),
          total_participants: totalVotes,
          current_participation: Math.round((totalVotes / totalEligible) * 100)
        };
      });
      setConsultations(mapped);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNextStep = () => {
    if (wizardStep === 1 && !formData.type) return;
    if (wizardStep === 2 && (formData.type !== 'availability' && (!formData.title || formData.options.filter(o => o.trim()).length < 2))) {
      toast.error("Veuillez remplir le titre et au moins 2 options.");
      return;
    }
    setWizardStep(prev => prev + 1);
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      const { data: newSondage, error: err } = await supabase.from('sondages').insert({
        copropriete_id: profile?.copropriete_id,
        createur_id: user?.id,
        titre: formData.title,
        description: formData.description,
        date_fin: formData.closing_date,
        type: formData.type,
        quorum_percentage: formData.quorum_percentage,
        is_anonymous: formData.is_anonymous
      }).select().single();

      if (err) throw err;

      let optionsToInsert = [];
      if (formData.type === 'availability') {
        optionsToInsert = formData.availability_slots.map(slot => ({
          sondage_id: newSondage.id,
          texte: `${slot.date} à ${slot.time}`
        }));
      } else {
        optionsToInsert = formData.options
          .filter(opt => opt.trim() !== '')
          .map(texte => ({
            sondage_id: newSondage.id,
            texte: texte
          }));
      }

      await supabase.from('sondage_options').insert(optionsToInsert);

      // NOTIFICATION : Alerter tous les résidents
      await notifyCopropriete({
        coproprieteId: profile?.copropriete_id,
        titre: "🗳️ Nouveau Vote Publié",
        message: `La consultation "${formData.title}" est maintenant ouverte. Votre avis compte !`,
        lien: `/dashboard/votes/${newSondage.id}`,
        type: 'vote'
      });

      toast.success("Consultation publiée !");
      setIsDialogOpen(false);
      resetWizard();
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error("Erreur : " + message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setFormData({
      type: 'poll',
      title: '',
      description: '',
      closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_anonymous: false,
      allow_multiple: false,
      quorum_percentage: 50,
      options: ['', ''],
      availability_slots: []
    });
  };

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* TACTICAL HEADER */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="space-y-6 text-center lg:text-left flex-1">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
               <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Command Center Live</span>
            </div>
            <h1 className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic">
               Centre de <br className="hidden lg:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Décision</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm lg:text-xl max-w-xl leading-relaxed mx-auto lg:mx-0">
               Gérez les résolutions officielles, sondez l&apos;opinion et planifiez l&apos;avenir de votre résidence avec précision tactique.
            </p>
          </div>
          
          <div className="flex flex-col gap-4 w-full lg:w-auto">
            <HasRole roles={['administrateur', 'syndic', 'membre_cs']}>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetWizard(); }}>
                <DialogTrigger asChild>
                  <Button 
                    className="h-16 lg:h-20 px-8 lg:px-12 bg-white text-slate-900 hover:bg-indigo-50 rounded-[1.5rem] lg:rounded-[2rem] font-black text-sm lg:text-xl shadow-xl shadow-white/5 group transition-all"
                  >
                    <Plus className="mr-3 h-5 w-5 lg:h-7 lg:w-7 group-hover:rotate-90 transition-transform duration-500" />
                    INITIER UN VOTE
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 sm:max-w-[600px] overflow-hidden bg-white dark:bg-slate-900">
                  <div className="bg-slate-900 dark:bg-black p-8 text-white">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map(s => (
                          <div key={s} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${wizardStep >= s ? 'bg-indigo-500' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Étape {wizardStep}/3</span>
                    </div>
                    <DialogTitle className="text-3xl font-black tracking-tighter">
                      {wizardStep === 1 ? "Type de Consultation" : 
                       wizardStep === 2 ? "Contenu & Options" : "Règles & Visibilité"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs font-medium mt-1">
                      {wizardStep === 1 ? "Quel est l'objectif de ce vote ?" : 
                       wizardStep === 2 ? "Définissez la question et les réponses." : "Configurez le quorum et les accès."}
                    </DialogDescription>
                  </div>

                  <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {wizardStep === 1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {[
                          { id: 'official', label: 'OFFICIEL', desc: 'Vote avec quorum', icon: <Vote className="h-6 w-6" />, color: 'indigo' },
                          { id: 'poll', label: 'SONDAGE', desc: 'Avis consultatif', icon: <BarChart3 className="h-6 w-6" />, color: 'emerald' },
                          { id: 'availability', label: 'DATES', desc: 'Disponibilités', icon: <Calendar className="h-6 w-6" />, color: 'amber' }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => { setFormData({...formData, type: type.id as Consultation['type']}); handleNextStep(); }}
                            className={`flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group ${formData.type === type.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-50 dark:border-white/5 hover:border-indigo-500'}`}
                          >
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-${type.color}-100 dark:bg-${type.color}-900/30 text-${type.color}-600 group-hover:scale-110 transition-transform`}>
                              {type.icon}
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{type.label}</p>
                              <p className="text-[9px] text-slate-400 font-medium mt-1">{type.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sujet de la consultation</Label>
                          <Input 
                            placeholder="Ex: Remplacement de l'ascenseur" 
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold text-sm"
                          />
                        </div>
                        {formData.type === 'availability' ? (
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Proposer des dates</Label>
                            <AvailabilityPicker 
                              slots={formData.availability_slots} 
                              onChange={(slots) => setFormData({...formData, availability_slots: slots})} 
                            />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Options de réponse</Label>
                            {formData.options.map((opt, i) => (
                              <Input 
                                key={i}
                                placeholder={`Option ${i+1}`}
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...formData.options];
                                  newOpts[i] = e.target.value;
                                  setFormData({...formData, options: newOpts});
                                }}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-sm"
                              />
                            ))}
                            <Button 
                              variant="ghost" 
                              onClick={() => setFormData({...formData, options: [...formData.options, '']})}
                              className="text-xs font-black uppercase tracking-widest text-indigo-600"
                            >
                              + Ajouter une option
                            </Button>
                          </div>
                        )}
                        <Button onClick={handleNextStep} className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-indigo-600 font-black text-white">CONTINUER</Button>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                         <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quorum Requis</Label>
                               <span className="text-xl font-black">{formData.quorum_percentage}%</span>
                            </div>
                            <Input 
                              type="range" min="0" max="100" step="10"
                              value={formData.quorum_percentage}
                              onChange={(e) => setFormData({...formData, quorum_percentage: parseInt(e.target.value)})}
                              className="accent-indigo-600"
                            />
                         </div>
                         <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date de clôture</Label>
                            <Input 
                              type="date"
                              value={formData.closing_date}
                              onChange={(e) => setFormData({...formData, closing_date: e.target.value})}
                              className="h-12 rounded-xl border-none font-bold"
                            />
                         </div>
                         <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div className="space-y-0.5">
                               <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Vote Anonyme</p>
                               <p className="text-[10px] text-slate-400 font-medium">Les noms des votants seront masqués</p>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={formData.is_anonymous}
                              onChange={(e) => setFormData({...formData, is_anonymous: e.target.checked})}
                              className="h-6 w-6 rounded-lg accent-indigo-600"
                            />
                         </div>
                         <Button 
                          onClick={handleCreate} 
                          disabled={isSaving}
                          className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-white shadow-xl shadow-indigo-600/20"
                         >
                            {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : "PUBLIER LA CONSULTATION"}
                         </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </HasRole>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl text-center">
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">Actifs</p>
                  <p className="text-2xl font-black">{consultations.filter(c => c.status === 'active').length}</p>
               </div>
               <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl text-center">
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">Archivés</p>
                  <p className="text-2xl font-black">{consultations.filter(c => c.status === 'closed').length}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* TACTICAL FILTERS & SEARCH */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center justify-between">
        <Tabs defaultValue="active" className="w-full lg:w-auto">
          <TabsList className="bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl h-14 border border-slate-200 dark:border-white/5 shadow-inner">
            <TabsTrigger value="active" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-600 data-[state=active]:shadow-lg">
               En cours ({consultations.filter(c => c.status === 'active').length})
            </TabsTrigger>
            <TabsTrigger value="closed" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-600 data-[state=active]:shadow-lg">
               Archives ({consultations.filter(c => c.status === 'closed').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-1 lg:max-w-md gap-3">
           <div className="relative flex-1 group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input 
                placeholder="Filtrer par titre ou contenu..." 
                className="h-14 pl-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
              />
           </div>
           <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 dark:border-white/10 p-0 hover:bg-slate-50 dark:hover:bg-white/5">
              <PieChart className="h-5 w-5 text-slate-400" />
           </Button>
        </div>
      </div>

      {/* DECISIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-10">
        {isLoading ? (
          [1,2,3].map(i => (
            <div key={i} className="h-[400px] bg-slate-50 dark:bg-white/5 rounded-[3rem] animate-pulse" />
          ))
        ) : (
          consultations.length === 0 ? (
            <div className="col-span-full py-32 text-center space-y-4">
               <div className="h-20 w-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Vote className="h-10 w-10" />
               </div>
               <div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Aucune consultation active</p>
                  <p className="text-slate-500 font-medium italic">Le silence règne sur la copropriété...</p>
               </div>
            </div>
          ) : (
            consultations.map(consultation => (
              <DecisionCard 
                key={consultation.id} 
                consultation={consultation}
                onVote={(id) => window.location.href = `/dashboard/votes/${id}`}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}