'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BookOpen, Search, Info, Plus, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HasRole } from '@/components/auth-guard';
import Link from 'next/link';

export default function WikiPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchWiki() {
      const { data } = await supabase.from('wiki_articles').select('*').order('created_at', { ascending: false });
      if (data) setArticles(data);
      setIsLoading(false);
    }
    fetchWiki();
  }, []);

  const filtered = articles.filter(a => a.titre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 lg:p-10 space-y-10">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Wiki Résidence</h1>
          <p className="text-slate-500 font-medium">Toutes les procédures et codes utiles.</p>
        </div>
        <HasRole roles={['administrateur', 'syndic']}>
          <Link href="/dashboard/wiki/nouveau">
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-bold shadow-xl shadow-indigo-100">
              <Plus className="mr-2 h-5 w-5" /> Nouvel Article
            </Button>
          </Link>
        </HasRole>
      </div>

      <div className="relative max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Rechercher une info..." 
          className="pl-14 h-16 bg-white border-none rounded-[1.5rem] shadow-sm text-lg focus:ring-4 focus:ring-indigo-50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
        ) : filtered.map((art) => (
          <div key={art.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group">
            <Badge className="bg-indigo-50 text-indigo-600 border-none mb-4 uppercase text-[9px] font-black">{art.categorie}</Badge>
            <h3 className="text-xl font-black text-slate-900 mb-3">{art.titre}</h3>
            <p className="text-slate-500 text-sm line-clamp-3 mb-6 font-medium leading-relaxed">{art.contenu}</p>
            <div className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
              Lire la suite <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}