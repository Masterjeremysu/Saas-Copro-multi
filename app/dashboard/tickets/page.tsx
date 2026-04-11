'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  Ticket as TicketIcon, Plus, AlertCircle, 
  CheckCircle2, Clock, MoreHorizontal, User,
  Loader2, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Les colonnes de notre Kanban
const COLUMNS = [
  { id: 'ouvert', label: 'Nouveaux', icon: <AlertCircle className="h-4 w-4 text-rose-500" />, bgColor: 'bg-rose-50' },
  { id: 'en cours', label: 'En traitement', icon: <Clock className="h-4 w-4 text-amber-500" />, bgColor: 'bg-amber-50' },
  { id: 'résolu', label: 'Résolus', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, bgColor: 'bg-emerald-50' }
];

export default function TicketsKanbanPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // États du Drag & Drop
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // États du Modal d'ajout
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  const loadTickets = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('tickets')
      .select('*, auteur:profiles(prenom, nom, role)')
      .order('created_at', { ascending: false });
    
    if (data) setTickets(data);
    setIsLoading(false);
  };

  useEffect(() => { loadTickets(); }, []);

  // --- LOGIQUE METIER : CRÉATION D'UN TICKET ---
  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      const { error } = await supabase.from('tickets').insert({
        copropriete_id: profile?.copropriete_id,
        auteur_id: user?.id,
        titre: formData.get('titre'),
        description: formData.get('description'),
        categorie: formData.get('categorie'),
        urgence: formData.get('urgence'),
        statut: 'ouvert' // Toujours ouvert par défaut
      });

      if (error) throw error;

      toast.success("Signalement créé avec succès !");
      setIsDialogOpen(false);
      loadTickets();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- LOGIQUE METIER : DRAG & DROP (LA MAGIE SAAS) ---
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicketId(ticketId);
    // Effet visuel transparent pendant qu'on tient la carte
    setTimeout(() => { (e.target as HTMLElement).style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedTicketId(null);
    setActiveColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault(); // Nécessaire pour autoriser le "drop"
    setActiveColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setActiveColumn(null);

    if (!draggedTicketId) return;

    // 1. Mise à jour optimiste de l'UI (Instantané pour l'utilisateur)
    const ticketToMove = tickets.find(t => t.id === draggedTicketId);
    if (!ticketToMove || ticketToMove.statut === newStatus) return;

    const previousStatus = ticketToMove.statut;
    setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, statut: newStatus } : t));

    // 2. Mise à jour en base de données (Silencieuse en arrière-plan)
    const { error } = await supabase
      .from('tickets')
      .update({ statut: newStatus })
      .eq('id', draggedTicketId);

    if (error) {
      // Rollback si la BDD plante
      setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, statut: previousStatus } : t));
      toast.error("Erreur de synchronisation !");
    } else {
      toast.success(`Ticket passé en : ${newStatus}`);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto h-[calc(100vh-5rem)] flex flex-col">
      
      {/* HEADER TICKET */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            <TicketIcon className="h-10 w-10 text-indigo-600" /> Centre d'opérations
          </h1>
          <p className="text-slate-500 font-medium">Glissez et déposez les tickets pour modifier leur statut.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black shadow-xl shadow-indigo-100">
              <Plus className="mr-2 h-5 w-5" /> Déclarer un incident
            </Button>
          </DialogTrigger>
          
          <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 sm:max-w-[500px]">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Nouveau Ticket</DialogTitle>
              <DialogDescription>Décrivez le problème avec précision pour une intervention rapide.</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Sujet</Label>
                <Input name="titre" placeholder="Ex: Fuite d'eau au 3ème" required className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Catégorie</Label>
                  <select name="categorie" required className="flex h-12 w-full rounded-xl bg-slate-50 px-3 border-none font-bold outline-none">
                    <option value="plomberie">Plomberie</option>
                    <option value="electricite">Électricité</option>
                    <option value="nettoyage">Nettoyage</option>
                    <option value="ascenseur">Ascenseur</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Urgence</Label>
                  <select name="urgence" required className="flex h-12 w-full rounded-xl bg-slate-50 px-3 border-none font-bold outline-none">
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="critique">Critique ⚡️</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Description</Label>
                <Textarea name="description" placeholder="Détails du problème..." className="rounded-xl bg-slate-50 border-none resize-none min-h-[100px]" />
              </div>

              <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg text-white shadow-xl mt-6">
                {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Envoyer le signalement"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* LE BOARD KANBAN */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pb-4">
          
          {COLUMNS.map((column) => {
            // On filtre les tickets qui appartiennent à cette colonne
            const columnTickets = tickets.filter(t => t.statut === column.id);

            return (
              <div 
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex flex-col bg-slate-100/50 rounded-[2.5rem] overflow-hidden transition-colors border-2 ${
                  activeColumn === column.id ? 'border-indigo-400 bg-indigo-50/50' : 'border-transparent'
                }`}
              >
                {/* Header de la Colonne */}
                <div className="p-6 pb-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${column.bgColor}`}>
                      {column.icon}
                    </div>
                    <h2 className="font-black text-slate-900 tracking-tight uppercase text-sm">{column.label}</h2>
                  </div>
                  <Badge className="bg-white text-slate-900 shadow-sm border-none font-black">{columnTickets.length}</Badge>
                </div>

                {/* Zone des cartes (scrollable) */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 custom-scrollbar">
                  {columnTickets.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm italic p-6 text-center border-2 border-dashed border-slate-200 rounded-3xl mx-2">
                      Glissez un ticket ici
                    </div>
                  ) : (
                    columnTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={handleDragEnd}
                        className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <Badge className={`${
                            ticket.urgence === 'critique' ? 'bg-rose-100 text-rose-700' : 
                            ticket.urgence === 'normale' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                          } border-none uppercase text-[9px] font-black tracking-widest`}>
                            {ticket.urgence}
                          </Badge>
                          <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <h3 className="font-black text-slate-900 mb-2 leading-tight">{ticket.titre}</h3>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center text-[8px] font-black text-indigo-600 uppercase">
                              {ticket.auteur?.prenom?.[0] || <User className="h-3 w-3" />}
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                              {Array.isArray(ticket.auteur) ? ticket.auteur[0]?.prenom : ticket.auteur?.prenom}
                            </span>
                          </div>
                          
                          <Link href={`/dashboard/tickets/${ticket.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50">
                              Ouvrir
                            </Button>
                          </Link>
                        </div>
                      </div>
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