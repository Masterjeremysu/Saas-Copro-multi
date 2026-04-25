'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { 
  Plus, AlertCircle, 
  CheckCircle2, Clock, 
  Loader2, GripVertical, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  specialite?: string;
  copropriete_id?: string;
}

interface Ticket {
  id: string;
  titre: string;
  description: string;
  statut: string;
  urgence: string;
  created_at: string;
  copropriete_id?: string;
  date_limite_sla?: string;
  date_intervention?: string;
  intervenant_id?: string;
  statut_devis?: string;
  auteur?: { prenom: string; nom: string; role: string };
}

// Les colonnes de notre Kanban
const COLUMNS = [
  { id: 'ouvert', label: 'Nouveaux', icon: <AlertCircle className="h-4 w-4 text-rose-500" />, bgColor: 'bg-rose-50' },
  { id: 'en cours', label: 'En traitement', icon: <Clock className="h-4 w-4 text-amber-500" />, bgColor: 'bg-amber-50' },
  { id: 'résolu', label: 'Résolus', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, bgColor: 'bg-emerald-50' }
];

function TicketsKanbanContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  
  // États du Drag & Drop
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // États du Modal d'ajout
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<string>('ouvert');

  // WIZARD STATE
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    categorie: '',
    sous_categorie: '',
    urgence: 'normale',
    localisation: 'parties_communes'
  });
  
  const [similarTickets, setSimilarTickets] = useState<Ticket[]>([]);

  const CATEGORIES = [
    { id: 'plomberie', label: 'Plomberie', icon: '🚿', subs: ['Fuite d\'eau', 'Plus d\'eau chaude', 'Canalisation bouchée', 'Radiateur'] },
    { id: 'electricite', label: 'Électricité', icon: '⚡️', subs: ['Panne totale', 'Lumière commune', 'Prise / Interrupteur', 'Interphone'] },
    { id: 'ascenseur', label: 'Ascenseur', icon: '🛗', subs: ['En panne', 'Bruit anormal', 'Porte bloquée', 'Bouton HS'] },
    { id: 'nettoyage', label: 'Nettoyage', icon: '🧹', subs: ['Poubelles', 'Hall / Escaliers', 'Encombrants', 'Vitre cassée'] },
    { id: 'securite', label: 'Sécurité', icon: '🛡️', subs: ['Porte parking', 'Vigik / Badge', 'Serrure forcée', 'Caméra'] },
  ];

  // LOGIQUE INTELLIGENTE : DETECTION DE DOUBLONS & PREDICTION
  useEffect(() => {
    if (formData.titre.length > 4) {
      const keywords = formData.titre.toLowerCase().split(' ').filter(w => w.length > 3);
      
      // 1. Détection de doublons
      const matches = tickets.filter(t => 
        t.statut !== 'résolu' && 
        keywords.some(k => t.titre.toLowerCase().includes(k))
      );
      setSimilarTickets(matches);

      // 2. Prédiction de catégorie
      const catMap: Record<string, string> = {
        'fuite': 'plomberie', 'eau': 'plomberie', 'robinet': 'plomberie',
        'panne': 'electricite', 'lumiere': 'electricite', 'courant': 'electricite',
        'ascenseur': 'ascenseur', 'etage': 'ascenseur',
        'propre': 'nettoyage', 'sale': 'nettoyage', 'poubelle': 'nettoyage',
        'porte': 'securite', 'badge': 'securite', 'serrure': 'securite'
      };
      
      const foundCat = Object.keys(catMap).find(k => formData.titre.toLowerCase().includes(k));
      if (foundCat && !formData.categorie) {
        setFormData(prev => ({ ...prev, categorie: catMap[foundCat] }));
        toast.info(`Catégorie détectée : ${catMap[foundCat]}`, { duration: 2000 });
      }
    } else {
      setSimilarTickets([]);
    }
  }, [formData.titre, tickets, formData.categorie]);

  const supabase = createClient();

  const loadTickets = async () => {
    setIsLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    let profile = null;
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      profile = data;
      setUserProfile(profile);
    }

    let query = supabase
      .from('tickets')
      .select('*, auteur:profiles!tickets_auteur_id_fkey(prenom, nom, role)')
      .order('created_at', { ascending: false });

    if (profile?.role === 'artisan' && profile?.specialite) {
      query = query.or(`categorie.eq.${profile.specialite},intervenant_id.eq.${user?.id}`);
    }
    
    const { data } = await query;
    if (data) setTickets(data);
    setIsLoading(false);
  };

  useEffect(() => { 
    loadTickets(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // LOGIQUE DE FILTRAGE PAR URL
  const filteredTickets = tickets.filter(t => {
    if (!filter) return true;
    if (filter === 'urgent') return t.urgence === 'critique' && t.statut !== 'résolu';
    if (filter === 'quotes') return t.statut_devis === 'soumis' || t.statut_devis === 'aucun';
    if (filter === 'active') return t.statut === 'en cours';
    if (filter === 'resolved') return t.statut === 'résolu';
    return true;
  });

  // --- LOGIQUE METIER : CRÉATION D'UN TICKET (WIZARD) ---
  const handleFinalSubmit = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      const dateLimite = new Date();
      if (formData.urgence === 'critique') {
        dateLimite.setHours(dateLimite.getHours() + 4);
      } else if (formData.urgence === 'normale') {
        dateLimite.setDate(dateLimite.getDate() + 2);
      } else {
        dateLimite.setDate(dateLimite.getDate() + 7);
      }

      const { error } = await supabase.from('tickets').insert({
        copropriete_id: profile?.copropriete_id,
        auteur_id: user?.id,
        titre: formData.titre,
        description: `${formData.localisation === 'appartement' ? '[Privatif] ' : '[Commun] '} ${formData.description}`,
        categorie: formData.categorie,
        urgence: formData.urgence,
        statut: 'ouvert',
        statut_devis: 'aucun',
        date_limite_sla: dateLimite.toISOString()
      });

      if (error) throw error;

      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            copropriete_id: profile?.copropriete_id,
            categorie: formData.categorie,
            titre: formData.titre,
            urgence: formData.urgence
          })
        });
      } catch (e) { console.error(e); }

      setWizardStep(4);
      loadTickets();
    } catch (err) {
      console.error(err);
      toast.error("Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetWizard = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        setWizardStep(1);
        setFormData({ titre: '', description: '', categorie: '', sous_categorie: '', urgence: 'normale', localisation: 'parties_communes' });
      }, 300);
    }
  };

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicketId(ticketId);
    setTimeout(() => { (e.target as HTMLElement).style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedTicketId(null);
    setActiveColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setActiveColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setActiveColumn(null);

    if (!draggedTicketId) return;

    const ticketToMove = tickets.find(t => t.id === draggedTicketId);
    if (!ticketToMove || ticketToMove.statut === newStatus) return;

    const previousStatus = ticketToMove.statut;
    const previousIntervenant = ticketToMove.intervenant_id;
    
    const updateData: Partial<Ticket> = { statut: newStatus };
    
    if (userProfile?.role === 'artisan' && newStatus !== 'ouvert') {
      updateData.intervenant_id = userProfile.id;
    }

    setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, statut: newStatus, intervenant_id: updateData.intervenant_id || t.intervenant_id } : t));

    const { error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', draggedTicketId);

    if (error) {
      setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, statut: previousStatus, intervenant_id: previousIntervenant } : t));
      toast.error("Erreur de synchronisation !");
    } else {
      toast.success(`Ticket passé en : ${newStatus}`);
    }
  };

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* TACTICAL HERO - MISSION CONTROL STYLE */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="space-y-6 text-center lg:text-left flex-1">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10"
            >
               <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#fb7185]"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Command Center Live</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic pr-4"
            >
               Signalements <br className="hidden lg:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Tactiques</span>
            </motion.h1>
            
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 font-medium text-sm lg:text-xl max-w-xl leading-relaxed mx-auto lg:mx-0"
              >
                 Suivez et gérez les interventions de votre résidence avec une précision chirurgicale.
              </motion.p>
              
              {filter && (
                <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5" /> Filtre Actif : {filter}
                  <Link href="/dashboard/tickets" className="ml-2 hover:text-white transition-colors">✕</Link>
                </Badge>
              )}
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
             <div className="h-32 w-32 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nouveaux</p>
                <p className="text-xl font-black">{tickets.filter(t => t.statut === 'ouvert').length}</p>
             </div>
             <div className="h-32 w-32 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                <Clock className="h-8 w-8 text-amber-400 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">En cours</p>
                <p className="text-xl font-black">{tickets.filter(t => t.statut === 'en cours').length}</p>
             </div>
             <div className="h-32 w-32 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Résolus</p>
                <p className="text-xl font-black">{tickets.filter(t => t.statut === 'résolu').length}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center md:justify-end px-2 lg:px-0">
        <Dialog open={isDialogOpen} onOpenChange={resetWizard}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-14 px-10 font-black shadow-xl shadow-indigo-600/20 text-white group">
              <Plus className="mr-2 h-6 w-6 group-hover:rotate-90 transition-transform duration-500" /> 
              DÉCLARER UN INCIDENT
            </Button>
          </DialogTrigger>
          
          <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 sm:max-w-[550px] overflow-hidden bg-white dark:bg-slate-900">
            <div className="relative">
              {/* HEADER WIZARD */}
              <div className="bg-slate-900 dark:bg-black p-8 text-white">
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-1.5">
                       {[1, 2, 3].map(s => (
                         <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${wizardStep >= s ? 'bg-indigo-500' : 'bg-white/10'}`} />
                       ))}
                    </div>
                    {wizardStep < 4 && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Étape {wizardStep}/3</span>}
                 </div>
                 <DialogTitle className="text-3xl font-black tracking-tighter">
                    {wizardStep === 1 ? "Quel est le souci ?" : 
                     wizardStep === 2 ? "Dites-nous en plus" : 
                     wizardStep === 3 ? "Localisation & Impact" : "C'est envoyé !"}
                 </DialogTitle>
                 <DialogDescription className="text-slate-400 text-xs font-medium mt-1">
                    {wizardStep === 1 ? "Sélectionnez la catégorie du problème." : 
                     wizardStep === 2 ? "Décrivez précisément l'incident." : 
                     wizardStep === 3 ? "Derniers détails pour l'intervention." : "Votre syndic a été notifié en temps réel."}
                 </DialogDescription>
              </div>

              {/* STEP 1 : CATEGORY GRID & SUBS */}
              {wizardStep === 1 && (
                <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="grid grid-cols-2 gap-4">
                      {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setFormData({...formData, categorie: cat.id, sous_categorie: ''}); }}
                            className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all group ${formData.categorie === cat.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-[1.02]' : 'border-slate-50 dark:border-white/5 hover:border-indigo-500'}`}
                        >
                            <div className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{cat.label}</span>
                        </button>
                      ))}
                   </div>

                   {formData.categorie && (
                     <div className="space-y-4 pt-4 animate-in fade-in zoom-in-95 duration-300">
                        <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Précisez la nature du problème</Label>
                        <div className="flex flex-wrap gap-2">
                           {CATEGORIES.find(c => c.id === formData.categorie)?.subs.map(sub => (
                             <button
                                key={sub}
                                onClick={() => { setFormData({...formData, sous_categorie: sub}); setWizardStep(2); }}
                                className={`px-4 py-2 rounded-full border-2 text-[10px] font-black uppercase tracking-widest transition-all ${formData.sous_categorie === sub ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-slate-100 dark:border-white/5 text-slate-500 hover:border-indigo-500'}`}
                             >
                                {sub}
                             </button>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              )}

              {/* STEP 2 : DESCRIPTION & SMART DIAGNOSTIC */}
              {wizardStep === 2 && (
                <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div className="p-5 bg-indigo-900/10 dark:bg-indigo-900/30 rounded-3xl border border-indigo-500/20">
                      <div className="flex items-center gap-3 mb-3">
                         <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">
                            {CATEGORIES.find(c => c.id === formData.categorie)?.icon}
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{formData.categorie}</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{formData.sous_categorie}</p>
                         </div>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium leading-relaxed italic">
                         {formData.categorie === 'plomberie' ? "💧 En cas de fuite majeure, fermez immédiatement la vanne d'arrêt située sur le palier ou sous votre évier." :
                          formData.categorie === 'ascenseur' ? "🚨 Si une personne est bloquée à l'intérieur, utilisez le bouton d'appel d'urgence dans la cabine." :
                          "💡 Prenez une photo claire du problème si possible pour aider l'artisan."}
                      </p>
                   </div>

                   {similarTickets.length > 0 && (
                     <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                           <AlertCircle className="h-4 w-4 text-amber-600" />
                           <p className="text-[10px] font-black text-amber-600 uppercase">Problème déjà connu ?</p>
                        </div>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Un incident similaire est déjà en cours : <span className="font-bold">&quot;{similarTickets[0].titre}&quot;</span>.</p>
                     </div>
                   )}

                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sujet du signalement</Label>
                      <Input 
                        placeholder="Ex: Fuite d'eau sous l'évier" 
                        value={formData.titre}
                        onChange={(e) => setFormData({...formData, titre: e.target.value})}
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold text-sm"
                      />
                   </div>

                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description de l&apos;intervention</Label>
                      <Textarea 
                        placeholder="Ex: Le robinet fuit goutte à goutte même fermé..." 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="min-h-[120px] rounded-[2rem] bg-slate-50 dark:bg-white/5 border-none font-medium text-sm resize-none p-6"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-4">
                      <Button variant="outline" onClick={() => setWizardStep(1)} className="h-14 rounded-2xl border-slate-100 dark:border-white/10 font-black text-xs">RETOUR</Button>
                      <Button 
                        disabled={!formData.description || !formData.titre} 
                        onClick={() => setWizardStep(3)} 
                        className="h-14 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-black text-xs"
                      >
                        DIAGNOSTIC IMPACT
                      </Button>
                   </div>
                </div>
              )}

              {/* STEP 3 : LOCATION & IMPACT SCORING */}
              {wizardStep === 3 && (
                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Où se situe le problème ?</Label>
                      <div className="grid grid-cols-2 gap-3">
                         {[
                           { id: 'parties_communes', label: 'Parties Communes', icon: '🏢' },
                           { id: 'appartement', label: 'Mon Appartement', icon: '🏠' }
                         ].map(loc => (
                           <button
                               key={loc.id}
                               onClick={() => setFormData({...formData, localisation: loc.id})}
                               className={`py-6 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${formData.localisation === loc.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-50 dark:border-white/5 text-slate-400'}`}
                           >
                               <span className="text-xl">{loc.icon}</span>
                               <span className="text-[10px] font-black uppercase tracking-widest">{loc.label}</span>
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Impact sur la copropriété</Label>
                      <div className="space-y-3">
                         {[
                           { id: 'critique', label: 'Urgence Vitale / Danger Immédiat', desc: 'Risque corporel, feu, inondation majeure.', icon: '🚨' },
                           { id: 'normale', label: 'Confort Entravé', desc: 'Ascenseur en panne, plus d\'eau chaude, porte bloquée.', icon: '⚠️' },
                           { id: 'basse', label: 'Esthétique / Information', desc: 'Propreté, ampoule grillée, signalétique.', icon: '📝' }
                         ].map(u => (
                           <button
                               key={u.id}
                               onClick={() => setFormData({...formData, urgence: u.id})}
                               className={`w-full p-5 rounded-3xl border-2 flex items-center justify-between transition-all ${formData.urgence === u.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-xl' : 'border-slate-50 dark:border-white/5'}`}
                           >
                               <div className="flex items-center gap-4">
                                  <span className="text-xl">{u.icon}</span>
                                  <div className="text-left">
                                     <p className={`text-[10px] font-black uppercase ${formData.urgence === u.id ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>{u.label}</p>
                                     <p className="text-[9px] text-slate-400 font-medium">{u.desc}</p>
                                  </div>
                               </div>
                               {formData.urgence === u.id && <div className="h-3 w-3 rounded-full bg-indigo-600" />}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-4">
                      <Button variant="outline" onClick={() => setWizardStep(2)} className="h-14 rounded-2xl border-slate-100 dark:border-white/10 font-black text-xs">RETOUR</Button>
                      <Button 
                        disabled={isSaving} 
                        onClick={handleFinalSubmit} 
                        className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xl shadow-indigo-600/20"
                      >
                        {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : "CRÉER L'INTERVENTION"}
                      </Button>
                   </div>
                </div>
              )}

              {/* SUCCESS STATE */}
              {wizardStep === 4 && (
                <div className="p-12 text-center space-y-6 animate-in zoom-in duration-500">
                   <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-xl shadow-emerald-500/20">
                      ✅
                   </div>
                   <div>
                      <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Signalement Envoyé !</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                         Le syndic et les prestataires concernés ont reçu votre alerte. Vous pouvez suivre l&apos;avancement en temps réel sur votre dashboard.
                      </p>
                   </div>
                   <Button onClick={() => resetWizard(false)} className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-black">
                      RETOUR AU KANBAN
                   </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* FLOATING ACTION BUTTON (MOBILE) */}
      <Button 
        onClick={() => setIsDialogOpen(true)}
        className="md:hidden fixed bottom-28 right-6 h-16 w-16 rounded-full bg-indigo-600 shadow-2xl shadow-indigo-600/40 text-white z-[60] flex items-center justify-center p-0"
      >
        <Plus className="h-8 w-8" />
      </Button>

      {/* BANDEAU D'ALERTE PERSISTANT (ARTISANS UNIQUEMENT) */}
      {userProfile?.role === 'artisan' && tickets.some(t => t.statut === 'ouvert' && !t.date_intervention && (!t.statut_devis || t.statut_devis === 'aucun')) && (
        <div className="bg-rose-600 rounded-[2rem] lg:rounded-3xl p-5 lg:p-6 shadow-xl shadow-rose-600/20 flex flex-col md:flex-row items-center justify-between gap-4 lg:gap-6 relative overflow-hidden shrink-0 animate-in fade-in slide-in-from-top-4 mx-2 lg:mx-0">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
            <AlertCircle className="w-32 lg:w-48 h-32 lg:h-48" />
          </div>
          <div className="flex items-center gap-4 relative z-10 w-full">
            <div className="h-12 w-12 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 lg:h-8 lg:w-8 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg lg:text-xl font-black text-white tracking-tighter">Action Requise</h2>
              <p className="text-rose-100 text-[10px] lg:text-sm font-medium mt-0.5">Vous devez assigner une date aux nouveaux signalements.</p>
            </div>
          </div>
        </div>
      )}

      {/* TABS MOBILE (Glassmorphism) */}
      <div className="md:hidden flex gap-2 overflow-x-auto p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl no-scrollbar shrink-0 mx-2">
        {COLUMNS.map(col => (
          <button
            key={`tab-${col.id}`}
            onClick={() => setMobileActiveTab(col.id)}
            className={`flex-1 min-w-[100px] py-3 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              mobileActiveTab === col.id 
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              {col.label}
              <Badge className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white text-[8px] h-4 min-w-[16px] px-1">{filteredTickets.filter(t => t.statut === col.id).length}</Badge>
            </div>
          </button>
        ))}
      </div>

      {/* LE BOARD KANBAN / LISTE */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>
      ) : (
        <div className="flex-1 flex flex-col md:grid md:grid-cols-3 gap-6 overflow-hidden pb-4 px-2 lg:px-0">
          
          {COLUMNS.map((column) => {
            const columnTickets = filteredTickets.filter(t => t.statut === column.id);
            const isHiddenOnMobile = mobileActiveTab !== column.id ? 'hidden md:flex' : 'flex';

            return (
              <div 
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`${isHiddenOnMobile} flex-col w-full h-full bg-slate-100/40 dark:bg-white/[0.02] rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden transition-colors border-2 ${
                  activeColumn === column.id ? 'border-indigo-400 bg-indigo-50/50' : 'border-transparent'
                }`}
              >
                {/* Header de la Colonne (Desktop only or list start) */}
                <div className="p-6 pb-4 hidden md:flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${column.bgColor} dark:bg-white/5`}>
                      {column.icon}
                    </div>
                    <h2 className="font-black text-slate-900 dark:text-white tracking-tight uppercase text-sm">{column.label}</h2>
                  </div>
                  <Badge className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border-none font-black">{columnTickets.length}</Badge>
                </div>

                {/* Zone des cartes (scrollable) */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4 custom-scrollbar">
                  {columnTickets.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs lg:text-sm italic p-10 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl mx-2 mt-4">
                      {column.id === 'ouvert' ? 'Aucun nouveau ticket' : 'Aucun ticket ici'}
                    </div>
                  ) : (
                    columnTickets.map((ticket) => (
                      <Link 
                        key={ticket.id}
                        href={`/dashboard/tickets/${ticket.id}`}
                        className="block bg-white dark:bg-slate-900 p-5 rounded-2xl lg:rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-white/5 cursor-pointer hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2 flex-wrap">
                            <Badge className={`${
                              ticket.urgence === 'critique' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' : 
                              ticket.urgence === 'normale' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-400'
                            } border-none uppercase text-[8px] font-black tracking-widest`}>
                              {ticket.urgence}
                            </Badge>
                            {ticket.date_limite_sla && ticket.statut !== 'résolu' && (
                              <Badge className={`border-none uppercase text-[8px] font-black tracking-widest ${
                                new Date() > new Date(ticket.date_limite_sla) ? 'bg-rose-600 text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                              }`}>
                                {new Date() > new Date(ticket.date_limite_sla) ? 'RETARD' : 'DÉLAI OK'}
                              </Badge>
                            )}
                          </div>
                          <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                        </div>
                        
                        <h3 className="font-black text-slate-900 dark:text-white mb-2 leading-tight text-sm lg:text-base line-clamp-2">{ticket.titre}</h3>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-white/5">
                          <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-white/10 flex items-center justify-center text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                                {ticket.auteur?.prenom?.charAt(0) || 'U'}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">
                                {ticket.auteur?.prenom} {ticket.auteur?.nom}
                              </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>

                        {ticket.intervenant_id && (
                          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-white/5 flex items-center gap-2 text-[9px] font-black text-indigo-500 uppercase tracking-[0.15em]">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                            Intervention planifiée
                          </div>
                        )}
                        
                        {ticket.statut_devis && ticket.statut_devis !== 'aucun' && (
                          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Devis</span>
                            <Badge variant="outline" className={`${
                              ticket.statut_devis === 'valide' ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' :
                              ticket.statut_devis === 'refuse' ? 'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20' : 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20'
                            } text-[8px] uppercase font-black border-none px-2`}>
                              {ticket.statut_devis}
                            </Badge>
                          </div>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}

export default function TicketsKanbanPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse text-indigo-600 font-black tracking-widest italic">Chargement du Kanban...</div>}>
      <TicketsKanbanContent />
    </Suspense>
  );
}