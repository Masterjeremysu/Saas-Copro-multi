'use client';

import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Scale } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function AddResolutionModal({ 
  assembleeId, 
  nextNumero, 
  onRefresh 
}: { 
  assembleeId: string, 
  nextNumero: number,
  onRefresh: () => void 
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [majorite, setMajorite] = useState('art_24');
  const [montant, setMontant] = useState('');

  const supabase = createClient();

  const handleSave = async () => {
    if (!titre) {
      toast.error("Le titre de la résolution est obligatoire.");
      return;
    }

    setLoading(true);
    const tid = toast.loading("Ajout à l'ordre du jour...");

    try {
      const { error } = await supabase
        .from('resolutions')
        .insert({
          assemblee_id: assembleeId,
          numero_ordre: nextNumero,
          titre,
          description,
          type_majorite: majorite,
          montant_alloue: montant ? parseFloat(montant) : null
        });

      if (error) throw error;

      toast.success("Résolution ajoutée", { id: tid });
      
      setOpen(false);
      setTitre('');
      setDescription('');
      setMajorite('art_24');
      setMontant('');
      onRefresh();

    } catch (err: any) {
      toast.error(err.message, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-black text-white rounded-lg h-10 px-4 font-bold shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Ajouter une résolution
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] rounded-2xl bg-white border-slate-200 shadow-xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-600" />
            Nouvelle Résolution (N°{nextNumero})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Titre de la résolution *</Label>
            <Input 
              placeholder="Ex: Approbation des comptes de l'exercice clos" 
              value={titre} onChange={e => setTitre(e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 font-bold" 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Détail / Projet de résolution</Label>
            <textarea 
              placeholder="Texte soumis au vote des copropriétaires..." 
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-200" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Règle de Majorité</Label>
              <select 
                value={majorite} onChange={e => setMajorite(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="art_24">Article 24 (Majorité simple)</option>
                <option value="art_25">Article 25 (Majorité absolue)</option>
                <option value="art_26">Article 26 (Double majorité)</option>
                <option value="unanimite">Unanimité</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Budget alloué (€) (Optionnel)</Label>
              <Input 
                type="number" step="0.01" placeholder="0.00"
                value={montant} onChange={e => setMontant(e.target.value)}
                className="h-11 bg-slate-50 border-slate-200 font-bold" 
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8">
          <Button variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-lg">Annuler</Button>
          <Button onClick={handleSave} disabled={loading} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Ajouter à l'ordre du jour"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}