'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, ArrowLeft, Loader2, 
  Calendar, User, CheckCircle2,
  AlertTriangle, Info, Bell,
  Search, Heart, MessageSquare,
  Share2, Filter, MoreHorizontal,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';

interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  prioritaire: boolean;
  image_url?: string;
  created_at: string;
  categorie?: string;
  profiles: { prenom: string; nom: string; role: string } | null;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: Bell },
  { id: 'alerte', label: 'Urgences', icon: AlertTriangle, color: 'text-rose-500' },
  { id: 'info', label: 'Infos', icon: Info, color: 'text-indigo-500' },
  { id: 'maintenance', label: 'Travaux', icon: Loader2, color: 'text-amber-500' },
  { id: 'social', label: 'Vie Résidence', icon: Heart, color: 'text-emerald-500' },
];

export default function AnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();

  const loadAnnonces = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user.id).single();

      const { data, error } = await supabase
        .from('annonces')
        .select('*, profiles:auteur_id (prenom, nom, role)')
        .eq('copropriete_id', profile?.copropriete_id)
        .order('created_at', { ascending: false });

      if (!error && data) setAnnonces(data as unknown as Annonce[]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAnnonces();
  }, [loadAnnonces]);

  const filtered = useMemo(() => {
    return annonces.filter(a => {
      const matchesCategory = selectedCategory === 'all' || a.type === selectedCategory;
      const matchesSearch = a.titre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.contenu.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [annonces, selectedCategory, searchTerm]);

  const handleAction = (message: string) => {
    toast.success(message, {
      duration: 2000,
      position: 'bottom-center'
    });
  };

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* TACTICAL HERO - MISSION CONTROL STYLE */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="space-y-6 text-center lg:text-left flex-1">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10"
            >
               <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Direct Copropriété</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic"
            >
               Mur <br className="hidden lg:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Officiel</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 font-medium text-sm lg:text-xl max-w-xl leading-relaxed mx-auto lg:mx-0"
            >
               Restez informé en temps réel des communications vitales, travaux et événements de votre résidence.
            </motion.p>
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
             <div className="h-32 w-32 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                <Bell className="h-8 w-8 text-indigo-400 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alertes</p>
                <p className="text-xl font-black">{annonces.filter(a => a.prioritaire).length}</p>
             </div>
             <div className="h-32 w-32 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                <Megaphone className="h-8 w-8 text-blue-400 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                <p className="text-xl font-black">{annonces.length}</p>
             </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR STICKY */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-20 flex items-center gap-6">
          <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all ${
                  selectedCategory === cat.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <cat.icon className={`h-4 w-4 ${selectedCategory === cat.id ? 'text-white' : cat.color}`} />
                {cat.label}
              </button>
            ))}
          </div>
          
          <div className="hidden lg:flex items-center gap-3 w-72">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Chercher une annonce..." 
                className="pl-11 h-12 bg-slate-100 dark:bg-white/5 border-none rounded-2xl font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12 lg:py-20 space-y-12">
         {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
               <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Chargement du mur...</p>
            </div>
         ) : filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-16 lg:p-24 text-center border border-dashed border-slate-200 dark:border-white/10 shadow-sm"
            >
               <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 opacity-40" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Tout est en ordre</h3>
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Aucune communication importante pour le moment</p>
            </motion.div>
         ) : (
            <div className="space-y-12">
               <AnimatePresence mode="popLayout">
                  {filtered.map((post, idx) => (
                    <motion.div 
                      key={post.id}
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] lg:rounded-[3.5rem] border ${post.prioritaire ? 'border-rose-200 dark:border-rose-500/20 ring-4 ring-rose-500/5 shadow-2xl shadow-rose-500/10' : 'border-slate-100 dark:border-white/5 shadow-sm'} group hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500`}
                    >
                       {post.prioritaire && (
                         <div className="absolute top-0 right-0 p-8">
                           <div className="h-3 w-3 bg-rose-500 rounded-full animate-ping" />
                         </div>
                       )}

                       <div className="p-8 lg:p-14 space-y-8">
                          {/* Card Header */}
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                             <div className="flex items-center gap-4">
                                <div className={`h-16 w-16 rounded-[1.5rem] ${post.prioritaire ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'} flex items-center justify-center shadow-xl`}>
                                   <Megaphone className="h-7 w-7" />
                                </div>
                                <div>
                                   <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${post.prioritaire ? 'text-rose-500' : 'text-indigo-600'}`}>
                                         {post.prioritaire ? 'Urgent / Critique' : 'Communication Officielle'}
                                      </span>
                                   </div>
                                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-tighter">
                                      Publié par {post.profiles?.prenom} {post.profiles?.nom} • {post.profiles?.role}
                                   </h4>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-6 py-2.5 rounded-2xl border border-slate-100 dark:border-white/5">
                                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                                {format(new Date(post.created_at), 'dd MMM yyyy • HH:mm', { locale: fr })}
                             </div>
                          </div>

                          {/* Card Content */}
                          <div className="space-y-6">
                             <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.95]">
                                {post.titre}
                             </h2>
                             <p className="text-slate-600 dark:text-slate-400 font-medium text-lg lg:text-2xl leading-relaxed">
                                {post.contenu}
                             </p>
                          </div>

                          {post.image_url && (
                             <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden group/img cursor-zoom-in">
                                <Image src={post.image_url} alt={post.titre} fill className="object-cover group-hover/img:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                   <Button variant="secondary" size="sm" className="rounded-full font-black uppercase text-[10px] tracking-widest">Voir l&apos;image</Button>
                                </div>
                             </div>
                          )}

                          {/* Card Footer Actions */}
                          <div className="flex items-center justify-between pt-10 border-t border-slate-50 dark:border-white/5">
                             <div className="flex items-center gap-2 lg:gap-4">
                                <Button 
                                  variant="ghost" 
                                  className="h-14 px-8 rounded-2xl gap-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 font-black uppercase text-xs tracking-widest group"
                                  onClick={() => handleAction("Merci pour votre réaction !")}
                                >
                                   <Heart className="h-5 w-5 group-hover:fill-current" /> Merci
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="h-14 px-8 rounded-2xl gap-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 font-black uppercase text-xs tracking-widest"
                                  onClick={() => handleAction("Demande de précisions envoyée")}
                                >
                                   <MessageSquare className="h-5 w-5" /> Précisions
                                </Button>
                             </div>
                             
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-slate-400 hover:text-indigo-600" onClick={() => handleAction("Lien copié")}>
                                   <Share2 className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-slate-400 hover:text-indigo-600">
                                   <MoreHorizontal className="h-5 w-5" />
                                </Button>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </AnimatePresence>
            </div>
         )}
      </main>

    </div>
  );
}