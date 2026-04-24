'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  AlertTriangle, Info, Heart, 
  Handshake, MoreHorizontal, 
  ArrowLeft, Loader2,
  Share2, MessageCircle,
  Image as ImageIcon,
  X, Plus, Send,
  Pin, Trash2, CheckCircle,
  Megaphone, ShoppingBag, Wrench,
  DollarSign, MapPin, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { notifyCopropriete } from '@/utils/notification-service';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

// --- TYPES STRICTS ---
interface ProfileData {
  prenom: string;
  nom: string;
  role: string;
}

interface Commentaire {
  id: string;
  contenu: string;
  created_at: string;
  auteur_id: string;
  profiles: { prenom: string; nom: string } | null;
}

interface AnnonceMetadata {
  price?: string;
  location?: string;
}

interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  prioritaire: boolean;
  is_pinned?: boolean;
  image_url?: string;
  metadata?: AnnonceMetadata;
  created_at: string;
  auteur_id: string;
  profiles: ProfileData | null;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  user_reacted: boolean;
}

const TYPES = [
  { id: 'info', label: 'Information', icon: <Info className="h-4 w-4" />, color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-600', keywords: ['info', 'avis', 'note', 'réunion'] },
  { id: 'alerte', label: 'Alerte / Vigilance', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-rose-600', lightColor: 'bg-rose-50 text-rose-600', keywords: ['fuite', 'panne', 'danger', 'vol', 'bruit', 'ascenseur'] },
  { id: 'social', label: 'Vie Sociale', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-500', lightColor: 'bg-pink-50 text-pink-600', keywords: ['apéro', 'fête', 'voisin', 'café', 'rencontre'] },
  { id: 'entraide', label: 'Entraide', icon: <Handshake className="h-4 w-4" />, color: 'bg-amber-500', lightColor: 'bg-amber-50 text-amber-600', keywords: ['aide', 'service', 'outil', 'besoin', 'prêt'] },
  { id: 'market', label: 'Marketplace', icon: <ShoppingBag className="h-4 w-4" />, color: 'bg-emerald-500', lightColor: 'bg-emerald-50 text-emerald-600', keywords: ['vends', 'donne', 'prix', 'occasion', 'cherche'] },
];

export default function CommunautePage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [showPostBox, setShowPostBox] = useState(false);
  
  const [newPost, setNewPost] = useState({ 
    titre: '', 
    contenu: '', 
    type: 'info',
    price: '',
    location: '',
    image: null as File | null,
    previewUrl: ''
  });
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [aiSuggested, setAiSuggested] = useState(false);

  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (newPost.titre.length > 3 && !aiSuggested) {
      const lowerTitre = newPost.titre.toLowerCase();
      const suggested = TYPES.find(t => t.keywords.some(k => lowerTitre.includes(k)));
      if (suggested && suggested.id !== newPost.type) {
        setNewPost(prev => ({ ...prev, type: suggested.id }));
        setAiSuggested(true);
        toast.info(`Catégorie suggérée : ${suggested.label}`, { icon: <Sparkles className="h-4 w-4 text-amber-500" /> });
      }
    }
  }, [newPost.titre, aiSuggested, newPost.type]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPost(prev => ({ 
        ...prev, 
        image: file, 
        previewUrl: URL.createObjectURL(file) 
      }));
    }
  };

  const loadAnnonces = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    
    const { data: profile } = await supabase.from('profiles').select('copropriete_id, role').eq('id', user.id).single();
    if (profile) setCurrentUserRole(profile.role);

    const { data, error } = await supabase
      .from('annonces')
      .select('*, profiles:auteur_id (prenom, nom, role)')
      .eq('copropriete_id', profile?.copropriete_id)
      .order('is_pinned', { ascending: false })
      .order('prioritaire', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setAnnonces(data as unknown as Annonce[]);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { loadAnnonces(); }, [loadAnnonces]);

  const handlePost = async () => {
    if (!newPost.titre || !newPost.contenu) {
      toast.error("Veuillez remplir le titre et le contenu.");
      return;
    }
    setIsPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user.id).single();

      let imageUrl = '';
      if (newPost.image) {
        const fileExt = newPost.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('communaute')
          .upload(fileName, newPost.image);
        
        if (uploadError) {
           console.error("Storage Error:", uploadError);
           throw new Error("Erreur de stockage : Vérifiez que le bucket 'communaute' existe dans Supabase.");
        }

        const { data: { publicUrl } } = supabase.storage.from('communaute').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('annonces').insert({
        copropriete_id: profile?.copropriete_id,
        auteur_id: user.id,
        titre: newPost.titre,
        contenu: newPost.contenu,
        type: newPost.type,
        prioritaire: newPost.type === 'alerte',
        image_url: imageUrl,
        metadata: {
          price: newPost.price,
          location: newPost.location
        }
      });

      if (error) throw error;

      // Notification automatique
      if (newPost.type === 'alerte') {
        await notifyCopropriete({
          coproprieteId: profile?.copropriete_id,
          titre: `🚨 Alerte Résidence`,
          message: `"${newPost.titre}" — Consultez la communauté.`,
          lien: '/dashboard/communaute',
          type: 'annonce'
        });
      }

      toast.success("Publication réussie !");
      setNewPost({ titre: '', contenu: '', type: 'info', price: '', location: '', image: null, previewUrl: '' });
      setShowPostBox(false);
      setAiSuggested(false);
      loadAnnonces();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la publication";
      toast.error(message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] animate-in fade-in duration-500 pb-20">
      
      {/* HEADER PREMIUM */}
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-[#020617]/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-white/5 p-4 lg:p-6 shadow-sm">
         <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:gap-6">
               <Link href="/dashboard" className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all shadow-sm">
                  <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
               </Link>
            <div>
               <h1 className="text-lg lg:text-2xl font-black tracking-tighter text-slate-900 dark:text-white italic leading-none">Communauté</h1>
               <p className="hidden sm:flex text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 items-center gap-2">
                 <Sparkles className="h-3 w-3 text-indigo-500" /> Espace Intelligent
               </p>
            </div>
            </div>
            <Button 
              onClick={() => setShowPostBox(!showPostBox)}
              className="h-10 lg:h-12 px-4 lg:px-6 rounded-xl lg:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all active:scale-95"
            >
               {showPostBox ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
               {showPostBox ? "ANNULER" : "PUBLIER"}
            </Button>
         </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 mt-6 lg:mt-8">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLONNE GAUCHE : FLUX */}
            <div className="lg:col-span-8 space-y-4 lg:space-y-8">
               <AnimatePresence>
                  {showPostBox && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.98 }}
                      className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-10 border-2 border-indigo-500/20 shadow-2xl space-y-6 lg:space-y-8"
                    >
                       <div className="space-y-6 lg:space-y-8">
                          <div className="relative">
                            <Input 
                              placeholder="Quel est le sujet ?" 
                              value={newPost.titre}
                              onChange={e => setNewPost({...newPost, titre: e.target.value})}
                              className="h-14 lg:h-16 rounded-xl lg:rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-black text-lg lg:text-2xl placeholder:text-slate-300 pr-12"
                            />
                            {aiSuggested && <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 lg:h-6 lg:w-6 text-indigo-500 animate-pulse" />}
                          </div>

                          <div className="flex flex-wrap gap-2">
                             {TYPES.map(t => (
                               <button
                                 key={t.id}
                                 onClick={() => { setNewPost({...newPost, type: t.id}); setAiSuggested(false); }}
                                 className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg lg:rounded-xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 ${newPost.type === t.id ? `${t.color} text-white shadow-lg` : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100'}`}
                               >
                                  {t.icon} {t.label}
                                </button>
                             ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {newPost.type === 'market' && (
                               <div className="relative animate-in slide-in-from-left-4 duration-500">
                                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                  <Input 
                                    placeholder="Prix souhaité (€)" 
                                    value={newPost.price}
                                    onChange={e => setNewPost({...newPost, price: e.target.value})}
                                    className="h-12 lg:h-14 pl-12 rounded-xl lg:rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                                  />
                               </div>
                             )}
                             {(newPost.type === 'alerte' || newPost.type === 'entraide') && (
                               <div className="relative animate-in slide-in-from-left-4 duration-500">
                                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-500" />
                                  <Input 
                                    placeholder="Localisation" 
                                    value={newPost.location}
                                    onChange={e => setNewPost({...newPost, location: e.target.value})}
                                    className="h-12 lg:h-14 pl-12 rounded-xl lg:rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                                  />
                               </div>
                             )}
                          </div>

                          <Textarea 
                            placeholder="Développez votre message..." 
                            value={newPost.contenu}
                            onChange={e => setNewPost({...newPost, contenu: e.target.value})}
                            className="min-h-[120px] lg:min-h-[150px] rounded-xl lg:rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-medium text-base lg:text-lg p-4 lg:p-6 focus:ring-2 focus:ring-indigo-600 transition-all"
                          />

                          {newPost.previewUrl && (
                             <div className="relative h-40 lg:h-48 w-full rounded-2xl lg:rounded-3xl overflow-hidden border-4 border-white shadow-xl animate-in zoom-in-95 duration-500">
                                <Image src={newPost.previewUrl} alt="Preview" fill className="object-cover" />
                                <button 
                                  onClick={() => setNewPost(prev => ({...prev, image: null, previewUrl: ''}))}
                                  className="absolute top-4 right-4 h-8 w-8 lg:h-10 lg:w-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-all z-10"
                                >
                                   <X className="h-4 w-4" />
                                </button>
                             </div>
                          )}

                          <div className="flex items-center justify-between pt-4 lg:pt-6 border-t border-slate-50 dark:border-white/5">
                             <div className="flex items-center gap-3">
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                                <Button 
                                  onClick={() => fileInputRef.current?.click()}
                                  variant="ghost" className="h-12 lg:h-14 px-4 lg:px-6 rounded-xl lg:rounded-2xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 font-bold flex items-center gap-2"
                                >
                                   <ImageIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                                   <span className="hidden sm:inline text-xs lg:text-sm">PHOTO</span>
                                </Button>
                             </div>
                             <Button 
                               onClick={handlePost}
                               disabled={isPosting}
                               className="h-14 lg:h-16 px-8 lg:px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl lg:rounded-[1.5rem] font-black text-sm lg:text-base shadow-2xl shadow-indigo-600/30 transition-all active:scale-95"
                             >
                                {isPosting ? <Loader2 className="h-5 w-5 lg:h-6 lg:w-6 animate-spin" /> : "PUBLIER"}
                             </Button>
                          </div>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>

               <div className="space-y-4 lg:space-y-6">
                  {isLoading ? (
                     [1,2,3].map(i => <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[3rem] animate-pulse" />)
                  ) : (
                     annonces.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          currentUser={{ id: currentUserId, role: currentUserRole }} 
                          refresh={loadAnnonces}
                        />
                     ))
                  )}
               </div>
            </div>

            {/* COLONNE DROITE : WIDGETS */}
            <div className="lg:col-span-4 space-y-6 sticky top-32 hidden lg:block">
               <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/30 blur-3xl"></div>
                  <div className="relative z-10 space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                           <Megaphone className="h-5 w-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Canal Officiel</p>
                     </div>
                     <p className="text-lg font-black tracking-tighter italic leading-snug">&quot;Votre résidence, votre communauté.&quot;</p>
                  </div>
               </div>
               <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activité IA</h3>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">Sujets chauds</span>
                        <Badge className="bg-amber-50 text-amber-600 border-none">Maintenance</Badge>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">Tendance</span>
                        <Badge className="bg-indigo-50 text-indigo-600 border-none">Solidarité</Badge>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
}

// --- COMPOSANT POST CARD ---
function PostCard({ post, currentUser, refresh }: { post: Annonce, currentUser: { id: string | null, role: string | null }, refresh: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [comments, setComments] = useState<Commentaire[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [reactions, setReactions] = useState<ReactionGroup[]>([]);
  
  const supabase = createClient();
  const router = useRouter();
  const type = TYPES.find(t => t.id === post.type) || TYPES[0];
  const isAuthor = currentUser.id === post.auteur_id;
  const isAdmin = currentUser.role === 'administrateur' || currentUser.role === 'syndic';

  const loadInteractions = useCallback(async () => {
    const { data: comms } = await supabase
      .from('communaute_commentaires')
      .select('*, profiles(prenom, nom)')
      .eq('annonce_id', post.id)
      .order('created_at', { ascending: true });
    
    if (comms) setComments(comms as unknown as Commentaire[]);

    const { data: reactionData } = await supabase
      .from('communaute_reactions')
      .select('emoji, user_id')
      .eq('annonce_id', post.id);

    if (reactionData) {
       const grouped = (reactionData as {emoji: string}[]).reduce((acc: Record<string, number>, r) => {
          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
          return acc;
       }, {});
       setReactions(Object.keys(grouped).map(e => ({ emoji: e, count: grouped[e], user_reacted: false })));
    }
  }, [supabase, post.id]);

  const toggleComments = () => {
    const nextState = !showComments;
    setShowComments(nextState);
    if (nextState) loadInteractions();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('communaute_commentaires').insert({
      annonce_id: post.id,
      auteur_id: user?.id,
      contenu: newComment
    });

    if (!error) {
      setNewComment('');
      loadInteractions();
      toast.success("Réponse publiée !");
    }
    setIsSubmittingComment(false);
  };

  const handleReact = async (emoji: string) => {
     const { data: { user } } = await supabase.auth.getUser();
     await supabase.from('communaute_reactions').upsert({
        annonce_id: post.id,
        user_id: user?.id,
        emoji: emoji
     });
     setShowReactions(false);
     loadInteractions();
  };

  const handleDelete = async () => {
     if (confirm("Voulez-vous supprimer ce message ?")) {
        const { error } = await supabase.from('annonces').delete().eq('id', post.id);
        if (!error) {
           toast.success("Message supprimé.");
           refresh();
        }
     }
  };

  const handlePin = async () => {
     const { error } = await supabase.from('annonces').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
     if (!error) {
        toast.success(post.is_pinned ? "Message désépinglé" : "Message épinglé en haut !");
        refresh();
     }
  };

  const handleCreateTicket = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;
     const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user.id).single();

     const { data: ticket, error } = await supabase.from('tickets').insert({
        copropriete_id: profile?.copropriete_id,
        titre: `[Signalement] ${post.titre}`,
        description: `Signalement créé depuis la communauté.\n\nContenu original :\n${post.contenu}`,
        statut: 'ouvert',
        urgence: post.prioritaire ? 'critique' : 'normale',
        auteur_id: user.id,
     }).select('id').single();

     if (!error && ticket) {
        toast.success("Ticket créé ! Redirection...");
        router.push(`/dashboard/tickets/${ticket.id}`);
     } else {
        toast.error("Erreur lors de la création du ticket.");
     }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[3rem] shadow-sm hover:shadow-xl transition-all duration-500 border ${post.is_pinned ? 'border-indigo-500 border-2' : 'border-slate-100 dark:border-white/5'} overflow-hidden`}
    >
       {post.is_pinned && (
          <div className="bg-indigo-500 text-white px-4 lg:px-6 py-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
             <Pin className="h-3 w-3" /> Épinglé par le Syndic
          </div>
       )}
       
       <div className="p-6 lg:p-10 space-y-6 lg:space-y-8">
          
          {/* HEADER : USER & ACTIONS */}
          <div className="flex justify-between items-start gap-4">
             <div className="flex items-center gap-3 lg:gap-4">
                <div className="h-10 w-10 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg relative shrink-0">
                   {post.profiles?.prenom?.[0]}{post.profiles?.nom?.[0]}
                </div>
                <div className="min-w-0">
                   <h4 className="text-sm lg:text-base font-black text-slate-900 dark:text-white leading-tight flex items-center gap-2 truncate">
                      <span className="truncate">{post.profiles?.prenom} {post.profiles?.nom}</span>
                      {post.profiles?.role === 'administrateur' && <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-indigo-500 shrink-0" />}
                   </h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                   </p>
                </div>
             </div>
             
             <div className="flex items-center gap-2 shrink-0">
                <div className={`px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl ${type.lightColor} text-[10px] lg:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 lg:gap-2 shadow-sm`}>
                   {type.icon} <span className="hidden sm:inline">{type.label}</span>
                </div>
                
                <div className="relative group/menu">
                   <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl text-slate-300 hover:text-indigo-600">
                      <MoreHorizontal className="h-4 w-4 lg:h-5 lg:w-5" />
                   </Button>
                   <div className="absolute right-0 top-full mt-2 w-48 lg:w-56 bg-white dark:bg-slate-800 rounded-xl lg:rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 hidden group-hover/menu:block p-2 z-50 animate-in fade-in zoom-in-95">
                      {isAdmin && (
                         <button onClick={handlePin} className="w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg lg:rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[10px] lg:text-xs font-black uppercase tracking-widest text-indigo-600 transition-colors">
                            <Pin className="h-4 w-4" /> {post.is_pinned ? 'Désépingler' : 'Épingler'}
                         </button>
                      )}
                      <button onClick={handleCreateTicket} className="w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg lg:rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-[10px] lg:text-xs font-black uppercase tracking-widest text-amber-600 transition-colors">
                         <Wrench className="h-4 w-4" /> Créer un Ticket
                      </button>
                      {(isAuthor || isAdmin) && (
                        <button onClick={handleDelete} className="w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg lg:rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[10px] lg:text-xs font-black uppercase tracking-widest text-rose-500 transition-colors">
                           <Trash2 className="h-4 w-4" /> Supprimer
                        </button>
                      )}
                   </div>
                </div>
             </div>
          </div>

          {/* CONTENT */}
          <div className="space-y-4">
             <h3 className={`text-xl lg:text-3xl font-black tracking-tighter leading-tight ${post.prioritaire ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {post.prioritaire && "🚨 "}{post.titre}
             </h3>

             {/* METADATA DISPLAYS */}
             {(post.metadata?.price || post.metadata?.location) && (
                <div className="flex flex-wrap gap-2 lg:gap-3 mb-2">
                   {post.metadata.price && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl font-black italic text-[9px] lg:text-[10px]">
                         <DollarSign className="h-3 w-3 mr-1" /> {post.metadata.price}€
                      </Badge>
                   )}
                   {post.metadata.location && (
                      <Badge className="bg-slate-100 text-slate-600 border-none px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px]">
                         <MapPin className="h-3 w-3 mr-1" /> {post.metadata.location}
                      </Badge>
                   )}
                </div>
             )}

             <p className="text-slate-600 dark:text-slate-400 font-medium text-sm lg:text-lg leading-relaxed whitespace-pre-wrap">
                {post.contenu}
             </p>

             {post.image_url && (
                <div className="mt-4 rounded-xl lg:rounded-[2rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-inner relative h-64 lg:h-[500px]">
                   <Image src={post.image_url} alt="Post content" fill className="object-cover" />
                </div>
             )}
          </div>

          {/* REACTIONS DISPLAY */}
          {reactions.length > 0 && (
             <div className="flex flex-wrap gap-2 mt-4">
                {reactions.map(r => (
                   <button key={r.emoji} className="px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs lg:text-sm flex items-center gap-1.5 lg:gap-2 hover:bg-white transition-all shadow-sm">
                      <span>{r.emoji}</span>
                      <span className="font-black text-[10px] lg:text-xs">{r.count}</span>
                   </button>
                ))}
             </div>
          )}

          {/* ACTIONS BAR */}
          <div className="flex items-center justify-between pt-4 lg:pt-6 border-t border-slate-50 dark:border-white/5">
             <div className="flex items-center gap-1 lg:gap-2">
                <div className="relative">
                   <Button 
                    onClick={() => setShowReactions(!showReactions)}
                    variant="ghost" 
                    className={`h-10 lg:h-12 px-3 lg:px-6 rounded-lg lg:rounded-2xl transition-all font-black text-[9px] lg:text-[10px] uppercase tracking-widest ${showReactions ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                   >
                      <Heart className="h-4 w-4 mr-1 lg:mr-2" /> Réagir
                   </Button>
                   <AnimatePresence>
                      {showReactions && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10, scale: 0.9 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 10, scale: 0.9 }}
                           className="absolute bottom-full left-0 mb-3 flex items-center gap-2 lg:gap-3 bg-white dark:bg-slate-800 p-2 lg:p-3 rounded-xl lg:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/10 z-50"
                         >
                            {['❤️', '👍', '🙏', '👏', '🔥', '😂', '😢'].map(e => (
                               <button key={e} onClick={() => handleReact(e)} className="hover:scale-150 transition-transform p-1 text-xl lg:text-2xl active:scale-90">{e}</button>
                            ))}
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>

                <Button 
                  onClick={toggleComments}
                  variant="ghost" 
                  className={`h-10 lg:h-12 px-3 lg:px-6 rounded-lg lg:rounded-2xl transition-all font-black text-[9px] lg:text-[10px] uppercase tracking-widest ${showComments ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                >
                   <MessageCircle className="h-4 w-4 mr-1 lg:mr-2" /> <span className="hidden sm:inline">{comments.length > 0 ? `${comments.length} Réponses` : 'Répondre'}</span><span className="sm:hidden">{comments.length}</span>
                </Button>
             </div>
             <Button variant="ghost" size="icon" className="h-10 lg:h-12 w-10 lg:w-12 rounded-lg lg:rounded-2xl text-slate-300 hover:text-indigo-600">
                <Share2 className="h-4 w-4 lg:h-5 lg:w-5" />
             </Button>
          </div>

          {/* COMMENT SECTION */}
          <AnimatePresence>
            {showComments && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-4 lg:pt-6 space-y-4 lg:space-y-6"
              >
                 <div className="space-y-3 lg:space-y-4 max-h-[300px] lg:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {comments.map(c => (
                       <div key={c.id} className="flex gap-3 lg:gap-4 p-4 lg:p-5 bg-slate-50 dark:bg-white/5 rounded-xl lg:rounded-[2rem] border border-slate-100 dark:border-white/5">
                          <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl bg-white dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 shadow-sm">
                             {c.profiles?.prenom?.[0]}{c.profiles?.nom?.[0]}
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                             <p className="text-[10px] lg:text-xs font-black text-slate-900 dark:text-white truncate">{c.profiles?.prenom} {c.profiles?.nom}</p>
                             <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{c.contenu}</p>
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="flex gap-2 lg:gap-3 items-center bg-white dark:bg-slate-800 p-1.5 lg:p-2 rounded-xl lg:rounded-2xl shadow-inner border border-slate-100 dark:border-white/5">
                    <Input 
                      placeholder="Répondre..." 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      className="border-none bg-transparent font-medium text-xs lg:text-sm focus-visible:ring-0 px-2 lg:px-4"
                    />
                    <Button onClick={handleAddComment} disabled={isSubmittingComment} className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shrink-0 p-0 flex items-center justify-center">
                       {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5 lg:h-4 lg:w-4" />}
                    </Button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>
    </motion.div>
  );
}
