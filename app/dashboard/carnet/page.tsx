'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  HistoryIcon, 
  Plus, 
  Search,
  FileText,
  Loader2,
  HardHat,
  Activity,
  Calendar,
  TrendingUp,
  Box,
  ArrowUpRight,
  ShieldAlert,
  Construction,
  Flame,
  Droplets,
  Zap,
  Wrench,
  ShieldCheck,
  Building2,
  FileCheck2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- TYPES ---
interface Intervention {
  id: string;
  titre: string;
  description: string;
  entreprise: string;
  date_intervention: string;
  cout: number;
  type_intervention: 'Maintenance' | 'Réparation' | 'Rénovation' | 'Inspection' | 'Urgence';
}

interface Contract {
  id: string;
  fournisseur: string;
  service: string;
  date_fin: string;
}

interface Organe {
  id: string;
  nom: string;
  categorie: string;
  statut: 'sain' | 'alerte' | 'critique';
  icon: React.ReactNode;
  dernier_entretien: string;
  prochain_entretien: string;
  contrat_id?: string;
}

// --- UTILITAIRES ---
const getIconForService = (service: string) => {
  const s = service.toLowerCase();
  if (s.includes('ascenseur')) return <Box className="h-7 w-7" />;
  if (s.includes('chauffage') || s.includes('chaudière')) return <Flame className="h-7 w-7" />;
  if (s.includes('eau') || s.includes('pompe')) return <Droplets className="h-7 w-7" />;
  if (s.includes('incendie') || s.includes('sécurité')) return <ShieldAlert className="h-7 w-7" />;
  if (s.includes('élec')) return <Zap className="h-7 w-7" />;
  if (s.includes('toiture') || s.includes('façade')) return <Construction className="h-7 w-7" />;
  return <Wrench className="h-7 w-7" />;
};

// --- COMPOSANTS ---

const CarteOrgane = ({ organe }: { organe: Organe }) => {
  const couleursStatut = {
    sain: 'bg-emerald-500',
    alerte: 'bg-amber-500',
    critique: 'bg-rose-500'
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full blur-3xl -mr-16 -mt-16 ${couleursStatut[organe.statut]}`}></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-500">
            {organe.icon}
          </div>
          <div className="flex flex-col items-end">
             <div className={`h-2.5 w-2.5 rounded-full ${couleursStatut[organe.statut]} animate-pulse shadow-[0_0_8px] ${organe.statut === 'sain' ? 'shadow-emerald-500' : organe.statut === 'alerte' ? 'shadow-amber-500' : 'shadow-rose-500'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-40">Statut: {organe.statut}</span>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {organe.nom}
        </h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{organe.categorie}</p>

        <div className="mt-auto pt-6 border-t border-slate-50 dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center text-[10px]">
             <span className="font-bold text-slate-400 uppercase tracking-tighter">Dernière Intervention</span>
             <span className="font-black text-slate-900 dark:text-white">{organe.dernier_entretien}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
             <span className="font-bold text-slate-400 uppercase tracking-tighter">Échéance Contrat</span>
             <span className={`font-black ${organe.statut === 'critique' ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
               {organe.prochain_entretien}
             </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function CarnetPage() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [contrats, setContrats] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    // 1. Charger les interventions réelles
    const { data: dataInterventions } = await supabase
      .from('carnet_entretien')
      .select('*')
      .order('date_intervention', { ascending: false });
    
    if (dataInterventions) setInterventions(dataInterventions);

    // 2. Charger les contrats réels pour déduire les organes
    const { data: dataContrats } = await supabase
      .from('contrats')
      .select('id, fournisseur, service, date_fin')
      .is('deleted_at', null);

    if (dataContrats) setContrats(dataContrats);

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Déduction dynamique des organes de la résidence
  const organes = useMemo(() => {
    return contrats.map(c => {
      const interventionsLiees = interventions.filter(i => i.entreprise.toLowerCase() === c.fournisseur.toLowerCase());
      const derniereDate = interventionsLiees.length > 0 
        ? format(new Date(interventionsLiees[0].date_intervention), 'dd MMM yyyy', { locale: fr })
        : 'Aucune trace';
      
      const joursRestants = differenceInDays(new Date(c.date_fin), new Date());
      const statut = joursRestants < 0 ? 'critique' : joursRestants < 30 ? 'alerte' : 'sain';

      return {
        id: c.id,
        nom: c.service,
        categorie: c.fournisseur,
        statut: statut as 'sain' | 'alerte' | 'critique',
        icon: getIconForService(c.service),
        dernier_entretien: derniereDate,
        prochain_entretien: format(new Date(c.date_fin), 'dd MMM yyyy', { locale: fr }),
        contrat_id: c.id
      };
    });
  }, [contrats, interventions]);

  const stats = useMemo(() => {
    const total = interventions.reduce((acc, curr) => acc + (Number(curr.cout) || 0), 0);
    const sainCount = organes.filter(o => o.statut === 'sain').length;
    const scoreVitalite = organes.length > 0 ? Math.round((sainCount / organes.length) * 100) : 100;
    return { total, scoreVitalite };
  }, [interventions, organes]);

  const handleCreateEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('copropriete_id')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase.from('carnet_entretien').insert({
        copropriete_id: profile?.copropriete_id,
        titre: formData.get('titre') as string,
        description: formData.get('description') as string,
        entreprise: formData.get('entreprise') as string,
        date_intervention: formData.get('date_intervention') as string,
        cout: formData.get('cout') || 0,
        type_intervention: formData.get('type_intervention') as string
      });

      if (error) throw error;

      toast.success("Intervention consignée avec succès !");
      setIsDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error("Erreur technique : " + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredInterventions = useMemo(() => {
    return interventions.filter(i => 
      i.titre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.entreprise.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [interventions, searchTerm]);

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* HERO TACTIQUE - REGISTRE DE VITALITÉ */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl">
        {/* Orbes d'ambiance */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="space-y-6 text-center lg:text-left flex-1">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10"
            >
               <Activity className="h-4 w-4 text-emerald-400" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Moniteur de Vitalité Immobilière</span>
            </motion.div>
            
            <h1 className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic pr-20">
               Registre <br className="hidden lg:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">de Vitalité&nbsp;</span>
            </h1>
            
            <p className="text-slate-400 font-medium text-sm lg:text-xl max-w-xl leading-relaxed mx-auto lg:mx-0">
               Historique technique immuable et pilotage de la performance de vos actifs. Garantissez la pérennité de votre patrimoine avec une précision chirurgicale.
            </p>
          </div>
          
          {/* Dashboard Indicateurs */}
          <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] text-center lg:text-left min-w-[180px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Indicateur de Santé</p>
                <p className={`text-4xl font-black ${stats.scoreVitalite > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stats.scoreVitalite}<span className="text-sm text-slate-500 ml-1">%</span>
                </p>
                <div className="h-1.5 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${stats.scoreVitalite}%` }} 
                    className={`h-full ${stats.scoreVitalite > 80 ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_8px]`} 
                   />
                </div>
             </div>
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] text-center lg:text-left min-w-[180px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Budget Engagé</p>
                <p className="text-4xl font-black text-white">{stats.total.toLocaleString()} <span className="text-sm text-slate-500 ml-1">€</span></p>
                <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-emerald-400">
                   <TrendingUp className="h-3 w-3" /> Performance Optimale
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
         <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic tracking-tight">Actions Tactiques</h3>
               
               <div className="grid grid-cols-1 gap-3">
                  <HasRole roles={['administrateur', 'syndic']}>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                          <Plus className="mr-2 h-5 w-5" /> Consigner une Intervention
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 sm:max-w-[500px] bg-white dark:bg-slate-950">
                        <DialogHeader className="mb-6">
                          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white italic">Nouvelle Intervention</DialogTitle>
                          <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                            Enregistrez une action technique dans le registre légal de la copropriété.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleCreateEntry} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Titre de la mission</Label>
                            <Input name="titre" placeholder="Ex: Maintenance préventive Ascenseur" required className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date</Label>
                              <Input name="date_intervention" type="date" required className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Type d&apos;Action</Label>
                              <select name="type_intervention" required className="flex h-12 w-full rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2 text-sm border-none font-bold focus:ring-4 focus:ring-indigo-50 outline-none">
                                <option value="Maintenance">Maintenance</option>
                                <option value="Réparation">Réparation</option>
                                <option value="Rénovation">Rénovation</option>
                                <option value="Inspection">Inspection</option>
                                <option value="Urgence">Urgence</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Entreprise mandatée</Label>
                            <Input name="entreprise" placeholder="Ex: OTIS S.A." required className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Montant TTC (€)</Label>
                            <Input name="cout" type="number" step="0.01" placeholder="0.00" className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Compte-rendu</Label>
                            <Textarea name="description" placeholder="Notes techniques sur l'intervention..." className="rounded-xl bg-slate-50 dark:bg-white/5 border-none resize-none focus:ring-4 focus:ring-indigo-50" />
                          </div>

                          <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg text-white shadow-xl shadow-indigo-600/20 mt-6">
                            {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "VALIDER L'INSCRIPTION"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </HasRole>

                  <Link href="/dashboard/tickets">
                    <Button variant="outline" className="w-full h-16 border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">
                       <ShieldAlert className="mr-2 h-5 w-5" /> Signaler une Anomalie
                    </Button>
                  </Link>
                  
                  <Link href="/dashboard/contrats">
                    <Button variant="outline" className="w-full h-16 border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">
                       <FileCheck2 className="mr-2 h-5 w-5" /> Gérer les Contrats
                    </Button>
                  </Link>

                  <Button variant="ghost" className="w-full h-14 rounded-xl text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest">
                     <FileText className="mr-2 h-4 w-4" /> Exporter le Registre PDF
                  </Button>
               </div>
            </div>

            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
               <h4 className="text-xl font-black italic mb-4 relative z-10">Anticipation Intelligente</h4>
               <p className="text-white/70 text-sm font-medium relative z-10 leading-relaxed mb-6">
                  Analyse des flux : Sur la base de vos contrats actifs, 100% de vos organes vitaux sont actuellement sous surveillance.
               </p>
               <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">
                  VOIR LES PRÉVISIONS
               </Button>
            </div>
         </div>

         <div className="lg:col-span-3 space-y-12">
            {/* ORGANES DE LA RÉSIDENCE (DYNAMIQUE) */}
            <div className="space-y-6">
               <div className="flex justify-between items-end">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tight">Organes de la Résidence</h2>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none uppercase text-[10px] font-black tracking-widest px-4 py-1">
                     Données Réelles
                  </Badge>
               </div>
               
               {organes.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-white/5 rounded-[3rem] p-12 text-center border-2 border-dashed border-slate-100 dark:border-white/10">
                    <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold italic">Aucun organe détecté. Configurez vos contrats pour activer la surveillance.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {organes.map(organe => (
                      <CarteOrgane key={organe.id} organe={organe} />
                    ))}
                  </div>
               )}
            </div>

            {/* CHRONIQUE DES INTERVENTIONS */}
            <div className="space-y-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tight">Chronique des Interventions</h2>
                  <div className="relative group w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input 
                      placeholder="Chercher une trace technique..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 rounded-2xl shadow-sm font-bold text-slate-600 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
               </div>

               {isLoading ? (
                  <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600 h-10 w-10" /></div>
               ) : filteredInterventions.length === 0 ? (
                  <div className="py-32 text-center bg-slate-50 dark:bg-white/5 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-white/10">
                    <HistoryIcon className="h-16 w-16 text-slate-200 dark:text-white/10 mx-auto mb-6" />
                    <p className="text-slate-400 font-black italic text-xl">Le registre est vierge pour le moment.</p>
                  </div>
               ) : (
                  <div className="space-y-10 relative before:absolute before:inset-0 before:left-[1.25rem] before:h-full before:w-1 before:bg-gradient-to-b before:from-indigo-500/50 before:to-transparent">
                    {filteredInterventions.map((item, index) => {
                      const estLieAUnContrat = contrats.some(c => c.fournisseur.toLowerCase() === item.entreprise.toLowerCase());
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                          key={item.id} 
                          className="relative pl-12 group"
                        >
                          {/* Noeud de Timeline */}
                          <div className="absolute left-0 top-6 w-10 h-10 -translate-x-1/2 rounded-full border-4 border-white dark:border-slate-950 bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 shadow-xl group-hover:scale-125 transition-transform duration-500 z-10">
                             <div className={`h-3 w-3 rounded-full ${
                                item.type_intervention === 'Urgence' ? 'bg-rose-500 animate-ping' : 
                                item.type_intervention === 'Rénovation' ? 'bg-amber-500' : 'bg-indigo-500'
                             }`} />
                          </div>

                          <Card className="rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white dark:bg-slate-900">
                            <CardContent className="p-0">
                               <div className="flex flex-col md:flex-row">
                                  <div className="p-8 flex-1 space-y-4">
                                     <div className="flex flex-wrap items-center gap-3">
                                        <Badge className="bg-indigo-600/10 text-indigo-600 border-none uppercase text-[9px] font-black tracking-[0.2em] px-4 py-1.5">
                                           {item.type_intervention}
                                        </Badge>
                                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                           <Calendar className="h-3 w-3" /> {format(new Date(item.date_intervention), 'dd MMMM yyyy', { locale: fr })}
                                        </div>
                                        {estLieAUnContrat && (
                                           <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[9px] font-black tracking-widest px-3 py-1">
                                              <ShieldCheck className="h-3 w-3 mr-1" /> Contrat Associé
                                           </Badge>
                                        )}
                                     </div>

                                     <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-tight group-hover:text-indigo-600 transition-colors">
                                           {item.titre}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-3 line-clamp-3 leading-relaxed">
                                           {item.description}
                                        </p>
                                     </div>

                                     <div className="pt-6 flex flex-wrap items-center gap-6 border-t border-slate-50 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                           <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                              <HardHat className="h-4 w-4" />
                                           </div>
                                           {item.entreprise}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                           <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                              <FileText className="h-4 w-4" />
                                           </div>
                                           Rapport Technique
                                        </div>
                                     </div>
                                  </div>
                                  
                                  <div className="bg-slate-50 dark:bg-white/5 p-8 flex flex-col justify-center items-center md:items-end md:min-w-[180px]">
                                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Montant Validé</p>
                                     <p className="text-3xl font-black text-slate-900 dark:text-white">{item.cout ? item.cout.toLocaleString() : '0'} €</p>
                                     <Button variant="ghost" size="sm" className="mt-6 group/btn text-[10px] font-black uppercase tracking-widest text-indigo-600 p-0 hover:bg-transparent">
                                        Détails complets <ArrowUpRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                     </Button>
                                  </div>
                               </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}