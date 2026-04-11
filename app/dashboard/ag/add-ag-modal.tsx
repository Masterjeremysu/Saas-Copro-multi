'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, CalendarDays, MapPin } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';

export function AddAgModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const [titre, setTitre] = useState('Assemblée Générale Ordinaire 2026');
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('18:00');
  const [lieu, setLieu] = useState('');

  const supabase = createClient();

  const handleSave = async () => {
    if (!titre || !date || !heure) {
      toast.error("Veuillez remplir les champs obligatoires (*)");
      return;
    }

    setLoading(true);
    const tid = toast.loading("Création de l'assemblée...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      // Combiner la date et l'heure au format ISO pour Supabase
      const dateTenue = new Date(`${date}T${heure}:00`).toISOString();

      const { data: nouvelleAg, error } = await supabase
        .from('assemblees')
        .insert({
          copropriete_id: profile!.copropriete_id,
          titre,
          date_tenue: dateTenue,
          lieu,
          statut: 'brouillon'
        })
        .select()
        .single();

      if (error) throw error;

      await logAction({
        action: 'AG_CREATED',
        resourceType: 'assemblees',
        resourceId: nouvelleAg.id,
        details: `Création de l'AG : ${titre}`,
        severity: 'info'
      });

      toast.success("Assemblée créée avec succès", { id: tid });
      setOpen(false);
      
      // Redirection immédiate vers la page de l'AG pour ajouter l'ordre du jour
      router.push(`/dashboard/ag/${nouvelleAg.id}`);

    } catch (err: any) {
      toast.error(err.message, { id: tid });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-black text-white rounded-lg h-11 px-6 font-bold shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle AG
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] rounded-2xl bg-white border-slate-200 shadow-xl p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900">Nouvelle Assemblée</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium mt-1">
            Planifiez la date pour commencer à préparer l'ordre du jour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Titre de l'assemblée *</Label>
            <Input 
              value={titre} onChange={e => setTitre(e.target.value)}
              className="h-12 bg-slate-50 border-slate-200 font-bold" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Date prévue *</Label>
              <div className="relative">
                <Input 
                  type="date" 
                  value={date} onChange={e => setDate(e.target.value)}
                  className="pl-10 h-12 bg-slate-50 border-slate-200 font-bold" 
                />
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Heure *</Label>
              <Input 
                type="time" 
                value={heure} onChange={e => setHeure(e.target.value)}
                className="h-12 bg-slate-50 border-slate-200 font-bold" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Lieu (Optionnel)</Label>
            <div className="relative">
              <Input 
                placeholder="Ex: Hall de l'immeuble, Visio..." 
                value={lieu} onChange={e => setLieu(e.target.value)}
                className="pl-10 h-12 bg-slate-50 border-slate-200 font-bold" 
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8">
          <Button variant="outline" onClick={() => setOpen(false)} className="h-12 rounded-xl border-slate-200">Annuler</Button>
          <Button onClick={handleSave} disabled={loading} className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Créer et préparer l'AG"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}