'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Vote, Plus, Clock, Users, CheckCircle2, AlertCircle, Loader2, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';

export default function VotesPage() {
  const [sondages, setSondages] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // États formulaire de création
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [options, setOptions] = useState(['', '']); // 2 options par défaut
  
  const supabase = createClient();

  const loadSondages = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    // Récupérer les sondages AVEC leurs options et tous les votes
    const { data: sondagesData } = await supabase
      .from('sondages')
      .select(`
        *,
        options:sondage_options(*),
        votes:sondage_votes(*)
      `)
      .order('created_at', { ascending: false });
    
    if (sondagesData) setSondages(sondagesData);
    setIsLoading(false);
  };

  useEffect(() => { loadSondages(); }, []);

  // --- LOGIQUE MÉTIER : CRÉATION DU SONDAGE ---
  const handleCreateSondage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const validOptions = options.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) throw new Error("Il faut au moins 2 options.");

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      // 1. Créer le sondage
      const { data: newSondage, error: sondageError } = await supabase.from('sondages').insert({
        copropriete_id: profile?.copropriete_id,
        createur_id: user?.id,
        titre: formData.get('titre') as string,
        description: formData.get('description') as string,
        date_fin: formData.get('date_fin') as string,
      }).select().single();

      if (sondageError) throw sondageError;

      // 2. Insérer les options liées
      const optionsToInsert = validOptions.map(texte => ({
        sondage_id: newSondage.id,
        texte: texte
      }));

      const { error: optionsError } = await supabase.from('sondage_options').insert(optionsToInsert);
      if (optionsError) throw optionsError;

      toast.success("Sondage publié à toute la résidence !");
      setIsDialogOpen(false);
      setOptions(['', '']); // Reset
      loadSondages();

    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- LOGIQUE MÉTIER : VOTER ---
  const handleVote = async (sondageId: string, optionId: string) => {
    try {
      const { error } = await supabase.from('sondage_votes').insert({
        sondage_id: sondageId,
        option_id: optionId,
        user_id: userId
      });

      if (error) throw error;
      toast.success("A voté !");
      loadSondages(); // Rafraîchit les barres de progression
    } catch (err: any) {
      toast.error("Vous avez probablement déjà voté !");
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto mb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            <Vote className="h-10 w-10 text-indigo-600" /> Consultations
          </h1>
          <p className="text-slate-500 font-medium">Décisions participatives et préparation des AG.</p>
        </div>
        
        <HasRole roles={['administrateur', 'syndic']}>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black shadow-xl shadow-indigo-100">
                <Plus className="mr-2 h-5 w-5" /> Nouveau Sondage
              </Button>
            </DialogTrigger>
            
            <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 sm:max-w-[500px]">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Nouvelle consultation</DialogTitle>
                <DialogDescription>Soumettez une question à l'ensemble des copropriétaires.</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateSondage} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Question / Résolution</Label>
                  <Input name="titre" placeholder="Ex: Remplacement de la porte du hall ?" required className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Explications (Optionnel)</Label>
                  <Textarea name="description" placeholder="Détails du devis, etc..." className="rounded-xl bg-slate-50 border-none resize-none" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Date de clôture des votes</Label>
                  <Input name="date_fin" type="date" required className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <Label className="text-xs font-black uppercase text-indigo-600 tracking-widest ml-1">Options de réponse</Label>
                  {options.map((opt, index) => (
                    <Input 
                      key={index} 
                      placeholder={`Option ${index + 1}`} 
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[index] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                    />
                  ))}
                  {options.length < 4 && (
                    <Button type="button" variant="ghost" onClick={() => setOptions([...options, ''])} className="text-indigo-600 font-bold text-xs">
                      + Ajouter une option
                    </Button>
                  )}
                </div>

                <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg text-white shadow-xl mt-6">
                  {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Publier le sondage"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </HasRole>
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
      ) : sondages.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <PieChart className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold italic">Aucune consultation en cours.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sondages.map((sondage) => {
            const totalVotes = sondage.votes?.length || 0;
            const hasVoted = sondage.votes?.some((v: any) => v.user_id === userId);
            const myVote = sondage.votes?.find((v: any) => v.user_id === userId);
            
            // Calcul si expiré
            const isClosed = new Date(sondage.date_fin).getTime() < new Date().getTime() || sondage.statut === 'cloture';

            return (
              <Card key={sondage.id} className={`rounded-[2.5rem] border-none shadow-sm overflow-hidden ${isClosed ? 'opacity-75 bg-slate-50' : 'bg-white'}`}>
                <CardContent className="p-0">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex gap-3 items-center">
                        {isClosed ? (
                          <Badge className="bg-slate-200 text-slate-600 border-none uppercase text-[9px] font-black tracking-widest px-3">Clôturé</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none uppercase text-[9px] font-black tracking-widest px-3 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> En cours
                          </Badge>
                        )}
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Fin le {new Date(sondage.date_fin).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{sondage.titre}</h3>
                      {sondage.description && <p className="text-slate-500 font-medium text-sm max-w-2xl">{sondage.description}</p>}
                    </div>
                    
                    <div className="flex flex-col items-end text-slate-400">
                      <Users className="h-6 w-6 mb-1" />
                      <span className="text-lg font-black text-slate-900">{totalVotes}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">Votes</span>
                    </div>
                  </div>

                  <div className="p-8 space-y-4 bg-slate-50/30">
                    {sondage.options?.map((option: any) => {
                      const votesForOption = sondage.votes?.filter((v: any) => v.option_id === option.id).length || 0;
                      const percentage = totalVotes > 0 ? Math.round((votesForOption / totalVotes) * 100) : 0;
                      const isMyChoice = myVote?.option_id === option.id;

                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className={`font-bold ${isMyChoice ? 'text-indigo-600' : 'text-slate-700'}`}>
                              {option.texte} {isMyChoice && "✓ (Votre choix)"}
                            </span>
                            <span className="font-black text-slate-900">{percentage}% ({votesForOption})</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Progress value={percentage} className={`h-3 flex-1 ${isMyChoice ? '[&>div]:bg-indigo-600' : '[&>div]:bg-slate-300'}`} />
                            
                            {/* BOUTON DE VOTE */}
                            {!hasVoted && !isClosed && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleVote(sondage.id, option.id)}
                                className="h-8 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs shrink-0"
                              >
                                Voter
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {hasVoted && !isClosed && (
                      <p className="text-xs font-bold text-emerald-600 text-center pt-4 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Votre vote a été pris en compte.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}