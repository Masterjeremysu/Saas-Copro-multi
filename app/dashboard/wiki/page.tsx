'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Loader2, 
  ChevronRight, 
  ShieldAlert, 
  Home, 
  Wrench, 
  Scale, 
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HasRole } from '@/components/auth-guard';
import { motion } from 'framer-motion';
import Link from 'next/link';

const INITIAL_ARTICLES = [
  {
    id: '1',
    titre: "🚨 Sécurité : Procédures en cas d'urgence",
    categorie: "Urgences",
    contenu: "En cas de détection de fumée ou d'odeur de gaz, évacuez immédiatement les lieux par les escaliers. Appelez le 18 ou le 112. Le point de rassemblement se situe devant le portail principal.",
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    titre: "🚲 Local Vélos & Mobilités Douces",
    categorie: "Vie Quotidienne",
    contenu: "Le local vélos est situé au sous-sol -1. L'accès se fait via le badge de la résidence. Merci d'attacher vos vélos aux supports prévus.",
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    titre: "📜 Fonctionnement du Conseil Syndical",
    categorie: "Règlementation",
    contenu: "Le Conseil Syndical (CS) est composé de copropriétaires élus. Son rôle est de contrôler la gestion du syndic et de l'assister dans ses décisions.",
    created_at: new Date().toISOString()
  }
];
const CATEGORIES = [
  { name: 'Urgences', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Sécurité et codes vitaux' },
  { name: 'Vie Quotidienne', icon: Home, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'Vivre ensemble sereinement' },
  { name: 'Entretien', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Maintenance et prestataires' },
  { name: 'Règlementation', icon: Scale, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Statuts et règlements' },
];

interface WikiArticle {
  id: string;
  titre: string;
  categorie: string;
  contenu: string;
  created_at: string;
}

export default function WikiPage() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    async function fetchWiki() {
      const { data } = await supabase.from('wiki_articles').select('*').order('created_at', { ascending: false });
      // Si la base est vide, on montre les articles pro par défaut
      if (data && data.length > 0) {
        setArticles(data);
      } else {
        setArticles(INITIAL_ARTICLES);
      }
      setIsLoading(false);
    }
    fetchWiki();
  }, [supabase]);

  const filtered = articles.filter(a => {
    const matchesSearch = a.titre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || a.categorie === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* TACTICAL HERO - MISSION CONTROL STYLE */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-10">
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 text-indigo-300 px-5 py-2 rounded-full font-black uppercase tracking-widest text-[10px]"
            >
              <BookOpen className="h-3 w-3" /> Base de Connaissances CoproSync
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic pr-4"
            >
              Wiki <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Résidence</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 font-medium text-sm lg:text-xl max-w-2xl mx-auto leading-relaxed"
            >
              Toutes les clés pour maîtriser votre quotidien. Sécurité, règlement, vie pratique : votre savoir partagé.
            </motion.p>
          </div>

          <div className="relative group max-w-3xl mx-auto">
            <div className="absolute inset-0 bg-indigo-600/20 blur-2xl group-focus-within:bg-indigo-600/30 transition-all rounded-[2.5rem]"></div>
            <div className="relative">
              <Search className="absolute left-6 lg:left-8 top-1/2 -translate-y-1/2 h-6 w-6 lg:h-8 lg:w-8 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <Input 
                ref={searchInputRef}
                placeholder="Une question ? Une règle ? Un code ?" 
                className="pl-16 lg:pl-20 h-16 lg:h-24 bg-white/5 backdrop-blur-2xl border-white/10 rounded-[2rem] lg:rounded-[2.5rem] text-white placeholder:text-slate-600 text-lg lg:text-2xl font-bold focus:ring-0 transition-all border-none shadow-2xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 lg:gap-4 max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-2 mr-2">Top Recherches :</span>
            {['Code poubelles', 'Badge local vélos', 'Règlement intérieur'].map(tag => (
              <button 
                key={tag}
                onClick={() => setSearchTerm(tag)}
                className="text-[10px] lg:text-xs font-black text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 lg:px-6 lg:py-3 rounded-2xl transition-all border border-white/5 whitespace-nowrap active:scale-95"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-10 -mt-12 space-y-12">
        
        {/* CATEGORIES NAVIGATION */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 max-w-7xl mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
              className={`
                p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] flex flex-col items-center lg:items-start gap-4 transition-all border shadow-sm group relative overflow-hidden
                ${selectedCategory === cat.name 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-600/40 -translate-y-2' 
                  : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-white/5 hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1'}
              `}
            >
              <div className={`p-4 lg:p-6 rounded-2xl lg:rounded-3xl transition-all duration-500 group-hover:rotate-12 ${selectedCategory === cat.name ? 'bg-white/20' : cat.bg}`}>
                <cat.icon className={`h-8 w-8 lg:h-10 lg:w-10 ${selectedCategory === cat.name ? 'text-white' : cat.color}`} />
              </div>
              <div className="text-center lg:text-left space-y-1">
                <span className="text-xs lg:text-base font-black uppercase tracking-wider block">{cat.name}</span>
                <span className={`text-[9px] lg:text-[11px] font-bold uppercase tracking-tighter opacity-70 ${selectedCategory === cat.name ? 'text-indigo-100' : 'text-slate-400'}`}>{cat.desc}</span>
              </div>
              
              {/* Subtle Indicator */}
              {selectedCategory === cat.name && (
                <motion.div layoutId="category-indicator" className="absolute top-4 right-4 h-2 w-2 rounded-full bg-white shadow-lg shadow-white/50" />
              )}
            </button>
          ))}
        </div>

        {/* ARTICLES GRID */}
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              {selectedCategory ? `${selectedCategory}` : 'Articles récents'}
            </h2>
            <HasRole roles={['administrateur', 'syndic']}>
              <Link href="/dashboard/wiki/nouveau">
                <Button className="bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-50 rounded-2xl h-10 px-6 font-bold shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> Ajouter
                </Button>
              </Link>
            </HasRole>
          </div>

          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          >
            {isLoading ? (
              <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600 h-10 w-10" /></div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Aucun article trouvé</p>
              </div>
            ) : filtered.map((art) => (
              <motion.div
                key={art.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.95, y: 20 },
                  visible: { opacity: 1, scale: 1, y: 0 }
                }}
              >
                <Link 
                  href={`/dashboard/wiki/${art.id}`}
                  className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] lg:rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] transition-all group flex flex-col relative overflow-hidden h-full active:scale-[0.98]"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0 text-indigo-600">
                    <ArrowUpRight className="h-8 w-8" />
                  </div>

                  <div className="flex items-center gap-3 mb-8">
                    <Badge className="bg-indigo-600 text-white border-none px-4 py-1.5 uppercase text-[9px] font-black tracking-widest rounded-xl">
                      {art.categorie}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-tighter">
                      <Clock className="h-3.5 w-3.5" /> 4 min
                    </div>
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-6 group-hover:text-indigo-600 transition-colors tracking-tighter leading-none">
                    {art.titre}
                  </h3>
                  
                  <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-base line-clamp-3 font-medium leading-relaxed mb-10">
                    {art.contenu}
                  </p>

                  <div className="mt-auto pt-8 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-indigo-600/20">
                        {art.categorie.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white block tracking-widest">Expert Copro</span>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Administrateur</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-all">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}