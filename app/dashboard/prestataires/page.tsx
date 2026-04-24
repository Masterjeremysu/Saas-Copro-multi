'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  HardHat, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Star,
  ShieldCheck,
  Loader2,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, // <-- LE FIX ACCESSIBILITÉ EST LÀ
  DialogTrigger 
} from "@/components/ui/dialog";
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';
import { useCallback } from 'react';

interface Prestataire {
  id: string;
  nom: string;
  specialite: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  note?: number;
  copropriete_id: string;
}

export default function PrestatairesPage() {
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClient();

  const loadPrestataires = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('prestataires')
      .select('*')
      .order('nom', { ascending: true });
    
    if (data) setPrestataires(data as Prestataire[]);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { loadPrestataires(); }, [loadPrestataires]);

  const handleAddPrestataire = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      if (!profile?.copropriete_id) {
        throw new Error("Impossible de lier ce prestataire à votre copropriété.");
      }

      // LE FIX SÉCURITÉ DE DONNÉES (On s'assure d'envoyer du texte propre)
      const { error } = await supabase.from('prestataires').insert({
        copropriete_id: profile.copropriete_id,
        nom: formData.get('nom') as string,
        specialite: formData.get('specialite') as string,
        telephone: formData.get('telephone') as string,
        email: formData.get('email') as string,
        adresse: formData.get('adresse') as string,
      });

      if (error) throw error;

      toast.success("Artisan ajouté à l'annuaire !");
      setIsDialogOpen(false);
      loadPrestataires();

    } catch (err: unknown) {
      const error = err as Error;
      toast.error("Erreur : " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = prestataires.filter(p => 
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.specialite.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto mb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            <HardHat className="h-10 w-10 text-indigo-600" /> Annuaire Technique
          </h1>
          <p className="text-slate-500 font-medium">Les professionnels accrédités pour intervenir sur la résidence.</p>
        </div>
        
        <HasRole roles={['administrateur', 'syndic']}>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black shadow-xl shadow-indigo-100">
                <Plus className="mr-2 h-5 w-5" /> Ajouter un pro
              </Button>
            </DialogTrigger>
            
            <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 sm:max-w-[500px]">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Nouveau Prestataire</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Ajoutez les coordonnées d&apos;un artisan pour l&apos;intégrer à l&apos;annuaire de la copropriété.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddPrestataire} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Raison Sociale / Nom</Label>
                  <Input name="nom" placeholder="Ex: Plomberie Express" required className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Spécialité Métier (Sous-nom)</Label>
                  <select name="specialite" required className="flex h-12 w-full rounded-xl bg-slate-50 px-3 py-2 text-sm border-none font-bold focus:ring-4 focus:ring-indigo-50 outline-none">
                    <option value="Plomberie">Plomberie</option>
                    <option value="Électricité">Électricité</option>
                    <option value="Chauffage">Chauffage</option>
                    <option value="Toiture">Toiture</option>
                    <option value="Serrurerie">Serrurerie</option>
                    <option value="Ascenseur">Ascenseur</option>
                    <option value="Espaces Verts">Espaces Verts</option>
                    <option value="Parties Communes">Parties Communes</option>
                    <option value="Gros Œuvre">Gros Œuvre</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Téléphone</Label>
                    <Input name="telephone" placeholder="06..." className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email</Label>
                    <Input name="email" type="email" placeholder="@" className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Adresse</Label>
                  <Input name="adresse" placeholder="15 rue des artisans..." className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                </div>

                <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg text-white shadow-xl shadow-indigo-100 mt-6">
                  {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Sauvegarder la fiche"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </HasRole>
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <Input 
          placeholder="Rechercher par nom ou spécialité..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-14 h-14 bg-white border-slate-200 rounded-2xl shadow-sm font-bold text-slate-600 focus:ring-4 focus:ring-indigo-50"
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <Wrench className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold italic">Aucun prestataire dans l&apos;annuaire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((pro) => (
            <Card key={pro.id} className="rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-xl transition-shadow bg-white overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-8 pb-6 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-white text-indigo-600 border border-indigo-100 uppercase text-[9px] font-black tracking-widest px-3 py-1 shadow-sm">
                      {pro.specialite}
                    </Badge>
                    <div className="flex text-amber-400">
                      <Star className="h-4 w-4 fill-amber-400" />
                      <span className="text-xs font-black text-slate-700 ml-1">{pro.note}.0</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1">{pro.nom}</h3>
                  <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck className="h-3 w-3" /> Accrédité CoproSync
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Phone className="h-4 w-4" /></div>
                    {pro.telephone || 'Non renseigné'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Mail className="h-4 w-4" /></div>
                    <span className="truncate">{pro.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><MapPin className="h-4 w-4" /></div>
                    <span className="truncate">{pro.adresse || 'Adresse non spécifiée'}</span>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl h-10 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-xs" onClick={() => window.location.href = `tel:${pro.telephone}`}>
                      Appeler
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl h-10 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs" onClick={() => window.location.href = `mailto:${pro.email}`}>
                      Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}