'use client';

import { useEffect, useState } from 'react';
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
  const supabase = createClient();

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
    <div className="min-h-full bg-[#F8FAFC] dark:bg-transparent">
      
      {/* HERO SECTION - PREMIUM SEARCH */}
      <div className="relative overflow-hidden bg-[#0F172A] pt-16 pb-24 px-6 lg:px-10 rounded-b-[3rem] lg:rounded-b-[4rem] shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <Badge className="bg-indigo-500/20 text-indigo-300 border-none px-4 py-1 font-black uppercase tracking-widest text-[10px]">
              Base de Connaissances
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white">
              Wiki <span className="text-indigo-400">Résidence</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium max-w-xl mx-auto">
              Tout ce que vous devez savoir sur votre copropriété, de la sécurité aux petits détails du quotidien.
            </p>
          </div>

          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-5 lg:left-6 top-1/2 -translate-y-1/2 h-5 w-5 lg:h-6 lg:w-6 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
            <Input 
              placeholder="Rechercher..." 
              className="pl-14 lg:pl-16 h-14 lg:h-20 bg-white/10 backdrop-blur-xl border-white/10 rounded-2xl lg:rounded-[2rem] text-white placeholder:text-slate-500 text-base lg:text-xl font-bold focus:ring-4 focus:ring-indigo-500/20 transition-all border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2 lg:gap-3 max-w-md mx-auto">
            {['Code poubelles', 'Interphone', 'Local vélos', 'Eau'].map(tag => (
              <button 
                key={tag}
                onClick={() => setSearchTerm(tag)}
                className="text-[10px] lg:text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full transition-all border border-white/5 whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-10 -mt-12 space-y-12">
        
        {/* CATEGORIES NAVIGATION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
              className={`
                p-8 rounded-[3rem] flex flex-col items-start gap-4 transition-all border shadow-sm group
                ${selectedCategory === cat.name 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30 -translate-y-2' 
                  : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-indigo-500/50 hover:shadow-xl'}
              `}
            >
              <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${selectedCategory === cat.name ? 'bg-white/20' : cat.bg}`}>
                <cat.icon className={`h-8 w-8 ${selectedCategory === cat.name ? 'text-white' : cat.color}`} />
              </div>
              <div className="text-left">
                <span className="text-sm font-black uppercase tracking-wider block">{cat.name}</span>
                <span className={`text-[10px] font-bold ${selectedCategory === cat.name ? 'text-indigo-100' : 'text-slate-400'}`}>{cat.desc}</span>
              </div>
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
              <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                <p className="text-slate-500 font-bold">Aucun article trouvé pour cette recherche.</p>
              </div>
            ) : filtered.map((art) => (
              <motion.div
                key={art.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <Link 
                  href={`/dashboard/wiki/${art.id}`}
                  className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden h-full"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0">
                    <ArrowUpRight className="h-6 w-6 text-indigo-600" />
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <Badge className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none px-3 py-1 uppercase text-[8px] font-black">
                      {art.categorie}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                      <Clock className="h-3 w-3" /> 3 min
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-indigo-600 transition-colors">
                    {art.titre}
                  </h3>
                  
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 font-medium leading-relaxed mb-8">
                    {art.contenu}
                  </p>

                  <div className="mt-auto pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/10 border border-white dark:border-white/10 shadow-sm flex items-center justify-center text-[10px] font-black text-slate-500">
                        AD
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">Par Admin Copro</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-all" />
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