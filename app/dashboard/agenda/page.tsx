'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, 
  Plus, Clock, 
  Vote, HardHat, Users, 
  Info, Loader2, ArrowLeft, ChevronDown, FileText,
  PartyPopper, Zap, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, 
  DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  format, addMonths, subMonths, 
  startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { HasRole } from '@/components/auth-guard';
import Link from 'next/link';
import { notifyCopropriete } from '@/utils/notification-service';
import { generateAgendaReport } from '@/utils/pdf-service';

interface AgendaEvent {
  id: string;
  titre: string;
  description: string | null;
  date_event: string;
  type: string;
  categorie: string;
}

interface CategoryInfo {
  id: string;
  label: string;
  color: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryInfo[] = [
  { id: 'all', label: 'Tout voir', color: 'bg-slate-900', icon: <Filter className="h-4 w-4" /> },
  { id: 'alerte', label: 'Alerte Technique', color: 'bg-rose-600', icon: <Zap className="h-4 w-4" /> },
  { id: 'travaux', label: 'Travaux / Maintenance', color: 'bg-amber-500', icon: <HardHat className="h-4 w-4" /> },
  { id: 'social', label: 'Vie de la Résidence', color: 'bg-emerald-500', icon: <PartyPopper className="h-4 w-4" /> },
  { id: 'ag', label: 'Assemblée Générale', color: 'bg-indigo-600', icon: <Users className="h-4 w-4" /> },
  { id: 'reunion', label: 'Réunion CS / Syndic', color: 'bg-blue-500', icon: <Info className="h-4 w-4" /> },
  { id: 'decision', label: 'Décision / Vote', color: 'bg-purple-500', icon: <Vote className="h-4 w-4" /> },
];

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    heure: '10:00',
    categorie: 'autre'
  });

  const supabase = createClient();

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);

    // 1. Charger les événements manuels
    const { data: manualEvents } = await supabase
      .from('copropriete_events')
      .select('*')
      .gte('date_event', firstDay.toISOString())
      .lte('date_event', lastDay.toISOString())
      .order('date_event', { ascending: true });

    // 2. Charger les AGs
    const { data: agEvents } = await supabase
      .from('assemblees')
      .select('id, titre, date_tenue, lieu')
      .gte('date_tenue', firstDay.toISOString())
      .lte('date_tenue', lastDay.toISOString());

    // 3. Fusionner
    const formattedAgs: AgendaEvent[] = (agEvents || []).map(ag => ({
      id: ag.id,
      titre: ag.titre,
      description: ag.lieu ? `Lieu : ${ag.lieu}` : null,
      date_event: ag.date_tenue,
      type: 'ag',
      categorie: 'ag'
    }));

    setEvents([...(manualEvents || []), ...formattedAgs].sort((a, b) => 
      new Date(a.date_event).getTime() - new Date(b.date_event).getTime()
    ));
    setIsLoading(false);
  }, [currentDate, supabase]);

  const filteredEvents = useMemo(() => {
    if (activeCategory === 'all') return events;
    return events.filter(e => e.categorie === activeCategory);
  }, [events, activeCategory]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreateEvent = async () => {
    if (!formData.titre) {
      toast.error("Veuillez donner un titre à l'événement.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      const { error } = await supabase.from('copropriete_events').insert({
        copropriete_id: profile?.copropriete_id,
        createur_id: user?.id,
        titre: formData.titre,
        description: formData.description,
        date_event: `${formData.date}T${formData.heure}:00Z`,
        categorie: formData.categorie,
        type: formData.categorie === 'decision' ? 'decision' : 'manual'
      });

      if (error) throw error;

      // NOTIFICATION : Alerter tous les résidents du nouvel événement
      const catLabel = CATEGORIES.find(c => c.id === formData.categorie)?.label || "Événement";
      await notifyCopropriete({
        coproprieteId: profile?.copropriete_id,
        titre: `📅 Nouveau RDV : ${catLabel}`,
        message: `${formData.titre} le ${format(new Date(formData.date), 'dd/MM')}.`,
        lien: `/dashboard/agenda`,
        type: 'agenda'
      });

      toast.success("Événement ajouté à l'agenda.");
      setIsDialogOpen(false);
      loadEvents();
      setFormData({ titre: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), heure: '10:00', categorie: 'autre' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur : " + message);
    } finally {
      setIsSaving(false);
    }
  };

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleExportAgenda = () => {
    generateAgendaReport("Résidence CoproSync", events);
  };

  const handleICSExport = () => {
    if (events.length === 0) {
      toast.error("Aucun événement à exporter.");
      return;
    }

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CoproSync//NONSGML v1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:CoproSync - Agenda Résidence',
      'X-WR-TIMEZONE:Europe/Paris'
    ];

    events.forEach(event => {
      const start = formatDate(event.date_event);
      // Fin par défaut 1h après
      const endDate = new Date(new Date(event.date_event).getTime() + 60 * 60 * 1000);
      const end = formatDate(endDate.toISOString());

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@coprosync.com`,
        `DTSTAMP:${formatDate(new Date().toISOString())}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${event.titre}`,
        `DESCRIPTION:${event.description || ''} (Catégorie: ${event.categorie})`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'agenda-coprosync.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Agenda exporté ! Importez le fichier .ics dans Google ou Apple Calendar.");
  };

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* NAVIGATION MOBILE */}
      <Link href="/dashboard" className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest lg:hidden">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      {/* HEADER TACTIQUE */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="space-y-4 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <div className="h-14 w-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <CalendarIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white italic">
                 Agenda Résidentiel
              </h1>
              <p className="text-slate-500 font-medium text-xs lg:text-sm uppercase tracking-widest mt-1">
                 {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            onClick={handleExportAgenda}
            variant="outline" 
            className="h-14 px-6 border-slate-200 dark:border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hidden sm:flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> EXPORT PDF
          </Button>

          <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
             <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-xl hover:bg-white dark:hover:bg-white/10">
                <ChevronLeft className="h-5 w-5" />
             </Button>
             <Button variant="ghost" onClick={() => setCurrentDate(new Date())} className="px-4 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white dark:hover:bg-white/10">
                Aujourd&apos;hui
             </Button>
             <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-xl hover:bg-white dark:hover:bg-white/10">
                <ChevronRight className="h-5 w-5" />
             </Button>
          </div>

          <HasRole roles={['administrateur', 'syndic', 'membre_cs']}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-8 bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl group">
                  <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
                  NOUVEL ÉVÉNEMENT
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 bg-white dark:bg-slate-900 max-w-lg">
                <DialogTitle className="text-3xl font-black tracking-tighter mb-2">Ajouter un événement</DialogTitle>
                <DialogDescription className="text-slate-400 font-medium text-xs mb-8">Planifiez un moment clé pour la résidence.</DialogDescription>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Titre de l&apos;événement</Label>
                    <Input 
                      placeholder="Ex: Assemblée de Printemps" 
                      value={formData.titre}
                      onChange={e => setFormData({...formData, titre: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</Label>
                      <Input 
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-white/10 border-none font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Heure</Label>
                      <Input 
                        type="time"
                        value={formData.heure}
                        onChange={e => setFormData({...formData, heure: e.target.value})}
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-white/10 border-none font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Catégorie</Label>
                    <div className="relative">
                      <select 
                        value={formData.categorie}
                        onChange={e => setFormData({...formData, categorie: e.target.value})}
                        className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-white/10 border-none px-4 font-bold text-sm focus:ring-2 focus:ring-indigo-600 outline-none appearance-none text-slate-900 dark:text-white"
                      >
                        {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</Label>
                    <Textarea 
                      placeholder="Détails supplémentaires..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-medium min-h-[100px]"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateEvent} 
                    disabled={isSaving}
                    className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-600/20"
                  >
                    {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : "ENREGISTRER DANS L'AGENDA"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </HasRole>
        </div>
      </div>

      {/* BARRE DE FILTRES TACTIQUE */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap font-black text-[10px] uppercase tracking-widest transition-all ${
              activeCategory === cat.id 
                ? `${cat.color} text-white shadow-xl shadow-current/20` 
                : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-white/5 hover:border-indigo-200'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* VUE HYBRIDE CALENDRIER / TIMELINE */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* CALENDRIER (Desktop) */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-[3rem] p-6 lg:p-10 border border-slate-100 dark:border-white/5 shadow-sm overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 mb-6">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.date_event), day));
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div 
                    key={idx} 
                    className={`min-h-[120px] p-3 rounded-2xl border transition-all ${
                      isToday(day) 
                        ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' 
                        : 'border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
                    } ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}`}
                  >
                    <p className={`text-xs font-black mb-2 ${isToday(day) ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {format(day, 'd')}
                    </p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => {
                        const cat = CATEGORIES.find(c => c.id === event.categorie) || CATEGORIES[4];
                        return (
                          <div 
                            key={event.id}
                            className={`px-2 py-1 rounded-lg ${cat.color} text-white text-[9px] font-black truncate flex items-center gap-1 shadow-sm`}
                            title={event.titre}
                          >
                            {cat.icon}
                            <span className="truncate">{event.titre}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[8px] font-black text-slate-400 text-center uppercase tracking-tighter">
                          + {dayEvents.length - 3} autres
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* TIMELINE (Mobile & Desktop Sidebar) */}
        <div className="space-y-6">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Chronologie Tactique
           </h2>
           
           <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
              {isLoading ? (
                [1,2,3].map(i => <div key={i} className="h-32 bg-slate-50 dark:bg-white/5 rounded-[2rem] animate-pulse" />)
              ) : (
                filteredEvents.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Rien de prévu ici</p>
                  </div>
                ) : (
                  filteredEvents.map(event => {
                    const cat = CATEGORIES.find(c => c.id === event.categorie) || CATEGORIES[CATEGORIES.length - 1];
                    return (
                      <CardEvent key={event.id} event={event} category={cat} />
                    );
                  })
                )
              )}
           </div>

           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl"></div>
              <div className="relative z-10 space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Synchronisation</p>
                 <p className="text-sm font-medium leading-relaxed opacity-70 italic">
                    Votre copropriété, partout avec vous. Synchronisez cet agenda avec vos outils personnels en un clic.
                 </p>
                 <Button 
                    onClick={handleICSExport}
                    className="w-full h-12 rounded-xl bg-white text-slate-900 hover:bg-indigo-50 font-black text-[10px] uppercase tracking-widest relative z-10"
                 >
                    SYNCHRONISER MAINTENANT
                 </Button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

function CardEvent({ event, category }: { event: AgendaEvent; category: CategoryInfo }) {
  const isAlerte = event.categorie === 'alerte';
  
  return (
    <div className={`group p-6 rounded-[2rem] border transition-all duration-300 ${
      isAlerte 
        ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30' 
        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 shadow-sm'
    } hover:shadow-xl hover:translate-x-1`}>
      <div className="flex items-start gap-4">
        <div className={`h-12 w-12 rounded-2xl ${category.color} flex items-center justify-center text-white shrink-0 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isAlerte ? 'text-rose-600' : 'text-slate-400'}`}>{category.label}</p>
            {isAlerte && <Badge className="bg-rose-600 text-white border-none text-[8px] animate-pulse">URGENT</Badge>}
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2">{event.titre}</h3>
          <div className="flex flex-wrap gap-4 items-center">
             <div className="flex items-center gap-1.5 text-slate-500">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold uppercase">{format(new Date(event.date_event), 'dd MMM', { locale: fr })}</span>
             </div>
             <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold uppercase">{format(new Date(event.date_event), 'HH:mm', { locale: fr })}</span>
             </div>
          </div>
          {event.description && (
             <div className="mt-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100/50 dark:border-white/5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-3 italic">
                  &quot;{event.description}&quot;
                </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
