'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Building2, 
  Plus, 
  Search, 
  Users, 
  Settings2, 
  MapPin, 
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SuperAdminPage() {
  const [copros, setCopros] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();

  async function fetchCopros() {
    setIsLoading(true);
    // On récupère toutes les copros
    const { data } = await supabase
      .from('coproprietes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setCopros(data);
    setIsLoading(false);
  }

  useEffect(() => { fetchCopros(); }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    
    const { error } = await supabase.from('coproprietes').insert({
      nom: formData.get('nom'),
      adresse: formData.get('adresse'),
    });

    if (error) {
      toast.error("Erreur lors de la création de l'espace");
    } else {
      toast.success("Nouvelle Copropriété initialisée !");
      setIsDialogOpen(false);
      fetchCopros();
    }
    setIsCreating(false);
  }

  const filteredCopros = copros.filter(c => 
    c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.adresse && c.adresse.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <HasRole roles={['administrateur']}>
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto mb-20">
        
        {/* BANNIÈRE SUPER-ADMIN */}
        <div className="bg-[#0F172A] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <Badge className="bg-rose-500/20 text-rose-400 border-none px-4 py-1.5 uppercase tracking-widest font-black text-[10px]">
                <ShieldAlert className="h-3 w-3 mr-2 inline" /> Accès Restreint : Super Admin
              </Badge>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Gestion du Parc</h1>
              <p className="text-slate-400 font-medium max-w-xl">
                Contrôlez les instances de CoproSync. Ajoutez de nouveaux clients et gérez l'infrastructure globale.
              </p>
            </div>

            {/* FORMULAIRE DE CRÉATION (MODAL) */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl h-14 px-8 font-black text-lg shadow-xl shrink-0 transition-transform active:scale-95">
                  <Plus className="mr-2 h-5 w-5" /> Nouveau Client
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 sm:max-w-[500px]">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">Nouvelle Instance</DialogTitle>
                  <p className="text-slate-500 font-medium">Déployez un espace vierge pour une nouvelle résidence.</p>
                </DialogHeader>
                
                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Nom du Complexe</Label>
                    <Input name="nom" placeholder="Ex: Les Jardins de l'Olympe" required className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg focus:ring-4 focus:ring-indigo-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Adresse Complète</Label>
                    <Input name="adresse" placeholder="15 avenue des Champs..." required className="h-14 rounded-2xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                  </div>
                  <Button type="submit" disabled={isCreating} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg text-white shadow-xl shadow-indigo-100 mt-4">
                    {isCreating ? <Loader2 className="animate-spin h-6 w-6" /> : "Déployer la Copropriété"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="relative group max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <Input 
            placeholder="Rechercher une résidence..." 
            className="pl-14 h-14 bg-white border-slate-200 rounded-2xl shadow-sm font-bold text-slate-600 focus:ring-4 focus:ring-indigo-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* GRILLE DES INSTANCES (CLIENTS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600 opacity-20" />
            </div>
          ) : filteredCopros.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold italic">Aucune instance ne correspond à la recherche.</p>
            </div>
          ) : (
            filteredCopros.map((copro) => (
              <Card key={copro.id} className="rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-300 bg-white group overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-3">
                      Active
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-black text-slate-900 leading-tight">
                    {copro.nom}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-300" />
                    <span className="line-clamp-1">{copro.adresse || 'Adresse non renseignée'}</span>
                  </div>

                  <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Instance</p>
                      <p className="text-xs font-mono text-slate-600 font-bold">{copro.id.slice(0, 8)}</p>
                    </div>
                   <Link href={`/dashboard/admin/${copro.id}`}>
                    <Button variant="outline" className="h-auto rounded-2xl border-slate-200 text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                       <Settings2 className="h-4 w-4 mr-2" /> Gérer
                  </Button>
                  </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </HasRole>
  );
}