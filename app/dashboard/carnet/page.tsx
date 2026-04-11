'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  HistoryIcon, 
  Plus, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  FileText,
  Loader2,
  HardHat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, // <-- LE CORRECTIF EST LÀ
  DialogTrigger 
} from "@/components/ui/dialog";
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';

export default function CarnetPage() {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClient();

  const loadCarnet = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('carnet_entretien')
      .select('*')
      .order('date_intervention', { ascending: false });
    
    if (data) setInterventions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCarnet();
  }, []);

  const handleCreateEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('copropriete_id')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase.from('carnet_entretien').insert({
        copropriete_id: profile?.copropriete_id,
        titre: formData.get('titre') as string,
        description: formData.get('description') as string,
        entreprise: formData.get('entreprise') as string,
        date_intervention: formData.get('date_intervention') as string,
        cout: formData.get('cout') || 0,
        type_intervention: formData.get('type_intervention') as string
      });

      if (error) throw error;

      toast.success("Intervention ajoutée au registre !");
      setIsDialogOpen(false);
      loadCarnet();

    } catch (err: any) {
      toast.error("Erreur lors de l'ajout : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredInterventions = interventions.filter(i => 
    i.titre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.entreprise.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto mb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            <HistoryIcon className="h-10 w-10 text-indigo-600" /> Carnet d'Entretien
          </h1>
          <p className="text-slate-500 font-medium">Registre légal et historique technique de la copropriété.</p>
        </div>
        
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl h-12 px-6 border-slate-200 font-bold hidden sm:flex">
            <FileText className="mr-2 h-4 w-4" /> Exporter Registre
          </Button>

          <HasRole roles={['administrateur', 'syndic']}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black shadow-xl shadow-indigo-100">
                  <Plus className="mr-2 h-5 w-5" /> Nouvelle Entrée
                </Button>
              </DialogTrigger>
              
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 sm:max-w-[500px]">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Consigner une intervention</DialogTitle>
                  <DialogDescription className="text-slate-500"> {/* LE CORRECTIF EST LÀ */}
                    Ajoutez une nouvelle ligne au registre officiel technique de la copropriété.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateEntry} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Titre de l'intervention</Label>
                    <Input name="titre" placeholder="Ex: Remplacement pompe de relevage" required className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Entreprise mandatée</Label>
                    <Input name="entreprise" placeholder="Ex: Plomberie Dupont" required className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Date</Label>
                      <Input name="date_intervention" type="date" required className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Coût TTC (€)</Label>
                      <Input name="cout" type="number" step="0.01" placeholder="0.00" className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Type</Label>
                    <select name="type_intervention" required className="flex h-12 w-full rounded-xl bg-slate-50 px-3 py-2 text-sm border-none font-bold focus:ring-4 focus:ring-indigo-50 outline-none">
                      <option value="Maintenance">Maintenance préventive</option>
                      <option value="Réparation">Réparation / Dépannage</option>
                      <option value="Rénovation">Rénovation / Amélioration</option>
                      <option value="Inspection">Inspection légale</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Détails (Optionnel)</Label>
                    <Textarea name="description" placeholder="Notes complémentaires..." className="rounded-xl bg-slate-50 border-none resize-none focus:ring-4 focus:ring-indigo-50" />
                  </div>

                  <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg text-white shadow-xl shadow-indigo-100 mt-6">
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "Enregistrer dans le carnet"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </HasRole>
        </div>
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <Input 
          placeholder="Rechercher une intervention..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-14 h-14 bg-white border-slate-200 rounded-2xl shadow-sm font-bold text-slate-600 focus:ring-4 focus:ring-indigo-50"
        />
      </div>

      <div className="relative pt-6">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
        ) : filteredInterventions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <Wrench className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold italic">Le carnet est vide pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {filteredInterventions.map((item) => (
              <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-50 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  {item.type_intervention === 'Rénovation' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>

                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] rounded-[2rem] border-none shadow-sm group-hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-none uppercase text-[9px] font-black tracking-widest px-3">
                        {item.type_intervention}
                      </Badge>
                      <span className="text-xs font-black text-indigo-600">
                        {new Date(item.date_intervention).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight mb-2">{item.titre}</h3>
                      <p className="text-sm text-slate-500 font-medium line-clamp-2">{item.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <HardHat className="h-4 w-4 text-slate-400" /> {item.entreprise}
                      </div>
                      {item.cout && (
                        <div className="text-sm font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-xl">
                          {item.cout} €
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}