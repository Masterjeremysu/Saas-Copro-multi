'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  ChevronLeft, Send, Clock, AlertCircle, CheckCircle2, User, 
  Loader2, HardHat, Calendar, Settings2, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [prestataires, setPrestataires] = useState<any[]>([]);
  
  // États formulaires
  const [newMessage, setNewMessage] = useState('');
  const [selectedPrestataire, setSelectedPrestataire] = useState<string>('');
  const [dateIntervention, setDateIntervention] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingPilotage, setIsUpdatingPilotage] = useState(false);
  
  const supabase = createClient();

  const loadTicketData = async () => {
    // 1. Charger le ticket avec l'artisan assigné
    const { data: t } = await supabase
      .from('tickets')
      .select('*, auteur:profiles!tickets_auteur_id_fkey(prenom, nom), prestataire:prestataires(nom, telephone)')
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

    return () => { supabase.removeChannel(channel); };
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
      
      await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message: `🔄 **Mise à jour du dossier :** Le syndic a mandaté l'entreprise *${artisanNom}*. L'intervention est prévue pour le ${dateFormatee}. Le ticket passe "En cours".`
      });

      toast.success("Dossier mis à jour et résidents notifiés !");
    } catch (err: any) {
      toast.error("Erreur de mise à jour.");
    } finally {
      setIsUpdatingPilotage(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse text-indigo-600 font-bold">Synchronisation du dossier...</div>;
  if (!ticket) return <div className="p-10 text-rose-500 font-bold">Dossier introuvable.</div>;

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1400px] mx-auto mb-20">
      
      <Link href="/dashboard/tickets" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-all w-fit">
        <ChevronLeft className="h-5 w-5" /> Retour au Kanban
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* COLONNE GAUCHE : LE DOSSIER ET LE CHAT */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* EN-TÊTE DU DOSSIER */}
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 pb-6">
              <div className="flex justify-between items-start mb-4">
                <Badge className={`${ticket.urgence === 'critique' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'} border-none uppercase text-[10px] font-black px-4 py-1.5 tracking-widest`}>
                  {ticket.urgence}
                </Badge>
                <Badge className="bg-slate-200 text-slate-700 border-none uppercase text-[10px] font-black px-4 py-1.5 tracking-widest">
                  {ticket.statut}
                </Badge>
              </div>
              <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">
                {ticket.titre}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-[1.5rem] text-slate-600 font-medium leading-relaxed italic border border-slate-100">
                "{ticket.description}"
              </div>
              
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black">
                  {ticket.auteur?.prenom?.[0] || <User className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Déclaré par : {ticket.auteur?.prenom} {ticket.auteur?.nom}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Le {new Date(ticket.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LA LIGNE DE TEMPS (CHAT + AUDIT) */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-black text-slate-800 ml-4 flex items-center gap-2">
              Journal d'intervention <Badge className="bg-indigo-100 text-indigo-700 border-none">{comments.length}</Badge>
            </h3>
            
            <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              {comments.map((c) => {
                const isSystemMessage = c.message.startsWith('🔄');
                
                return (
                  <div key={c.id} className={`flex gap-4 ${isSystemMessage ? 'bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50' : ''}`}>
                    {!isSystemMessage && (
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-xs font-black text-slate-500 uppercase">
                        {c.auteur?.prenom?.[0]}
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5">
                      {!isSystemMessage && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{c.auteur?.prenom}</span>
                          <Badge variant="outline" className="text-[8px] h-4 font-black uppercase tracking-widest px-1.5 opacity-50 border-slate-300">
                            {c.auteur?.role}
                          </Badge>
                          <span className="text-[9px] text-slate-300 font-black">{new Date(c.created_at).toLocaleString('fr-FR', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'short'})}</span>
                        </div>
                      )}
                      <div className={`text-sm font-medium leading-relaxed ${isSystemMessage ? 'text-indigo-800 font-bold' : 'text-slate-600 bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100'}`}>
                        {c.message}
                      </div>
                    </div>
                  </div>
                );
              })}

              <form onSubmit={handleSendComment} className="relative pt-4 mt-8 border-t border-slate-50">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Envoyer un message aux résidents ou au syndic..." 
                  className="h-16 pl-6 pr-16 rounded-[1.5rem] bg-slate-50 border-none font-medium focus:ring-4 focus:ring-indigo-50"
                />
                <Button type="submit" disabled={isSending} className="absolute right-3 top-[26px] h-10 w-10 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : PANNEAU DE CONTRÔLE SYNDIC */}
        <div className="space-y-6 lg:sticky lg:top-24">
          
          {/* STATUT ACTUEL (RAPPEL) */}
          <div className="bg-[#0F172A] p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative z-10 space-y-1">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Responsable</p>
              {ticket.prestataire ? (
                <div className="flex items-center gap-3 pt-2">
                  <div className="p-3 bg-white/10 rounded-xl text-white"><HardHat className="h-5 w-5" /></div>
                  <div>
                    <p className="text-lg font-black leading-tight">{ticket.prestataire.nom}</p>
                    <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" /> 
                      {ticket.date_intervention ? new Date(ticket.date_intervention).toLocaleString('fr-FR') : 'Date à définir'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 pt-2 font-bold text-sm">
                  <AlertCircle className="h-4 w-4" /> Aucun pro mandaté
                </div>
              )}
            </div>
          </div>

          {/* FORMULAIRE DE MANDAT (VISIBLE SEULEMENT SYNDIC/ADMIN) */}
          <HasRole roles={['administrateur', 'syndic']}>
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b p-6">
                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-800">
                  <Settings2 className="h-4 w-4 text-indigo-600" /> Pilotage Syndic
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleUpdatePilotage} className="space-y-5">
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Mandater une entreprise</Label>
                    <select 
                      value={selectedPrestataire}
                      onChange={(e) => setSelectedPrestataire(e.target.value)}
                      className="flex h-12 w-full rounded-xl bg-slate-50 px-3 border-none font-bold outline-none text-sm focus:ring-4 focus:ring-indigo-50"
                    >
                      <option value="">-- Choisir dans l'annuaire --</option>
                      {prestataires.map(p => (
                        <option key={p.id} value={p.id}>{p.nom} ({p.specialite})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">2. Planifier l'intervention</Label>
                    <Input 
                      type="datetime-local" 
                      value={dateIntervention}
                      onChange={(e) => setDateIntervention(e.target.value)}
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-4 focus:ring-indigo-50" 
                    />
                  </div>

                  <Button type="submit" disabled={isUpdatingPilotage} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 font-black text-sm text-white shadow-xl mt-4">
                    {isUpdatingPilotage ? <Loader2 className="animate-spin h-4 w-4" /> : "Mettre à jour le dossier"}
                  </Button>

                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mt-4">
                    Mettre à jour publiera un message dans le journal d'intervention.
                  </p>
                </form>
              </CardContent>
            </Card>
          </HasRole>

        </div>
      </div>
    </div>
  );
}