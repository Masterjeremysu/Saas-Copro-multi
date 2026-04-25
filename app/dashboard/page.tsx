'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Users, 
  ArrowRight, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Wrench,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useMemo } from 'react';
import { SupportModal } from './support-modal';
import { motion } from 'framer-motion';

interface TicketComment {
  id: string;
  message: string;
  created_at: string;
  ticket: { titre: string; id: string };
  auteur: { prenom: string; nom: string; role: string };
}

interface UrgentAlert {
  id: string;
  titre: string;
  created_at: string;
  urgence: string;
}

interface Ticket {
  id: string;
  titre: string;
  description: string;
  statut: string;
  urgence: string;
  created_at: string;
  copropriete_id?: string;
  date_intervention?: string;
  prestataire_id?: string;
  statut_devis?: string;
  categorie?: string;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  specialite?: string;
  prestataire_id?: string;
  copropriete_id: string;
  copropriete?: {
    nom: string;
  };
}

interface DashboardData {
  profile: Profile;
  stats: {
    urgentTickets: number;
    pendingQuotes: number;
    totalMembers: number;
    activeInterventions: number;
    completedThisMonth: number;
    quotesToDraft?: number; // Pour l'artisan
  };
  recentActivity: TicketComment[];
  urgentAlerts: UrgentAlert[];
  nextMission?: Ticket;
  events: { id: string; titre: string; date_event: string; type: string }[];
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadData() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. Profil & Copro
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, copropriete:coproprietes(*)')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setIsLoading(false);
        return;
      }

      const coproId = profile.copropriete_id;
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // 2. Stats
      let urgentTickets = 0;
      let pendingQuotes = 0;
      let totalMembers = 0;
      let activeInterventions = 0;
      let completedThisMonth = 0;
      let quotesToDraft = 0;
      let nextMission: Ticket | undefined;

      if (profile.role === 'artisan') {
        // --- LOGIQUE SPECIFIQUE ARTISAN ---
        
        // Missions en cours (Assigné à moi OU à ma boîte)
        const missionsQuery = supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'en cours');
        
        if (profile.prestataire_id) {
          missionsQuery.or(`intervenant_id.eq.${user.id},prestataire_id.eq.${profile.prestataire_id}`);
        } else {
          missionsQuery.eq('intervenant_id', user.id);
        }
        
        const { count: interventionCount } = await missionsQuery;
        activeInterventions = interventionCount || 0;

        // Devis à faire (assigné mais pas encore de devis)
        const draftQuery = supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('statut_devis', 'aucun');
        
        if (profile.prestataire_id) {
          draftQuery.or(`intervenant_id.eq.${user.id},prestataire_id.eq.${profile.prestataire_id}`);
        } else {
          draftQuery.eq('intervenant_id', user.id);
        }
        
        const { count: draftCount } = await draftQuery;
        quotesToDraft = draftCount || 0;

        // Résolus ce mois
        const resolvedQuery = supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'résolu')
          .gte('created_at', firstDayOfMonth);
        
        if (profile.prestataire_id) {
          resolvedQuery.or(`intervenant_id.eq.${user.id},prestataire_id.eq.${profile.prestataire_id}`);
        } else {
          resolvedQuery.eq('intervenant_id', user.id);
        }
        
        const { count: doneCount } = await resolvedQuery;
        completedThisMonth = doneCount || 0;

        // Prochaine mission (sécurisé avec maybeSingle)
        const nextMissionQuery = supabase
          .from('tickets')
          .select('*')
          .eq('statut', 'en cours')
          .not('date_intervention', 'is', null)
          .order('date_intervention', { ascending: true })
          .limit(1);
        
        if (profile.prestataire_id) {
          nextMissionQuery.or(`intervenant_id.eq.${user.id},prestataire_id.eq.${profile.prestataire_id}`);
        } else {
          nextMissionQuery.eq('intervenant_id', user.id);
        }
        
        const { data: nextM } = await nextMissionQuery.maybeSingle();
        if (nextM) nextMission = nextM;

        // Tickets Urgents dans SA spécialité
        if (profile.specialite) {
          const { count: urgentCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('categorie', profile.specialite)
            .eq('urgence', 'critique')
            .neq('statut', 'résolu');
          urgentTickets = urgentCount || 0;
        }

      } else {
        // --- LOGIQUE SYNDIC / RESIDENT ---
        const { count: urgentCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('copropriete_id', coproId)
          .eq('urgence', 'critique')
          .neq('statut', 'résolu');
        urgentTickets = urgentCount || 0;

        const { count: quoteCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('copropriete_id', coproId)
          .eq('statut_devis', 'soumis');
        pendingQuotes = quoteCount || 0;

        const { count: memberCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('copropriete_id', coproId);
        totalMembers = memberCount || 0;

        const { count: globalInterventions } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('copropriete_id', coproId)
          .eq('statut', 'en cours');
        activeInterventions = globalInterventions || 0;

        const { count: doneCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('copropriete_id', coproId)
          .eq('statut', 'résolu')
          .gte('created_at', firstDayOfMonth);
        completedThisMonth = doneCount || 0;
      }

      // Alertes Urgentes (Filtrées par spécialité pour l'artisan)
      let alertQuery = supabase
        .from('tickets')
        .select('id, titre, created_at, urgence')
        .eq('copropriete_id', coproId)
        .eq('urgence', 'critique')
        .neq('statut', 'résolu');
      
      if (profile.role === 'artisan' && profile.specialite) {
        alertQuery = alertQuery.eq('categorie', profile.specialite);
      }

      const { data: urgentAlerts } = await alertQuery
        .order('created_at', { ascending: false })
        .limit(3);

      // Activité Récente (Derniers commentaires)
      const { data: activities } = await supabase
        .from('ticket_comments')
        .select('id, message, created_at, ticket:tickets(titre, id), auteur:profiles(prenom, nom, role)')
        .order('created_at', { ascending: false })
        .limit(5);

      // Événements & Décisions (Agenda + AGs)
      const { data: manualEvents } = await supabase
        .from('copropriete_events')
        .select('id, titre, date_event, type')
        .eq('copropriete_id', coproId)
        .gte('date_event', new Date().toISOString())
        .order('date_event', { ascending: true })
        .limit(3);

      const { data: agEvents } = await supabase
        .from('assemblees')
        .select('id, titre, date_tenue')
        .eq('copropriete_id', coproId)
        .gte('date_tenue', new Date().toISOString())
        .order('date_tenue', { ascending: true })
        .limit(2);

      const mergedEvents = [
        ...(manualEvents || []),
        ...(agEvents || []).map(ag => ({
          id: ag.id,
          titre: ag.titre,
          date_event: ag.date_tenue,
          type: 'ag'
        }))
      ].sort((a, b) => new Date(a.date_event).getTime() - new Date(b.date_event).getTime())
      .slice(0, 3);

      setData({
        profile,
        stats: {
          urgentTickets,
          pendingQuotes,
          totalMembers: totalMembers || 0,
          activeInterventions,
          completedThisMonth,
          quotesToDraft
        },
        urgentAlerts: (urgentAlerts as UrgentAlert[]) || [],
        recentActivity: (activities as unknown as TicketComment[]) || [],
        nextMission,
        events: mergedEvents
      });
      
      setIsLoading(false);
    }

    loadData();
  }, [supabase]);

  if (isLoading) return <div className="p-10 animate-pulse text-indigo-600 font-bold italic dark:text-indigo-400">Initialisation du cockpit...</div>;

  const isArtisan = data?.profile?.role === 'artisan';

  return (
    <div className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
        
        {/* HERO CARD */}
        <div className={`flex-1 bg-gradient-to-br ${isArtisan ? 'from-slate-900 via-indigo-950 to-indigo-900' : 'from-indigo-600 via-indigo-700 to-slate-900'} rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-16 text-white shadow-2xl relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 w-64 lg:w-96 h-64 lg:h-96 bg-white/10 rounded-full -mr-10 -mt-10 lg:-mr-20 lg:-mt-20 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
          
          <div className="relative z-10 space-y-4 lg:space-y-6">
            <Badge className="bg-white/20 backdrop-blur-md text-white border-none uppercase tracking-widest px-3 py-1 font-black text-[8px] lg:text-[10px]">
              {isArtisan ? `Expert ${data?.profile?.specialite || 'Partenaire'}` : `Cockpit ${data?.profile?.role === 'syndic' ? 'Syndic' : 'Résident'}`}
            </Badge>
            
            <h1 className="text-3xl lg:text-7xl font-black tracking-tighter leading-none">
              {isArtisan ? (
                data?.stats.activeInterventions === 0 && (data?.stats.quotesToDraft || 0) > 0 ? (
                  <>De nouvelles <br className="hidden lg:block" /> opportunités ?</>
                ) : (
                  <>Prêt pour <br className="hidden lg:block" /> l&apos;intervention ?</>
                )
              ) : (
                <>Bonjour, <br className="hidden lg:block" /> {data?.profile?.prenom} !</>
              )}
            </h1>

            {isArtisan && data?.nextMission ? (
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-3xl mt-4 max-w-xl group-hover:bg-white/20 transition-all cursor-pointer">
                 <Link href={`/dashboard/tickets/${data.nextMission.id}`}>
                   <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-2 flex items-center gap-2">
                     <Clock className="h-3 w-3" /> Prochaine Mission
                   </p>
                   <p className="text-lg font-bold mb-1">{data.nextMission.titre}</p>
                   <div className="flex items-center gap-4 text-xs text-indigo-100/70">
                      <span className="flex items-center gap-1.5">{new Date(data.nextMission.date_intervention!).toLocaleDateString('fr-FR')}</span>
                      <span className="flex items-center gap-1.5">{new Date(data.nextMission.date_intervention!).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                 </Link>
              </div>
            ) : (
              <p className="text-indigo-100/80 text-sm lg:text-xl font-medium max-w-xl leading-relaxed">
                {isArtisan 
                  ? (data?.stats.quotesToDraft || 0) > 0 
                    ? `Vous avez ${data?.stats.quotesToDraft} devis en attente de chiffrage dans votre spécialité.`
                    : "Consultez vos missions et gérez vos devis en un clic." 
                  : `Tout est sous contrôle à ${data?.profile?.copropriete?.nom || 'la résidence'}.`}
              </p>
            )}
            
            <div className="pt-4 lg:pt-6 flex flex-wrap gap-3 lg:gap-4">
              <Link href="/dashboard/tickets" className="flex-1 lg:flex-none">
                <Button className="w-full lg:w-auto bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl lg:rounded-[1.5rem] px-6 lg:px-8 h-12 lg:h-16 font-black text-sm lg:text-lg shadow-xl shadow-indigo-900/20 group/btn">
                  {isArtisan ? "Gérer mes Missions" : "Signalements"} 
                  <ArrowRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ALERTE URGENCE / OPPORTUNITÉ (DROITE) */}
        {(data?.urgentAlerts?.length || 0) > 0 && (
          <div className={`${isArtisan ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'} lg:w-96 border rounded-[2.5rem] p-6 lg:p-8 flex flex-col justify-between shadow-sm`}>
            <div className="space-y-4 lg:space-y-6">
              <div className={`flex items-center gap-3 ${isArtisan ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isArtisan ? <Zap className="h-5 w-5 lg:h-6 lg:w-6" /> : <AlertCircle className="h-5 w-5 lg:h-6 lg:w-6 animate-pulse" />}
                <h3 className="font-black uppercase tracking-widest text-[10px] lg:text-xs">{isArtisan ? 'Nouveaux Dossiers' : 'Urgences Critiques'}</h3>
              </div>
              <div className="space-y-3 lg:space-y-4">
                {data?.urgentAlerts.map(alert => (
                  <Link key={alert.id} href={`/dashboard/tickets/${alert.id}`} className="block group">
                    <div className={`bg-white dark:bg-slate-900/50 p-3 lg:p-4 rounded-xl lg:rounded-2xl border ${isArtisan ? 'border-indigo-200/50 dark:border-indigo-900/20 group-hover:border-indigo-400' : 'border-rose-200/50 dark:border-rose-900/20 group-hover:border-rose-400'} transition-all`}>
                      <p className="font-black text-slate-900 dark:text-white text-xs lg:text-sm line-clamp-1">{alert.titre}</p>
                      <p className="text-[8px] lg:text-[10px] text-slate-400 font-bold uppercase mt-1">Signalé à {new Date(alert.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/dashboard/tickets" className={`mt-4 lg:mt-6 ${isArtisan ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'} text-[10px] lg:text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all`}>
              {isArtisan ? 'Voir toutes les opportunités' : 'Centre de crise'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard 
          href="/dashboard/tickets?filter=urgent"
          title={isArtisan ? "Urgences" : "Ouverts"} 
          value={data?.stats.urgentTickets || 0} 
          subtitle={isArtisan ? "À traiter" : "dont critiques"}
          icon={<AlertCircle className={`h-5 w-5 lg:h-6 lg:w-6 ${isArtisan ? 'text-indigo-500' : 'text-rose-500'}`} />} 
          color={isArtisan ? "indigo" : "rose"}
        />
        <StatCard 
          href="/dashboard/tickets?filter=quotes"
          title={isArtisan ? "Devis à faire" : "Devis"} 
          value={(isArtisan ? data?.stats.quotesToDraft : data?.stats.pendingQuotes) ?? 0} 
          subtitle={isArtisan ? "En attente" : "Soumis"}
          icon={<TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-amber-500" />} 
          color="indigo"
        />
        <StatCard 
          href={isArtisan ? "/dashboard/tickets?filter=active" : "/dashboard/annuaire"}
          title={isArtisan ? "Missions" : "Membres"} 
          value={isArtisan ? (data?.stats.activeInterventions ?? 0) : (data?.stats.totalMembers ?? 0)} 
          subtitle={isArtisan ? "En cours" : "Inscrits"}
          icon={isArtisan ? <Wrench className="h-5 w-5 lg:h-6 lg:w-6 text-slate-400" /> : <Users className="h-5 w-5 lg:h-6 lg:w-6 text-indigo-500" />} 
          color={isArtisan ? "slate" : "indigo"}
        />
        <StatCard 
          href="/dashboard/tickets?filter=resolved"
          title={isArtisan ? "Facturées" : "Résolus"} 
          value={data?.stats.completedThisMonth ?? 0} 
          subtitle="Mois"
          icon={<CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-500" />} 
          color="emerald"
        />
      </div>

      {/* LOWER SECTION: ACTIVITY & PLANNING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* ACTIVITÉ RÉCENTE */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between px-2 lg:px-4 mb-2">
            <h3 className="text-xl lg:text-2xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 lg:h-6 lg:w-6 text-indigo-600" /> Flux d&apos;activité
            </h3>
            <Link href="/dashboard/tickets">
              <Button variant="ghost" className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">Tout voir</Button>
            </Link>
          </div>
          
          <div className="relative pl-4 lg:pl-10 space-y-6 lg:space-y-8">
            {/* Timeline Line - Simplified for stability */}
            <div className="absolute left-[11px] lg:left-[23px] top-4 bottom-4 w-[2px] bg-slate-200 dark:bg-slate-800"></div>

            {data?.recentActivity.length === 0 ? (
              <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 text-center italic text-slate-400 text-sm">
                Aucune activité récente.
              </div>
            ) : (
              data?.recentActivity.map((act, index) => (
                <ActivityItem key={act.id} act={act} index={index} />
              ))
            )}
          </div>
        </div>

        {/* PLANNING / ÉVÉNEMENTS */}
        <div className="space-y-4 lg:space-y-6">
          <h3 className="text-xl lg:text-2xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2 px-2 lg:px-4">
            <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-indigo-600" /> {isArtisan ? 'Mon Planning' : 'Événements'}
          </h3>
          
          <div className="space-y-3 lg:space-y-4">
              {isArtisan ? (
                data?.nextMission ? (
                  <EventCard 
                     icon={<Wrench className="h-5 w-5" />}
                     title={data.nextMission.titre}
                     date={new Date(data.nextMission.date_intervention!).toLocaleDateString('fr-FR', {day:'numeric', month:'short'})}
                     type="Intervention"
                     status="Confirmé"
                     color="indigo"
                  />
                ) : (
                  <p className="text-slate-400 text-xs italic px-4 py-2">Aucune intervention planifiée.</p>
                )
              ) : (
                <>
                  {data?.events && data.events.length > 0 ? (
                    data.events.map(event => (
                      <EventCard 
                        key={event.id}
                        icon={event.type === 'ag' ? <Users className="h-5 w-5" /> : event.type === 'decision' ? <Zap className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                        title={event.titre}
                        date={new Date(event.date_event).toLocaleDateString('fr-FR', {day:'numeric', month:'short'})}
                        type={event.type === 'ag' ? 'Assemblée Générale' : event.type === 'decision' ? 'Résultat Vote' : 'Événement'}
                        status="Prévu"
                        color={event.type === 'ag' ? 'indigo' : event.type === 'decision' ? 'indigo' : 'slate'}
                      />
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs italic px-4 py-2">Aucun événement à venir.</p>
                  )}
                </>
              )}
             
             <div className="bg-[#0F172A] rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-700"></div>
                <h4 className="text-base lg:text-lg font-black tracking-tighter mb-1 lg:mb-2 relative z-10">Une question ?</h4>
                <p className="text-slate-400 text-xs lg:text-sm font-medium mb-4 lg:mb-6 relative z-10 leading-relaxed">Notre support est à votre disposition.</p>
                <SupportModal>
                  <Button className="w-full bg-white text-slate-900 hover:bg-indigo-50 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest relative z-10 h-10 lg:h-12">
                    Contact Support
                  </Button>
                </SupportModal>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color, trend, href }: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  icon: React.ReactNode; 
  color: 'rose' | 'indigo' | 'slate' | 'emerald';
  trend?: string;
  href?: string;
}) {
  const colors: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400',
    slate: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
  };

  const CardContent = (
    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full cursor-pointer">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform duration-500`}>
          {icon}
        </div>
        {trend && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-none text-[8px] font-black px-2">{trend}</Badge>}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
          <p className="text-xs font-bold text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{CardContent}</Link>;
  }

  return CardContent;
}

function ActivityItem({ act, index }: { act: TicketComment; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex gap-4 lg:gap-6 items-start group"
    >
      {/* Timeline Dot */}
      <div className="absolute left-[-9px] lg:left-[-21px] top-4 h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 z-10 flex items-center justify-center group-hover:scale-125 transition-transform shadow-lg shadow-indigo-500/20">
        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex gap-4 lg:gap-5 items-start">
          <div className={`h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 ${
            act.auteur.role === 'artisan' 
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' 
              : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10'
          }`}>
            {act.auteur.role === 'artisan' ? <Wrench className="h-5 w-5 lg:h-6 lg:w-6" /> : <Users className="h-5 w-5 lg:h-6 lg:w-6" />}
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <p className="text-xs lg:text-sm font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-x-1.5">
                <span className="text-indigo-600 dark:text-indigo-400">{act.auteur.prenom} {act.auteur.nom}</span>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">sur</span>
                <span className="truncate max-w-[200px]">{act.ticket?.titre || 'Ticket'}</span>
              </p>
              <span className="text-[8px] lg:text-[9px] text-slate-400 font-black uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full self-start sm:self-auto">
                {new Date(act.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 lg:p-4 rounded-xl lg:rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs lg:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {formatActivityMessage(act.message || "")}
              </p>
            </div>

            <div className="flex justify-end">
              <Link href={`/dashboard/tickets/${act.ticket?.id}`} className="group/link flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                <span className="text-[9px] lg:text-[10px] font-black uppercase text-indigo-600 tracking-widest">Voir le dossier</span>
                <ArrowRight className="h-3 w-3 text-indigo-600 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatActivityMessage(message: string) {
  // Rendu pour le gras **texte** et l'italique *texte*
  const parts = message.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-900 dark:text-white font-black">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-slate-500 dark:text-slate-400 italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function EventCard({ icon, title, date, type, status, color }: {
  icon: React.ReactNode;
  title: string;
  date: string;
  type: string;
  status: string;
  color: 'indigo' | 'slate';
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-600 text-white shadow-indigo-200',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shadow-none'
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex gap-5 items-center group hover:border-indigo-200 transition-all">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{type}</p>
          <Badge variant="outline" className="text-[8px] uppercase tracking-tighter opacity-50">{status}</Badge>
        </div>
        <p className="font-black text-slate-900 dark:text-white truncate mt-0.5">{title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date}</span>
        </div>
      </div>
    </div>
  );
}