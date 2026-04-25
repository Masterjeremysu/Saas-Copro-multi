'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  ChevronLeft,
  Clock, 
  Calendar, 
  Share2, 
  Printer, 
  Bookmark,
  AlertCircle,
  ArrowRight,
  Info,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface WikiArticle {
  id: string;
  titre: string;
  categorie: string;
  contenu: string;
  created_at: string;
}

export default function WikiArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('Introduction');
  const supabase = createClient();

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  const handleAction = (message: string) => {
    toast.success(message, {
      description: "Votre demande a bien été prise en compte.",
      duration: 3000,
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      setScrollProgress((currentScroll / totalScroll) * 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function fetchArticle() {
      const { data } = await supabase
        .from('wiki_articles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data) setArticle(data);
      setIsLoading(false);
    }
    fetchArticle();
  }, [id, supabase]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-20 max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-black text-slate-900">Article introuvable</h2>
        <Button onClick={() => router.back()} variant="ghost">Retour au Wiki</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-transparent">
      {/* TOP NAV ARTICLE */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5">
        {/* Reading Progress Bar */}
        <motion.div 
          className="absolute bottom-0 left-0 h-[2px] bg-indigo-600 z-50"
          style={{ width: `${scrollProgress}%` }}
        />
        
        <div className="max-w-7xl mx-auto px-6 h-16 lg:h-20 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs lg:text-sm font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-2xl h-10 w-10 lg:h-12 lg:w-12"
              onClick={() => handleAction("Lien copié dans le presse-papier")}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-2xl h-10 w-10 lg:h-12 lg:w-12"
              onClick={() => window.print()}
            >
              <Printer className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-2xl h-10 w-10 lg:h-12 lg:w-12"
              onClick={() => handleAction("Article ajouté à vos favoris")}
            >
              <Bookmark className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-24 grid grid-cols-1 xl:grid-cols-4 gap-16">
        
        {/* SIDEBAR TABLE OF CONTENTS (Desktop) */}
        <aside className="hidden xl:block">
           <div className="sticky top-32 space-y-8">
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <List className="h-4 w-4" /> Sommaire
                 </h4>
                 <nav className="flex flex-col gap-3">
                    {['Introduction', 'Points clés', 'Procédure', 'Contact'].map((item) => (
                       <button 
                          key={item} 
                          onClick={() => handleScrollTo(item)}
                          className={`text-sm font-bold text-left hover:text-indigo-600 transition-colors ${activeSection === item ? 'text-indigo-600' : 'text-slate-400'}`}
                       >
                          {item}
                       </button>
                    ))}
                 </nav>
              </div>

              <div className="p-6 rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Besoin d&apos;aide ?</p>
                 <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    Si un point n&apos;est pas clair, vous pouvez demander une mise à jour de l&apos;article.
                 </p>
                 <Button 
                    variant="link" className="p-0 h-auto text-xs font-black uppercase tracking-widest text-indigo-600"
                    onClick={() => handleAction("Merci pour votre suggestion")}
                 >
                    Signaler un oubli
                 </Button>
              </div>
           </div>
        </aside>

        <div className="xl:col-span-3 space-y-12">
          {/* HEADER ARTICLE */}
          <header className="space-y-8">
            <div className="flex items-center gap-3">
              <Badge className="bg-indigo-600 text-white border-none px-5 py-2 uppercase text-[10px] font-black tracking-widest rounded-xl">
                {article.categorie}
              </Badge>
            </div>
            
            <h1 className="text-5xl lg:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.95]">
              {article.titre}
            </h1>

            <div className="flex flex-wrap items-center gap-8 pt-6 text-sm font-black text-slate-400 border-b border-slate-100 dark:border-white/5 pb-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white text-xs font-black shadow-xl shadow-indigo-600/20">
                  AD
                </div>
                <div>
                  <span className="text-slate-900 dark:text-slate-200 block">Expert CoproSync</span>
                  <span className="text-[10px] uppercase tracking-tighter opacity-50 block">Administrateur</span>
                </div>
              </div>
              <div className="flex items-center gap-2 uppercase tracking-widest text-[10px]">
                <Calendar className="h-4 w-4" />
                {new Date(article.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 uppercase tracking-widest text-[10px]">
                <Clock className="h-4 w-4" />
                Lecture : 5 min
              </div>
            </div>
          </header>

          {/* CONTENT ARTICLE */}
          <div className="prose prose-slate prose-indigo dark:prose-invert max-w-none prose-p:text-xl prose-p:leading-relaxed prose-p:font-medium prose-p:text-slate-600 dark:prose-p:text-slate-300">
            <section id="Introduction" className="scroll-mt-32 mb-16">
               <p>{article.contenu}</p>
            </section>
            
            <section id="Points clés" className="scroll-mt-32 mb-16">
               <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-6">Points clés à retenir</h3>
               <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                  {['Respect des horaires', 'Sécurité des parties communes', 'Communication avec le syndic', 'Entretien régulier'].map(point => (
                     <li key={point} className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-indigo-600" /> {point}
                     </li>
                  ))}
               </ul>
            </section>

            <section id="Procédure" className="scroll-mt-32 mb-16">
               <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-6">Procédure détaillée</h3>
               <div className="space-y-6">
                  <div className="flex gap-6">
                     <div className="flex-none h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black">1</div>
                     <p className="text-lg">Consultez les documents officiels disponibles dans votre espace Coffre-fort.</p>
                  </div>
                  <div className="flex gap-6">
                     <div className="flex-none h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black">2</div>
                     <p className="text-lg">Informez les parties prenantes via le système de messagerie CoproSync.</p>
                  </div>
               </div>
            </section>

            <section id="Contact" className="scroll-mt-32">
               <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-6">Besoin d&apos;assistance ?</h3>
               <p className="text-lg">Nos équipes d&apos;experts sont disponibles du lundi au vendredi de 9h à 18h pour répondre à toutes vos questions techniques ou réglementaires.</p>
            </section>
            
            <div className="mt-16 p-10 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <CustomInfo className="h-20 w-20 text-indigo-600" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-xs tracking-widest">
                  <Info className="h-5 w-5" /> Recommandation de l&apos;expert
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic text-lg">
                  &quot;Cette procédure a été validée lors du Conseil Syndical du 12 Mars 2024. Elle s&apos;applique à l&apos;ensemble des résidents pour garantir une sécurité optimale.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER ARTICLE */}
      <footer className="pt-12 mt-12 border-t border-slate-100 dark:border-white/5 max-w-7xl mx-auto px-6">
        <div className="bg-indigo-600 rounded-[3rem] p-8 lg:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl shadow-indigo-600/20">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="space-y-2 text-center lg:text-left z-10">
            <h4 className="text-2xl font-black tracking-tight">Une question sur cet article ?</h4>
            <p className="text-indigo-100 font-medium">Nos conseillers sont là pour vous aider si vous avez besoin de précisions.</p>
          </div>
          
          <Button 
            className="bg-white text-indigo-600 hover:bg-slate-100 rounded-2xl h-14 px-8 font-black shadow-xl z-10 transition-transform hover:scale-105"
            onClick={() => handleAction("Demande envoyée au Syndic")}
          >
            Contacter le Syndic <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-8 py-10">
          <p className="text-sm font-bold text-slate-400">Cet article vous a-t-il été utile ?</p>
          <div className="flex items-center gap-3">
            <Button 
               variant="outline" className="rounded-xl font-bold px-6 border-slate-200"
               onClick={() => handleAction("Merci pour votre retour positif !")}
            >Oui</Button>
            <Button 
               variant="outline" className="rounded-xl font-bold px-6 border-slate-200"
               onClick={() => handleAction("Merci, nous allons améliorer cet article.")}
            >Non</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CustomInfo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
