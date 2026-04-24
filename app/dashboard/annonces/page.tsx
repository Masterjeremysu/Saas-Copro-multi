'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Megaphone, ArrowLeft, Loader2, 
  Calendar, User, CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  prioritaire: boolean;
  image_url?: string;
  created_at: string;
  profiles: { prenom: string; nom: string; role: string } | null;
}

export default function AnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        .eq('type', 'alerte')
        .order('created_at', { ascending: false });

      if (!error && data) setAnnonces(data as unknown as Annonce[]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAnnonces();
  }, [loadAnnonces]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] lg:p-10 animate-in fade-in duration-500 pb-32 lg:pb-20">
      
      {/* HEADER MOBILE COMPACT */}
      <div className="max-w-5xl mx-auto mb-6 lg:mb-10">
         <div className="flex items-center gap-4 lg:gap-6 px-4 lg:px-0 pt-4 lg:pt-0">
            <Link href="/dashboard" className="h-10 w-10 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
               <ArrowLeft className="h-4 w-4 lg:h-6 lg:w-6" />
            </Link>
            <div>
               <h1 className="text-xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2 lg:gap-4 italic leading-none">
                  <Megaphone className="h-6 w-6 lg:h-10 lg:w-10 text-indigo-600" /> Le Mur Officiel
               </h1>
               <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] lg:tracking-[0.3em] mt-1">Communications du Syndic</p>
            </div>
         </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-4 lg:space-y-6 px-4 lg:px-0">
         {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>
         ) : annonces.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[3rem] p-12 lg:p-20 text-center border border-dashed border-slate-200 dark:border-white/10 shadow-sm">
               <CheckCircle2 className="h-12 w-12 lg:h-16 lg:w-16 text-emerald-500 mx-auto mb-4 opacity-20" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Aucune communication pour le moment</p>
            </div>
         ) : (
            annonces.map((post, idx) => (
               <motion.div 
                 key={post.id}
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: idx * 0.1 }}
                 className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-[1.5rem] lg:rounded-[2.5rem] border ${post.prioritaire ? 'border-rose-200 dark:border-rose-900/30' : 'border-slate-100 dark:border-white/5'} shadow-sm group hover:shadow-xl transition-all duration-500`}
               >
                  {post.prioritaire && <div className="absolute top-0 left-0 w-1.5 lg:w-2 h-full bg-rose-500" />}
                  
                  <div className="p-6 lg:p-10 flex flex-col lg:flex-row gap-6 lg:gap-8">
                     <div className="flex-1 space-y-4 lg:space-y-6">
                        <div className="flex items-center gap-2 lg:gap-3">
                           <Badge className={`text-xs ${post.prioritaire ? 'bg-rose-500' : 'bg-indigo-500'} text-white`}>
                              {post.prioritaire ? 'URGENT' : 'INFO'}
                           </Badge>
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                              {format(new Date(post.created_at), 'dd MMM yyyy', { locale: fr })}
                           </span>
                        </div>
                        
                        <div className="space-y-2 lg:space-y-4">
                           <h2 className="text-lg lg:text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
                              {post.titre}
                           </h2>
                           <p className="text-slate-600 dark:text-slate-400 font-medium text-sm lg:text-lg leading-relaxed">
                              {post.contenu}
                           </p>
                        </div>

                        {post.image_url && (
                           <div className="relative h-48 lg:h-80 w-full rounded-xl lg:rounded-2xl overflow-hidden mt-4">
                              <Image src={post.image_url} alt={post.titre} fill className="object-cover" />
                           </div>
                        )}

                        <div className="flex flex-wrap gap-4 lg:gap-6 pt-4 border-t border-slate-50 dark:border-white/5">
                           <div className="flex items-center gap-1.5 lg:gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                              <User className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> {post.profiles?.prenom} {post.profiles?.nom}
                           </div>
                           <div className="flex items-center gap-1.5 lg:gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                              <Calendar className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> {format(new Date(post.created_at), 'HH:mm', { locale: fr })}
                           </div>
                        </div>
                     </div>
                     
                     <div className="hidden lg:flex lg:w-48 items-center justify-center">
                        <div className="h-32 w-32 rounded-[2rem] bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:rotate-6 transition-transform duration-500">
                           <Megaphone className={`h-12 w-12 ${post.prioritaire ? 'text-rose-500' : 'text-indigo-600'}`} />
                        </div>
                     </div>
                  </div>
               </motion.div>
            ))
         )}
      </div>

    </div>
  );
}