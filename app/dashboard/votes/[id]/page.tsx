'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Clock, Users, CheckCircle2, 
  ArrowLeft, Share2, Info,
  ShieldCheck, BarChart3,
  Zap, Loader2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HasRole } from '@/components/auth-guard';
import { notifyCopropriete } from '@/utils/notification-service';
import { generateDecisionReport } from '@/utils/pdf-service';

interface Sondage {
  id: string;
  titre: string;
  description: string | null;
  type: 'official' | 'poll' | 'availability';
  date_fin: string;
  copropriete_id: string;
  is_anonymous: boolean;
  quorum_percentage: number;
  options: { id: string; texte: string }[];
  votes: { id: string; user_id: string; option_id: string }[];
}

export default function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [consultation, setConsultation] = useState<Sondage | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: sondage } = await supabase
      .from('sondages')
      .select(`
        *,
        options:sondage_options(*),
        votes:sondage_votes(*)
      `)
      .eq('id', id)
      .single();
    
    if (sondage) {
      setConsultation(sondage);
      const myVote = (sondage.votes as { user_id: string; option_id: string }[])?.find((v) => v.user_id === user?.id);
      if (myVote) setSelectedOption(myVote.option_id);
    }
    setIsLoading(false);
  }, [id, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVote = async () => {
    if (!selectedOption || !userId) return;
    setIsVoting(true);
    
    try {
      const { error } = await supabase.from('sondage_votes').insert({
        sondage_id: id,
        option_id: selectedOption,
        user_id: userId
      });

      if (error) throw error;
      toast.success("Votre décision a été enregistrée.");
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur : " + message);
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Calcul des Millièmes...</div>;
  if (!consultation) return <div className="p-20 text-center text-slate-400">Consultation introuvable.</div>;

  const totalVotes = consultation.votes?.length || 0;
  const isClosed = new Date(consultation.date_fin) < new Date();
  const hasVoted = consultation.votes?.some((v) => v.user_id === userId);

  // Calculate winner if closed or if user has voted
  const results = consultation.options?.map((option) => {
    const votesCount = consultation.votes?.filter((v) => v.option_id === option.id).length || 0;
    return { ...option, votesCount, percentage: totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0 };
  }).sort((a, b) => b.votesCount - a.votesCount);

  const winner = (hasVoted || isClosed) && (results?.[0]?.votesCount || 0) > 0 ? results[0] : null;

  const handleShare = async () => {
    const shareData = {
      title: `CoproSync : ${consultation.titre}`,
      text: `Votre avis est requis sur : ${consultation.titre}. Participez au vote ici :`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Erreur partage", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien de la consultation copié !", {
        description: "Vous pouvez maintenant le coller dans WhatsApp ou un email."
      });
    }
  };

  const handleSyncToAgenda = async () => {
    if (!winner || !consultation) return;
    try {
      const { error } = await supabase.from('copropriete_events').insert({
        copropriete_id: consultation.copropriete_id,
        consultation_id: consultation.id,
        titre: `[DÉCISION] ${consultation.titre}`,
        description: `Résultat du vote : ${winner.texte}\nParticipation : ${totalVotes} votants.`,
        date_event: consultation.date_fin,
        type: 'decision'
      });
      if (error) throw error;

      // NOTIFICATION : Alerter tous les résidents du résultat officiel
      await notifyCopropriete({
        coproprieteId: consultation.copropriete_id,
        titre: "📅 Résultat Acté à l'Agenda",
        message: `La décision "${consultation.titre}" a été validée : ${winner.texte}. Retrouvez-la dans l'agenda.`,
        lien: `/dashboard/agenda`,
        type: 'agenda'
      });

      toast.success("Résultat intégré à l'agenda de la copropriété !");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur sync agenda : " + message);
    }
  };

  const handleExportPDF = () => {
    if (!consultation) return;
    generateDecisionReport({
      titre: consultation.titre,
      description: consultation.description || '',
      date_fin: consultation.date_fin,
      createur: "Syndic / Conseil Syndical",
      total_votes: totalVotes,
      options: results.map(r => ({
        label: r.texte,
        votes_count: r.votesCount,
        percentage: r.percentage
      })),
      copropriete_nom: "Résidence CoproSync" // Idéalement à dynamiser via le profil
    });
  };

  return (
    <div className="p-4 lg:p-10 max-w-4xl mx-auto space-y-8 mb-32">
      
      {/* NAVIGATION */}
      <Link href="/dashboard/votes" className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
        <ArrowLeft className="h-4 w-4" /> Retour aux décisions
      </Link>

      {/* HEADER CARD */}
      <div className={`rounded-[3rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden transition-all duration-1000 ${isClosed ? 'bg-slate-900 shadow-slate-900/40' : 'bg-indigo-600 shadow-indigo-600/40'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10 text-white">
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-white/20 text-white border-none font-black uppercase text-[10px] tracking-widest px-4 py-1.5 backdrop-blur-md">
                {consultation.type === 'official' ? 'Vote Officiel' : consultation.type === 'availability' ? 'Disponibilités' : 'Sondage'}
              </Badge>
              {isClosed ? (
                <Badge className="bg-emerald-500 text-white border-none font-black uppercase text-[10px] tracking-widest px-4 py-1.5 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-2" /> Vote Clôturé
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white border-none font-black uppercase text-[10px] tracking-widest px-4 py-1.5 backdrop-blur-md">
                  <Clock className="h-3 w-3 mr-2" /> Clôture le {format(new Date(consultation.date_fin), 'dd MMM', { locale: fr })}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl lg:text-6xl font-black tracking-tighter leading-tight">
              {consultation.titre}
            </h1>
            <p className="text-white/70 font-medium text-lg max-w-2xl leading-relaxed">
              {consultation.description || "Aucune explication complémentaire n'a été fournie pour cette consultation."}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 min-w-[140px]">
            <Users className="h-8 w-8 text-white mb-2" />
            <span className="text-3xl font-black">{totalVotes}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Votants</span>
          </div>
        </div>

        {/* WINNER BANNER IF CLOSED */}
        {isClosed && winner && (
          <div className="mt-12 p-6 bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-1000 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
               <div className="h-16 w-16 bg-amber-400 rounded-full flex items-center justify-center text-slate-900 shadow-xl shadow-amber-400/20 rotate-12">
                  <Zap className="h-8 w-8 fill-current" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-amber-400 tracking-[0.3em]">Résultat Majoritaire</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{winner.texte}</p>
               </div>
            </div>
            <HasRole roles={['administrateur', 'syndic']}>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleExportPDF} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-2xl h-14 px-6 font-black transition-all">
                  <FileText className="mr-2 h-4 w-4" /> RAPPORT PDF
                </Button>
                <Button onClick={handleSyncToAgenda} className="bg-white text-slate-900 hover:bg-amber-400 rounded-2xl h-14 px-8 font-black transition-all group">
                  INTÉGRER À L&apos;AGENDA <ArrowLeft className="ml-2 h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </HasRole>
          </div>
        )}
      </div>

      {/* VOTING INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* OPTIONS LIST */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-6">
            {isClosed ? 'Résultats du scrutin' : 'Exprimez votre choix'}
          </h2>
          
          <div className="space-y-4">
            {consultation.options?.map((option) => {
              const currentResult = results?.find((r) => r.id === option.id);
              const votesCount = currentResult?.votesCount || 0;
              const percentage = currentResult?.percentage || 0;
              const isSelected = selectedOption === option.id;
              const isWinner = winner?.id === option.id;

              return (
                <div
                  key={option.id}
                  className={`w-full text-left p-6 lg:p-8 rounded-[2rem] border-2 transition-all relative overflow-hidden group ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-xl' 
                      : isWinner && isClosed
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* PROGRESS BACKGROUND (IF VOTED OR CLOSED) */}
                  {(hasVoted || isClosed) && (
                    <div 
                      className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isWinner ? 'bg-amber-400/10' : 'bg-indigo-500/5'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  )}

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                      {!isClosed ? (
                        <button
                          disabled={hasVoted}
                          onClick={() => setSelectedOption(option.id)}
                          className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-5 w-5" />}
                        </button>
                      ) : (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isWinner ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                          {isWinner ? <Zap className="h-4 w-4" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </div>
                      )}
                      <div>
                        <p className={`text-lg font-black tracking-tight ${isSelected ? 'text-indigo-600' : isWinner && isClosed ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                          {option.texte}
                        </p>
                        {(hasVoted || isClosed) && (
                          <div className="flex items-center gap-3 mt-1">
                             <div className="w-24 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ${isWinner ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${percentage}%` }} />
                             </div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {percentage}% • {votesCount} voix
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {isWinner && isClosed && (
                      <Badge className="bg-amber-400 text-slate-900 border-none font-black text-[9px] uppercase tracking-widest px-3">Gagnant</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!hasVoted && !isClosed && (
            <Button 
              onClick={handleVote}
              disabled={!selectedOption || isVoting}
              className="w-full h-16 rounded-[2rem] bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-2xl shadow-indigo-600/20 mt-8 transition-all active:scale-95"
            >
              {isVoting ? <Loader2 className="h-6 w-6 animate-spin" /> : "VALIDER MA DÉCISION"}
            </Button>
          )}

          {hasVoted && !isClosed && (
            <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30 text-center space-y-2">
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-400">Vote enregistré !</h3>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
                Les résultats définitifs seront affichés ici dès la clôture.
              </p>
            </div>
          )}
        </div>

        {/* SIDEBAR INFO */}
        <div className="space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Détails du scrutin</h2>
          
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Sécurité & Transparence</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-500">Vote anonyme</span>
                    <Badge variant="outline" className="rounded-full font-black text-[9px]">{consultation.is_anonymous ? 'ACTIF' : 'INACTIF'}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-500">Quorum requis</span>
                    <span className="font-black text-slate-900 dark:text-white">{consultation.quorum_percentage || 50}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <Info className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Action automatisée</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400 font-medium italic">
                  Une fois clos, le résultat majoritaire est automatiquement proposé pour être greffé à l&apos;agenda officiel de la copropriété.
                </p>
              </div>

              <Button 
                onClick={handleShare}
                variant="outline" 
                className="w-full h-14 rounded-2xl border-slate-100 dark:border-white/10 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                <Share2 className="h-4 w-4" /> Partager
              </Button>
            </CardContent>
          </Card>

          {/* REAL TIME PROGRESS FOR QUORUM */}
          {consultation.type === 'official' && !isClosed && (
            <Card className="rounded-[2.5rem] bg-slate-900 text-white shadow-xl overflow-hidden border-none relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BarChart3 className="h-20 w-20" />
              </div>
              <CardContent className="p-8 space-y-6 relative">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 mb-2">Progression Quorum</p>
                  <h3 className="text-3xl font-black tracking-tighter">
                     {Math.round((totalVotes / 25) * 100)}% 
                  </h3>
                </div>
                <Progress value={(totalVotes / 25) * 100} className="h-2 bg-white/10 [&>div]:bg-indigo-500" />
                <p className="text-[10px] font-bold opacity-60 leading-relaxed uppercase tracking-wider">
                  Cible : 25 Millièmes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
