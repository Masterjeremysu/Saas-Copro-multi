'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, Phone, Mail, Pencil, Trash2, 
  Loader2, Building2, FileText,
  TrendingUp, AlertCircle, ShieldCheck,
  ArrowUpRight, Zap, Droplets,
  Wrench, Shield, Plus,
  Activity, Calendar, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AddContractModal } from './add-contract-modal';
import { logAction } from '@/utils/audit';
import { useMemo, useCallback } from 'react';

interface Contract {
  id: string;
  fournisseur: string;
  service: string;
  montant_annuel: number | string;
  date_debut: string;
  date_fin: string;
  contact_nom?: string;
  contact_telephone?: string;
  contact_email?: string;
  notes?: string;
  deleted_at?: string | null;
}

export default function ContratsPage() {
  const [contrats, setContrats] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // États pour les actions
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClient();

  const fetchContrats = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contrats')
      .select('*')
      .is('deleted_at', null) // On cache la corbeille
      .order('date_fin', { ascending: true });

    if (error) toast.error("Erreur de chargement");
    else setContrats((data as Contract[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchContrats(); }, [fetchContrats]);

  const handleAction = (message: string) => {
    toast.info(message, {
      description: "Action simulée pour la démonstration premium.",
      icon: <Activity className="h-4 w-4" />
    });
  };

  // --- ACTION 1 : SOFT DELETE ---
  const handleSoftDelete = async (id: string, fournisseur: string) => {
    if (!window.confirm(`Mettre le contrat "${fournisseur}" à la corbeille ?`)) return;
    
    setIsDeleting(id);
    const tid = toast.loading("Archivage en cours...");
    try {
      const { error } = await supabase.from('contrats').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'CONTRACT_SOFT_DELETE',
        resourceType: 'contrats',
        resourceId: id,
        details: `Contrat archivé : ${fournisseur}`,
        severity: 'warning'
      });

      toast.success("Contrat mis à la corbeille", { id: tid });
      fetchContrats();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message, { id: tid });
    } finally {
      setIsDeleting(null);
    }
  };

  // --- ACTION 2 : MISE À JOUR (EDIT) ---
  const handleUpdate = async () => {
    if (!editContract) return;
    setIsUpdating(true);
    const tid = toast.loading("Mise à jour...");

    try {
      const { error } = await supabase
        .from('contrats')
        .update({
          fournisseur: editContract.fournisseur,
          service: editContract.service,
          montant_annuel: parseFloat(String(editContract.montant_annuel)) || 0,
          date_debut: editContract.date_debut,
          date_fin: editContract.date_fin,
          contact_nom: editContract.contact_nom,
          contact_telephone: editContract.contact_telephone,
          contact_email: editContract.contact_email,
          notes: editContract.notes
        })
        .eq('id', editContract.id);

      if (error) throw error;

      await logAction({
        action: 'CONTRACT_UPDATE',
        resourceType: 'contrats',
        resourceId: editContract.id,
        details: `Mise à jour du contrat : ${editContract.fournisseur}`,
        severity: 'info'
      });

      toast.success("Contrat mis à jour", { id: tid });
      setEditContract(null);
      fetchContrats();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message, { id: tid });
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtrage
  const filteredContrats = useMemo(() => {
    return contrats.filter(c => {
      const matchesSearch = c.fournisseur?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.service?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
                             (selectedCategory === 'expiring' && differenceInDays(new Date(c.date_fin), new Date()) <= 90) ||
                             (selectedCategory === 'active' && differenceInDays(new Date(c.date_fin), new Date()) >= 0);
      return matchesSearch && matchesCategory;
    });
  }, [contrats, searchTerm, selectedCategory]);

  const getCategoryIcon = (service: string) => {
    const s = service?.toLowerCase();
    if (s?.includes('elec') || s?.includes('ener')) return <Zap className="h-6 w-6" />;
    if (s?.includes('eau') || s?.includes('plomb')) return <Droplets className="h-6 w-6" />;
    if (s?.includes('asc') || s?.includes('tech')) return <Activity className="h-6 w-6" />;
    if (s?.includes('assu')) return <Shield className="h-6 w-6" />;
    if (s?.includes('menag') || s?.includes('prop')) return <Plus className="h-6 w-6" />;
    return <Wrench className="h-6 w-6" />;
  };

  const getHealthColor = (dateFin: string) => {
    const days = differenceInDays(new Date(dateFin), new Date());
    if (days < 0) return 'bg-rose-500';
    if (days < 90) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // KPIs
  const actifs = contrats.filter(c => differenceInDays(new Date(c.date_fin), new Date()) >= 0);
  const budgetActif = actifs.reduce((acc, curr) => acc + (Number(curr.montant_annuel) || 0), 0);
  const enAlerte = actifs.filter(c => differenceInDays(new Date(c.date_fin), new Date()) <= 90).length;

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* TACTICAL HERO - MISSION CONTROL STYLE */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
           <div className="space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10"
              >
                 <ShieldCheck className="h-4 w-4 text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Gouvernance Contractuelle</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic pr-10"
              >
                Pilotage <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Fournisseurs</span>
              </motion.h1>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap justify-center lg:justify-start gap-4 lg:gap-10"
              >
                 <div className="text-center lg:text-left">
                    <p className="text-3xl lg:text-5xl font-black text-white">{budgetActif.toLocaleString('fr-FR')} €</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Budget Annuel Actif</p>
                 </div>
                 <div className="w-px h-12 bg-white/10 hidden lg:block" />
                 <div className="text-center lg:text-left">
                    <p className="text-3xl lg:text-5xl font-black text-rose-500">{enAlerte}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Contrats en Alerte</p>
                 </div>
              </motion.div>
           </div>

           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="hidden lg:block relative"
           >
              <div className="relative bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl">
                 <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 italic">
                    <TrendingUp className="text-indigo-400 h-6 w-6" /> Répartition Budget
                 </h3>
                 <div className="space-y-5">
                    {['Énergie', 'Maintenance', 'Assurance', 'Services'].map((item, i) => (
                       <div key={item} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             <span>{item}</span>
                             <span>{25 + i * 5}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${25 + i * 5}%` }}
                               transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                               className="h-full bg-gradient-to-r from-indigo-500 to-blue-400" 
                             />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </motion.div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 min-h-[5rem] py-3 flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-8">
          <div className="flex-1 flex items-center gap-2 lg:gap-3 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: 'Tous', icon: Building2 },
              { id: 'active', label: 'Actifs', icon: ShieldCheck },
              { id: 'expiring', label: 'Urgents', icon: AlertCircle },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  selectedCategory === cat.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:gap-3 ml-auto lg:ml-0">
             <div className="relative hidden xl:block w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Chercher..." 
                  className="pl-11 h-11 bg-slate-100 dark:bg-white/5 border-none rounded-xl font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <AddContractModal onRefresh={fetchContrats} />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
         {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
               <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Chargement des contrats...</p>
            </div>
         ) : filteredContrats.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border border-dashed border-slate-200 dark:border-white/10 shadow-sm">
               <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4 opacity-20" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Aucun contrat trouvé</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
               <AnimatePresence mode="popLayout">
                  {filteredContrats.map((contrat, idx) => {
                    const daysLeft = differenceInDays(new Date(contrat.date_fin), new Date());
                    const isExpired = daysLeft < 0;
                    const healthColor = getHealthColor(contrat.date_fin);

                    return (
                      <motion.div
                        key={contrat.id}
                        layout
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500 overflow-hidden"
                      >
                         {/* Health Indicator */}
                         <div className={`absolute top-0 left-0 right-0 h-1.5 ${healthColor} opacity-50`} />

                         <div className="p-8 lg:p-10 space-y-8">
                            {/* Card Header */}
                            <div className="flex items-start justify-between">
                               <div className="flex items-center gap-5">
                                  <div className={`h-16 w-16 rounded-3xl ${isExpired ? 'bg-rose-500' : 'bg-indigo-600'} text-white flex items-center justify-center shadow-lg shadow-indigo-600/20`}>
                                     {getCategoryIcon(contrat.service)}
                                  </div>
                                  <div>
                                     <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                                        {contrat.fournisseur}
                                     </h3>
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {contrat.service}
                                     </p>
                                  </div>
                               </div>
                               <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 text-slate-300 hover:text-indigo-600" onClick={() => setViewContract(contrat)}>
                                  <ArrowUpRight className="h-6 w-6" />
                                </Button>
                            </div>

                            {/* Financials */}
                            <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                               <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Budget Annuel</p>
                                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                                     {Number(contrat.montant_annuel).toLocaleString('fr-FR')} €
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Statut</p>
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isExpired ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                     {isExpired ? 'Expiré' : 'Actif'}
                                  </div>
                               </div>
                            </div>

                            {/* Timeline Info */}
                            <div className="space-y-4">
                               <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                                  <div className="flex items-center gap-2">
                                     <Calendar className="h-4 w-4 text-indigo-400" />
                                     Échéance : {format(new Date(contrat.date_fin), 'dd MMM yyyy', { locale: fr })}
                                  </div>
                                  <span className={isExpired ? 'text-rose-500' : 'text-indigo-600'}>
                                     {isExpired ? `Retard ${Math.abs(daysLeft)}j` : `${daysLeft} jours`}
                                  </span>
                               </div>
                               <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(0, Math.min(100, (daysLeft / 365) * 100))}%` }}
                                    className={`h-full ${healthColor}`}
                                  />
                               </div>
                            </div>

                            {/* Tactical Action Footer */}
                            <div className="flex flex-wrap items-center justify-between pt-6 gap-y-4 border-t border-slate-50 dark:border-white/5">
                               
                               {/* Left: Contact Identity */}
                               <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex items-center -space-x-3 shrink-0">
                                     <div className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center border-2 lg:border-4 border-white dark:border-slate-900 text-white font-black text-xs shadow-xl z-10">
                                        {contrat.contact_nom?.charAt(0) || 'F'}
                                     </div>
                                     <div className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 lg:border-4 border-white dark:border-slate-900 text-slate-400 shadow-lg">
                                        <User className="h-4 w-4 lg:h-5 lg:w-5" />
                                     </div>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Responsable</span>
                                     <span className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white leading-none truncate">
                                        {contrat.contact_nom || 'Non assigné'}
                                     </span>
                                  </div>
                               </div>
                               
                               {/* Right: Tactical Buttons */}
                               <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                  {/* Contact Group */}
                                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                     <button 
                                       disabled={!contrat.contact_telephone}
                                       onClick={() => handleAction("Ouverture de l'application Téléphone")}
                                       className={`group flex flex-col items-center justify-center h-11 w-11 lg:h-12 lg:w-12 rounded-xl transition-all ${
                                          contrat.contact_telephone 
                                          ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm hover:bg-emerald-500 hover:text-white' 
                                          : 'opacity-30 grayscale cursor-not-allowed'
                                       }`}
                                     >
                                        <Phone className="h-4 w-4 lg:h-5 lg:w-5" />
                                        <span className="text-[7px] font-black mt-1 opacity-0 group-hover:opacity-100 transition-opacity">APPEL</span>
                                     </button>
                                     <button 
                                       disabled={!contrat.contact_email}
                                       onClick={() => handleAction("Préparation de l'email...")}
                                       className={`group flex flex-col items-center justify-center h-11 w-11 lg:h-12 lg:w-12 rounded-xl transition-all ${
                                          contrat.contact_email 
                                          ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-sm hover:bg-indigo-500 hover:text-white' 
                                          : 'opacity-30 grayscale cursor-not-allowed'
                                       }`}
                                     >
                                        <Mail className="h-4 w-4 lg:h-5 lg:w-5" />
                                        <span className="text-[7px] font-black mt-1 opacity-0 group-hover:opacity-100 transition-opacity">MAIL</span>
                                     </button>
                                  </div>
 
                                  {/* Management Group */}
                                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                     <button 
                                       onClick={() => setEditContract(contrat)}
                                       className="group flex flex-col items-center justify-center h-11 w-11 lg:h-12 lg:w-12 rounded-xl bg-white dark:bg-slate-800 text-amber-500 shadow-sm hover:bg-amber-500 hover:text-white transition-all"
                                     >
                                        <Pencil className="h-4 w-4 lg:h-5 lg:w-5" />
                                        <span className="text-[7px] font-black mt-1 opacity-0 group-hover:opacity-100 transition-opacity">EDIT</span>
                                     </button>
                                     <button 
                                       disabled={isDeleting === contrat.id}
                                       onClick={() => handleSoftDelete(contrat.id, contrat.fournisseur)}
                                       className="group flex flex-col items-center justify-center h-11 w-11 lg:h-12 lg:w-12 rounded-xl bg-white dark:bg-slate-800 text-rose-500 shadow-sm hover:bg-rose-500 hover:text-white transition-all"
                                     >
                                        {isDeleting === contrat.id ? <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" /> : <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />}
                                        <span className="text-[7px] font-black mt-1 opacity-0 group-hover:opacity-100 transition-opacity">SUPPR</span>
                                     </button>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    );
                  })}
               </AnimatePresence>
            </div>
         )}
      </main>

      {/* --- MODALE : VOIR LES DÉTAILS --- */}
      <Dialog open={!!viewContract} onOpenChange={() => setViewContract(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl bg-white p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Building2 className="text-indigo-600 h-6 w-6" />
              {viewContract?.fournisseur}
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500 uppercase tracking-widest text-xs">
              {viewContract?.service}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant Annuel</span>
                <span className="text-lg font-black text-slate-900">{Number(viewContract?.montant_annuel).toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Échéance</span>
                <span className="text-sm font-bold text-slate-900">{viewContract && format(new Date(viewContract.date_fin), 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informations de contact</p>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">{viewContract?.contact_nom || 'Non spécifié'}</p>
                <p className="text-sm text-slate-600 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {viewContract?.contact_telephone || '---'}</p>
                <p className="text-sm text-slate-600 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {viewContract?.contact_email || '---'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes internes</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl leading-relaxed italic border border-slate-100">
                {viewContract?.notes || "Aucune note ajoutée pour ce contrat."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODALE : MODIFIER LE CONTRAT --- */}
      <Dialog open={!!editContract} onOpenChange={(open) => !open && setEditContract(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-none shadow-2xl bg-white p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Modifier le contrat</DialogTitle>
          </DialogHeader>
          
          {editContract && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Fournisseur</Label>
                <Input value={editContract.fournisseur} onChange={e => setEditContract({...editContract, fournisseur: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Service</Label>
                <Input value={editContract.service} onChange={e => setEditContract({...editContract, service: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Date de fin</Label>
                <Input type="date" value={editContract.date_fin} onChange={e => setEditContract({...editContract, date_fin: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Montant Annuel (€)</Label>
                <Input type="number" value={editContract.montant_annuel} onChange={e => setEditContract({...editContract, montant_annuel: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              
              <div className="col-span-2 mt-2 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-4">Contacts & Notes</p>
              </div>
              
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Nom du contact</Label>
                <Input value={editContract.contact_nom || ''} onChange={e => setEditContract({...editContract, contact_nom: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Téléphone</Label>
                <Input value={editContract.contact_telephone || ''} onChange={e => setEditContract({...editContract, contact_telephone: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Email</Label>
                <Input value={editContract.contact_email || ''} onChange={e => setEditContract({...editContract, contact_email: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Notes (Visibles dans le tableau)</Label>
                <Input value={editContract.notes || ''} onChange={e => setEditContract({...editContract, notes: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
            </div>
          )}

          <DialogFooter className="mt-8">
            <Button variant="outline" onClick={() => setEditContract(null)} className="h-12 rounded-xl border-slate-200">Annuler</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm">
              {isUpdating ? <Loader2 className="animate-spin h-5 w-5" /> : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}