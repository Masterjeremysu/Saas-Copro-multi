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
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';

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
  const supabase = createClient();

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
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour au Wiki
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-xl">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-xl">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-xl">
              <Bookmark className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-6 py-12 lg:py-20 space-y-10">
        
        {/* HEADER ARTICLE */}
        <header className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none px-4 py-1.5 uppercase text-[10px] font-black tracking-widest">
              {article.categorie}
            </Badge>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.1]">
            {article.titre}
          </h1>

          <div className="flex flex-wrap items-center gap-6 pt-4 text-sm font-bold text-slate-400 border-b border-slate-50 dark:border-white/5 pb-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                AD
              </div>
              <span className="text-slate-900 dark:text-slate-200">Admin CoproSync</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Mis à jour le {new Date(article.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Lecture : 4 min
            </div>
          </div>
        </header>

        {/* CONTENT ARTICLE */}
        <div className="prose prose-slate prose-indigo dark:prose-invert max-w-none">
          <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {article.contenu}
          </p>
          
          {/* Simulation de contenu riche pour l'effet "Pro" */}
          <div className="mt-12 p-8 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-xs tracking-widest">
              <Info className="h-5 w-5" /> À noter
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">
              Cette procédure a été validée lors du Conseil Syndical du 12 Mars 2024. Elle s&apos;applique à l&apos;ensemble des résidents (propriétaires et locataires).
            </p>
          </div>
        </div>

        {/* FOOTER ARTICLE */}
        <footer className="pt-12 mt-12 border-t border-slate-100 dark:border-white/5">
          <div className="bg-indigo-600 rounded-[3rem] p-8 lg:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl shadow-indigo-600/20">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="space-y-2 text-center lg:text-left z-10">
              <h4 className="text-2xl font-black tracking-tight">Une question sur cet article ?</h4>
              <p className="text-indigo-100 font-medium">Nos conseillers sont là pour vous aider si vous avez besoin de précisions.</p>
            </div>
            
            <Button className="bg-white text-indigo-600 hover:bg-slate-100 rounded-2xl h-14 px-8 font-black shadow-xl z-10 transition-transform hover:scale-105">
              Contacter le Syndic <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 py-10">
            <p className="text-sm font-bold text-slate-400">Cet article vous a-t-il été utile ?</p>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl font-bold px-6 border-slate-200">Oui</Button>
              <Button variant="outline" className="rounded-xl font-bold px-6 border-slate-200">Non</Button>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
