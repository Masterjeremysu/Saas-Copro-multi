'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, MapPin, Mail, Search, Phone, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Voisin {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  batiment?: string;
  lot?: string;
  email?: string;
}

export default function AnnuairePage() {
  const [voisins, setVoisins] = useState<Voisin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchVoisins() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('nom', { ascending: true });

      if (data) setVoisins(data);
      setIsLoading(false);
    }
    fetchVoisins();
  }, [supabase]);

  const filteredVoisins = voisins.filter(v => 
    `${v.prenom} ${v.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.batiment?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-10 space-y-8 max-w-[1400px] mx-auto pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 lg:px-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-white/5 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">Communauté</h1>
          </div>
          <p className="text-slate-500 font-medium text-sm lg:text-base italic tracking-tight">Annuaire officiel des résidents et du personnel.</p>
        </div>
        
        <Badge variant="outline" className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-amber-500" /> {voisins.length} Membres
        </Badge>
      </div>

      {/* SEARCH BAR */}
      <div className="relative group mx-2 lg:mx-0">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-600 transition-colors" />
        <Input 
          placeholder="Rechercher un voisin, un batiment, un rôle..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-14 h-14 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm text-sm lg:text-base focus-visible:ring-4 focus-visible:ring-indigo-50 dark:focus-visible:ring-indigo-900/10 transition-all dark:text-white"
        />
      </div>

      {/* GRID */}
      {isLoading ? (
        <div className="p-20 flex flex-col items-center justify-center space-y-4">
           <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Initialisation de l&apos;annuaire...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 px-2 lg:px-0">
          {filteredVoisins.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-300 dark:text-slate-700 italic font-medium text-lg lg:text-xl bg-white dark:bg-white/5 rounded-[3rem]">
               Aucun membre ne correspond à votre recherche.
            </div>
          ) : (
            filteredVoisins.map((v) => (
              <Card key={v.id} className="group overflow-hidden border-none bg-white dark:bg-white/5 rounded-[2rem] shadow-sm lg:hover:shadow-xl lg:hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-white/5 dark:to-white/10 flex items-center justify-center font-black text-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform duration-500">
                      {v.prenom?.[0]}{v.nom?.[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight truncate">
                        {v.prenom} {v.nom}
                      </h3>
                      <Badge className={`mt-1 border-none font-black text-[8px] uppercase tracking-[0.15em] px-2 h-4 ${
                        v.role === 'syndic' ? 'bg-indigo-600 text-white' : 
                        v.role === 'administrateur' ? 'bg-amber-500 text-white' : 
                        'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}>
                        {v.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100/50 dark:border-white/5">
                      <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate">{v.batiment || 'Non renseigné'} — Lot {v.lot || '??'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100/50 dark:border-white/5">
                      <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate">{v.email || 'Pas d\'email'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-white/10 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg transition-all active:scale-95">
                      <Phone className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}