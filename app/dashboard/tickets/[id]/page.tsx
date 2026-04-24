'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  ChevronLeft, Send, CheckCircle2, User, 
  Loader2, HardHat, Camera,
  Terminal, Activity, FileCheck, Info, Clock, ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';
import Link from 'next/link';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  copropriete_id?: string;
  prestataire_id?: string;
  specialite?: string;
}

interface Comment {
  id: string;
  created_at: string;
  message: string;
  user_id: string;
  auteur: {
    prenom: string;
    nom: string;
    role: string;
  };
}

interface Prestataire {
  id: string;
  nom: string;
  specialite: string;
  note?: string;
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
  prestataire_id?: string;
  montant_devis?: number;
  statut_devis?: string;
  auteur?: { prenom: string; nom: string };
  prestataire?: { nom: string; telephone: string };
  intervenant?: { prenom: string; nom: string };
  categorie?: string;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  
  // États formulaires
  const [newMessage, setNewMessage] = useState('');
  const [selectedPrestataire, setSelectedPrestataire] = useState<string>('');
  const [dateIntervention, setDateIntervention] = useState<string>('');
  const [montantDevis, setMontantDevis] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [informerMur, setInformerMur] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingPilotage, setIsUpdatingPilotage] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'pilotage' | 'timeline' | 'docs'>('pilotage');
  
  const supabase = createClient();

  const loadTicketData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);
    }

    // 1. Charger le ticket avec l'artisan assigné
    const { data: t } = await supabase
      .from('tickets')
      .select('*, auteur:profiles!tickets_auteur_id_fkey(prenom, nom), prestataire:prestataires(nom, telephone), intervenant:profiles!tickets_intervenant_id_fkey(prenom, nom)')
      .eq('id', ticketId)
      .single();
    
    if (t) {
      setTicket(t);
      setSelectedPrestataire(t.prestataire_id || '');
      // Formatage de la date pour l'input datetime-local
      if (t.date_intervention) {
        const d = new Date(t.date_intervention);
        setDateIntervention(d.toISOString().slice(0, 16));
      }
    }

    // 2. Charger les prestataires de la copro (Pour le menu déroulant du Syndic)
    const { data: p } = await supabase.from('prestataires').select('id, nom, specialite').order('nom');
    if (p) setPrestataires(p);

    // 3. Charger le chat (Audit)
    const { data: c } = await supabase
      .from('ticket_comments')
      .select('*, auteur:profiles(prenom, nom, role)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (c) setComments(c);
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadTicketData();

    // TEMPS RÉEL : On écoute les nouveaux messages ET les mises à jour du ticket
    const channel = supabase.channel(`ticket-${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comments', filter: `ticket_id=eq.${ticketId}` }, () => loadTicketData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, () => loadTicketData())
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // --- ENVOYER UN MESSAGE ---
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('ticket_comments').insert({
      ticket_id: ticketId,
      user_id: user?.id,
      message: newMessage
    });

    setNewMessage('');
    setIsSending(false);
  };

  // --- LOGIQUE MÉTIER : LE SYNDIC MANDATE UN PRO ---
  const handleUpdatePilotage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPilotage(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Mettre à jour le ticket
      const { error } = await supabase.from('tickets').update({
        prestataire_id: selectedPrestataire || null,
        date_intervention: dateIntervention || null,
        statut: 'en cours' // On le passe en cours automatiquement
      }).eq('id', ticketId);

      if (error) throw error;

      // 2. Créer une "Notification d'Audit" dans le chat
      const artisanNom = prestataires.find(p => p.id === selectedPrestataire)?.nom || "un prestataire";
      const dateFormatee = dateIntervention ? new Date(dateIntervention).toLocaleString('fr-FR') : "une date à définir";
      
      if (informerMur) {
        await supabase.from('annonces').insert({
          titre: `📢 Intervention : ${ticket?.titre}`,
          contenu: `Une intervention est prévue pour le dossier "${ticket?.titre}". L'entreprise ${artisanNom} interviendra le ${dateFormatee}.`,
          auteur_id: user?.id,
          copropriete_id: ticket?.copropriete_id,
          prioritaire: ticket?.urgence === 'critique'
        });
      }

      toast.success("Dossier mis à jour et écosystème notifié !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur de mise à jour.");
    } finally {
      setIsUpdatingPilotage(false);
    }
  };

  // --- LOGIQUE MÉTIER : L'ARTISAN MET À JOUR ---
  const handleUpdateArtisan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPilotage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tickets').update({
        date_intervention: dateIntervention || null
      }).eq('id', ticketId);
      if (error) throw error;
      
      const dateFormatee = dateIntervention ? new Date(dateIntervention).toLocaleString('fr-FR') : "une date à définir";
      await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message: `🔄 **Mise à jour de l'artisan :** J'ai planifié l'intervention pour le ${dateFormatee}.`
      });
      toast.success("Date mise à jour !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur de mise à jour.");
    } finally {
      setIsUpdatingPilotage(false);
    }
  };

  const handleCloseTicket = async () => {
    setIsUpdatingPilotage(true);
    try {
      if (!ticket) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tickets').update({
        statut: 'résolu'
      }).eq('id', ticketId);
      if (error) throw error;
      
      // LOGIQUE ECOSYSTÈME : Calcul du SLA et impact sur la note Prestataire
      let noteModifier = 0;
      let messageSla = "";
      if (ticket.date_limite_sla) {
        if (new Date() <= new Date(ticket.date_limite_sla)) {
          noteModifier = 0.1; // Bonus
          messageSla = "SLA respecté (Bonus de note attribué au prestataire).";
        } else {
          noteModifier = -0.2; // Malus
          messageSla = "SLA dépassé (Malus de note appliqué au prestataire).";
        }
      }

      const photoMessage = photoFile ? `\n\n📸 *Une photo de preuve d'intervention a été jointe au dossier.*` : "";

      await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message: `✅ **Intervention terminée :** L'artisan a clôturé le ticket. Le problème est résolu. ${messageSla} ${photoMessage}`
      });

      // Si l'artisan est lié à un prestataire, on met à jour la note dans l'annuaire
      if (userProfile?.prestataire_id && noteModifier !== 0) {
         const { data: currentPrestataire } = await supabase.from('prestataires').select('note').eq('id', userProfile.prestataire_id).single();
         if (currentPrestataire) {
           let newNote = parseFloat(currentPrestataire.note || '5.0') + noteModifier;
           if (newNote > 5) newNote = 5;
           if (newNote < 1) newNote = 1;
           await supabase.from('prestataires').update({ note: newNote }).eq('id', userProfile.prestataire_id);
         }
      }
      toast.success("Ticket clôturé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la clôture.");
    } finally {
      setIsUpdatingPilotage(false);
    }
  };

  // --- LOGIQUE MÉTIER : GESTION DES DEVIS ---
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montantDevis) return;
    setIsUpdatingPilotage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tickets').update({
        montant_devis: parseFloat(montantDevis),
        statut_devis: 'soumis'
      }).eq('id', ticketId);
      if (error) throw error;
      
      await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message: `📄 **Devis soumis :** J'ai proposé un devis de ${montantDevis}€. En attente de validation par le syndic.`
      });
      toast.success("Devis soumis avec succès !");
      setMontantDevis('');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la soumission du devis.");
    } finally {
      setIsUpdatingPilotage(false);
    }
  };

  const handleReviewQuote = async (status: 'valide' | 'refuse') => {
    setIsUpdatingPilotage(true);
    try {
      if (!ticket) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tickets').update({
        statut_devis: status
      }).eq('id', ticketId);
      if (error) throw error;
      
      let message = status === 'valide' ? `✅ **Devis accepté :** Le syndic a validé le devis de ${ticket.montant_devis}€.` : `❌ **Devis refusé :** Le syndic a refusé le devis soumis.`;

      // LOGIQUE ECOSYSTÈME : Auto-génération de l'Ordre de Service (OS)
      if (status === 'valide') {
         const osRef = `OS-${new Date().getFullYear()}-${ticket.id.substring(0, 4).toUpperCase()}`;
         const { error: docError } = await supabase.from('documents').insert({
           nom: `Ordre_Service_${osRef}.pdf`,
           categorie: 'Technique',
           taille: 154000,
           uploader_id: user?.id,
           copropriete_id: ticket?.copropriete_id
         });
         
         if (!docError) {
           message += `\n\n📄 **ORDRE DE SERVICE GÉNÉRÉ (${osRef})**\nL'OS a été signé numériquement et archivé dans le dossier technique du Coffre-fort.`;
         }
      }

      await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message: message
      });
      toast.success(status === 'valide' ? "Devis validé !" : "Devis refusé.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la revue du devis.");
    } finally {
      setIsUpdatingPilotage(false);
    }
  };

  const handleDeclareContrat = async () => {
    setIsUpdatingPilotage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tickets').update({
        statut_devis: 'contrat'
      }).eq('id', ticketId);
      if (error) throw error;
      
      await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message: `🤝 **Intervention sous contrat :** J'ai indiqué que cette intervention est couverte par notre contrat d'entretien annuel. Pas de devis nécessaire.`
      });
      toast.success("Statut contrat déclaré !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur.");
    } finally {
      setIsUpdatingPilotage(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse text-indigo-600 font-bold">Synchronisation du dossier...</div>;
  if (!ticket) return <div className="p-10 text-center text-slate-500 font-bold">Dossier introuvable ou accès refusé.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-auto lg:p-10 lg:space-y-8 max-w-[1400px] mx-auto relative bg-white dark:bg-slate-950">
      
      {/* WORKFLOW TRACKER */}
      <div className="hidden lg:flex items-center justify-between bg-slate-900 dark:bg-black rounded-3xl p-6 shadow-2xl mb-8 border border-white/10">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter">Cockpit de Pilotage</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Réf: {ticket.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-4">
          {['Audit', 'Devis', 'Mandat', 'Travaux', 'Clôture'].map((step, idx) => {
            let currentIdx = 0;
            if (ticket.statut === 'résolu') {
              currentIdx = 4;
            } else if (ticket.statut === 'en cours') {
              currentIdx = 3;
            } else if (ticket.statut_devis === 'valide' || ticket.statut_devis === 'contrat') {
              currentIdx = 2;
            } else if (ticket.prestataire_id) {
              currentIdx = 1;
            } else {
              currentIdx = 0;
            }

            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`h-8 px-4 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isCompleted ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  isCurrent ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 animate-pulse' :
                  'bg-white/5 text-slate-600 border border-white/5'
                }`}>
                  {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                  {step}
                </div>
                {idx < 4 && <div className="w-4 h-[1px] bg-white/10"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* MOBILE HEADER (Sticky) */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 p-4 flex items-center justify-between">
        <Link href="/dashboard/tickets" className="p-2 rounded-xl bg-slate-100 dark:bg-white/5">
          <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <div className="text-center flex-1 px-4">
          <h1 className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{ticket.titre}</h1>
        </div>
        <div className="w-9 h-9"></div>
      </div>

      <div className="hidden lg:flex">
        <Link href="/dashboard/tickets" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-all w-fit mb-6">
          <ChevronLeft className="h-5 w-5" /> Retour au Kanban
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto lg:overflow-visible custom-scrollbar px-4 lg:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start py-6 lg:py-0">
          
          {/* COLONNE GAUCHE : LE DOSSIER ET LE CHAT */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* EN-TÊTE DU DOSSIER (DESKTOP) */}
            <Card className="hidden lg:block rounded-[2.5rem] border-slate-100 dark:border-white/5 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
              <CardHeader className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 p-8 pb-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={`${ticket.urgence === 'critique' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'} border-none uppercase text-[10px] font-black px-4 py-1.5 tracking-widest`}>
                      {ticket.urgence}
                    </Badge>
                    {ticket.date_limite_sla && ticket.statut !== 'résolu' && (
                      <Badge className={`border-none uppercase text-[10px] font-black px-4 py-1.5 tracking-widest ${
                        new Date() > new Date(ticket.date_limite_sla) ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                      }`}>
                        {new Date() > new Date(ticket.date_limite_sla) ? '🔴 SLA DÉPASSÉ' : '🟢 SLA OK'}
                      </Badge>
                    )}
                  </div>
                  <Badge className="bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white border-none uppercase text-[10px] font-black px-4 py-1.5 tracking-widest">
                    {ticket.statut}
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                  {ticket.titre}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[1.5rem] text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic border border-slate-100 dark:border-white/5">
                  &quot;{ticket.description}&quot;
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                    {ticket.auteur?.prenom?.[0] || <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Déclaré par : {ticket.auteur?.prenom} {ticket.auteur?.nom}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      Le {new Date(ticket.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DESCRIPTION MOBILE (Plus compacte) */}
            <div className="lg:hidden bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 mb-6">
               <p className="text-xs font-medium text-slate-600 dark:text-slate-400 italic">&quot;{ticket.description}&quot;</p>
               <div className="mt-4 flex items-center gap-2">
                  <div className="h-6 w-6 bg-indigo-100 dark:bg-white/10 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{ticket.auteur?.prenom?.[0]}</div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Signalé par {ticket.auteur?.prenom}</p>
               </div>
            </div>

            {/* LA LIGNE DE TEMPS (STYLE CHAT) */}
            <div className="space-y-4 pt-2 flex-1 flex flex-col">
              <h3 className="text-lg font-black text-slate-800 dark:text-white ml-2 flex items-center gap-2">
                Fil de discussion <Badge className="bg-indigo-100 dark:bg-white/10 text-indigo-700 dark:text-white border-none text-[10px]">{comments.length}</Badge>
              </h3>
              
              <div className="space-y-6 bg-white dark:bg-slate-900/30 p-4 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm lg:shadow-md flex-1">
                {comments.map((c) => {
                  const isSystemMessage = c.message.startsWith('🔄') || c.message.startsWith('✅') || c.message.startsWith('📄');
                  const isOwnMessage = userProfile?.id === c.user_id;
                  
                  return (
                    <div key={c.id} className={`flex ${isSystemMessage ? 'justify-center' : isOwnMessage ? 'justify-end' : 'justify-start'} gap-3`}>
                      {!isSystemMessage && !isOwnMessage && (
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                          {c.auteur?.prenom?.[0]}
                        </div>
                      )}
                      
                      <div className={`max-w-[85%] lg:max-w-[70%] space-y-1 ${isSystemMessage ? 'w-full' : ''}`}>
                        {!isSystemMessage && (
                          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{isOwnMessage ? 'Vous' : c.auteur?.prenom}</span>
                            <span className="text-[8px] text-slate-300 dark:text-slate-600 font-bold uppercase">{new Date(c.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        )}
                        
                        <div className={`text-xs lg:text-sm font-medium leading-relaxed p-4 rounded-2xl shadow-sm border ${
                          isSystemMessage ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-400 text-center font-bold italic w-full' :
                          isOwnMessage ? 'bg-indigo-600 border-indigo-600 text-white rounded-tr-none' :
                          'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 rounded-tl-none'
                        }`}>
                          {c.message}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* DESKTOP INPUT */}
                <form onSubmit={handleSendComment} className="hidden lg:flex relative pt-6 mt-8 border-t border-slate-50 dark:border-white/5">
                  <Input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Répondre au fil..." 
                    className="h-14 pl-6 pr-16 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-medium focus:ring-4 focus:ring-indigo-50"
                  />
                  <Button type="submit" disabled={isSending} className="absolute right-2.5 top-[30px] h-9 w-9 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : LE COCKPIT INTERACTIF */}
          <div className="space-y-6 lg:sticky lg:top-24 pb-32 lg:pb-0">
            
            <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
               {/* TABS SELECTOR */}
               <div className="flex border-b border-white/5">
                  {[
                    { id: 'pilotage', label: 'Action', icon: <Terminal className="h-4 w-4" /> },
                    { id: 'timeline', label: 'Audit', icon: <Clock className="h-4 w-4" /> },
                    { id: 'docs', label: 'Docs', icon: <FileCheck className="h-4 w-4" /> }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'pilotage' | 'timeline' | 'docs')}
                      className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}
                    >
                      {tab.icon}
                      <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                  ))}
               </div>

               <div className="p-6 lg:p-8">
                  {activeTab === 'pilotage' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                       {/* RESPONSABLE INFO */}
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">Responsable Actuel</p>
                          {ticket.intervenant || ticket.prestataire ? (
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400"><HardHat className="h-5 w-5" /></div>
                                <div>
                                   <p className="text-sm font-black text-white truncate">{ticket.intervenant?.prenom || ticket.prestataire?.nom}</p>
                                   <p className="text-[10px] font-bold text-slate-500">{ticket.date_intervention ? new Date(ticket.date_intervention).toLocaleDateString() : 'Date à définir'}</p>
                                </div>
                             </div>
                          ) : (
                             <p className="text-[10px] font-bold text-amber-500 italic">Aucun responsable assigné</p>
                          )}
                       </div>

                       {/* SYNDIC QUICK ACTIONS */}
                       <HasRole roles={['administrateur', 'syndic']}>
                          <div className="space-y-4">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Commandes Syndic</p>
                             <form onSubmit={handleUpdatePilotage} className="space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                   <select 
                                      value={selectedPrestataire}
                                      onChange={(e) => setSelectedPrestataire(e.target.value)}
                                      className="h-12 w-full rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs px-4 outline-none focus:ring-2 focus:ring-indigo-600"
                                   >
                                      <option value="" className="bg-slate-900">Mandater Entreprise...</option>
                                      {[...prestataires].sort((a, b) => {
                                         const cat = ticket.categorie?.toLowerCase() || 'none';
                                         const aMatch = a.specialite?.toLowerCase().includes(cat);
                                         const bMatch = b.specialite?.toLowerCase().includes(cat);
                                         if (aMatch && !bMatch) return -1;
                                         if (!aMatch && bMatch) return 1;
                                         return 0;
                                      }).map(p => (
                                         <option key={p.id} value={p.id} className="bg-slate-900">
                                           {p.nom} ({p.specialite}) {p.specialite?.toLowerCase().includes(ticket.categorie?.toLowerCase() || 'none') ? '★ RECOMMANDÉ' : ''}
                                         </option>
                                      ))}
                                   </select>
                                   <Input 
                                      type="datetime-local" 
                                      value={dateIntervention}
                                      onChange={(e) => setDateIntervention(e.target.value)}
                                      className="h-12 bg-white/5 border-white/10 text-white font-bold text-xs rounded-xl"
                                   />
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                   <input 
                                      type="checkbox" 
                                      id="informerMur"
                                      checked={informerMur}
                                      onChange={(e) => setInformerMur(e.target.checked)}
                                      className="h-4 w-4 rounded bg-slate-800 border-white/10 text-indigo-600"
                                   />
                                   <Label htmlFor="informerMur" className="text-[10px] font-bold text-slate-400 cursor-pointer">Sync &quot;Le Mur&quot;</Label>
                                </div>

                                <Button type="submit" disabled={isUpdatingPilotage} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xl shadow-indigo-600/20">
                                   {isUpdatingPilotage ? <Loader2 className="animate-spin h-4 w-4" /> : "EXÉCUTER MANDAT"}
                                </Button>
                             </form>

                             {ticket.statut_devis === 'soumis' && (
                                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
                                   <div className="flex justify-between items-center">
                                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Devis Reçu</p>
                                      <span className="text-lg font-black text-white">{ticket.montant_devis}€</span>
                                   </div>
                                   <div className="flex gap-2">
                                      <Button onClick={() => handleReviewQuote('valide')} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-xl">VALIDER</Button>
                                      <Button onClick={() => handleReviewQuote('refuse')} variant="outline" className="flex-1 h-10 border-white/10 text-white hover:bg-white/5 font-black text-[10px] rounded-xl">REFUSER</Button>
                                   </div>
                                </div>
                             )}
                          </div>
                       </HasRole>

                       {/* ARTISAN QUICK ACTIONS */}
                       <HasRole roles={['artisan']}>
                          <div className="space-y-4">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Commandes Artisan</p>
                             <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                   <Input 
                                      type="datetime-local" 
                                      value={dateIntervention}
                                      onChange={(e) => setDateIntervention(e.target.value)}
                                      className="h-12 bg-white/5 border-white/10 text-white font-bold text-xs rounded-xl"
                                   />
                                   <Button onClick={handleUpdateArtisan} className="h-12 bg-indigo-600 text-white font-black text-xs rounded-xl">FIXER DATE</Button>
                                </div>

                                <div className="pt-4 border-t border-white/5 space-y-3">
                                   <Input 
                                      type="number" 
                                      placeholder="Montant Devis €"
                                      value={montantDevis}
                                      onChange={(e) => setMontantDevis(e.target.value)}
                                      disabled={ticket.statut_devis === 'valide' || ticket.statut_devis === 'soumis'}
                                      className="h-12 bg-white/5 border-white/10 text-white font-bold text-xs rounded-xl"
                                   />
                                   <Button onClick={handleSubmitQuote} disabled={!montantDevis || ticket.statut_devis === 'valide' || ticket.statut_devis === 'soumis'} className="w-full h-12 bg-white text-slate-900 font-black text-xs rounded-xl hover:bg-slate-200">SOUMETTRE DEVIS</Button>
                                   
                                   {ticket.statut_devis === 'aucun' && (
                                     <Button variant="ghost" onClick={handleDeclareContrat} className="w-full text-indigo-400 font-bold text-[10px] hover:text-indigo-300">
                                       Sous contrat d&apos;entretien
                                     </Button>
                                   )}
                                </div>

                                <div className="pt-4 border-t border-white/5 space-y-4">
                                   <div className="grid grid-cols-2 gap-3">
                                      <label className="h-20 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                         <Camera className="h-5 w-5 text-slate-500 mb-1" />
                                         <span className="text-[8px] font-black text-slate-500 uppercase">Preuve</span>
                                         <input type="file" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                                      </label>
                                      <button 
                                         onClick={() => setIsSigned(!isSigned)}
                                         className={`h-20 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${isSigned ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-white/10 text-slate-500'}`}
                                      >
                                         <Info className="h-5 w-5 mb-1" />
                                         <span className="text-[8px] font-black uppercase">{isSigned ? 'Signé' : 'Signature'}</span>
                                      </button>
                                   </div>
                                   <Button onClick={handleCloseTicket} disabled={ticket.statut === 'résolu'} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/20">CLÔTURER MISSION</Button>
                                </div>
                             </div>
                          </div>
                       </HasRole>
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Audit de sécurité</p>
                       <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                          {comments.filter(c => c.message.startsWith('🔄') || c.message.startsWith('✅') || c.message.startsWith('📄')).map((c, i) => (
                             <div key={i} className="relative pl-8">
                                <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center z-10">
                                   <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                </div>
                                <p className="text-xs font-bold text-slate-300 leading-relaxed">{c.message}</p>
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{new Date(c.created_at).toLocaleString()}</p>
                             </div>
                          ))}
                       </div>
                    </div>
                  )}

                  {activeTab === 'docs' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Dossier technique</p>
                       <div className="space-y-3">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400"><FileCheck className="h-5 w-5" /></div>
                                <div>
                                   <p className="text-xs font-bold text-white">Signalement Initial</p>
                                   <p className="text-[8px] font-black text-slate-500 uppercase">Archive Automatique</p>
                                </div>
                             </div>
                             <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white"><ArrowUpCircle className="h-4 w-4 rotate-180" /></Button>
                          </div>
                          {ticket.statut_devis === 'valide' && (
                            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-400"><FileCheck className="h-5 w-5" /></div>
                                  <div>
                                     <p className="text-xs font-bold text-white">Ordre de Service</p>
                                     <p className="text-[8px] font-black text-emerald-500/60 uppercase">Signé numériquement</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white"><ArrowUpCircle className="h-4 w-4 rotate-180" /></Button>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* STICKY MOBILE INPUT */}
      <div className="lg:hidden fixed bottom-28 left-6 right-6 z-[50]">
          <form onSubmit={handleSendComment} className="relative">
             <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 rounded-2xl"></div>
             <Input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Votre message..." 
                className="h-14 pl-5 pr-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900/50 shadow-2xl font-medium focus:ring-4 focus:ring-indigo-50 dark:text-white relative z-10"
             />
             <Button type="submit" disabled={isSending} className="absolute right-2 top-2 h-10 w-10 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white z-20">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
             </Button>
          </form>
      </div>

    </div>
  );
}