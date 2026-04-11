'use client';

import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, FileSignature, Euro, CalendarDays, CalendarCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { logAction } from '@/utils/audit';
import { toast } from 'sonner';

export function AddContractModal({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [fournisseur, setFournisseur] = useState('');
  const [service, setService] = useState('');
  const [montant, setMontant] = useState('');
  const [dateDebut, setDateDebut] = useState(''); // Ajout de la date de début
  const [dateFin, setDateFin] = useState('');
  const [preavis, setPreavis] = useState('90');

  const supabase = createClient();

  const handleSave = async () => {
    if (!fournisseur || !service || !dateDebut || !dateFin) {
      toast.error("Veuillez remplir les champs obligatoires (*)");
      return;
    }

    setLoading(true);
    const tid = toast.loading("Enregistrement du contrat...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      if (!profile?.copropriete_id) throw new Error("Profil introuvable");

      let fileUrl = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${profile.copropriete_id}/${fileName}`;

        const { error: storageError } = await supabase.storage.from('contrats-docs').upload(filePath, file);
        if (storageError) throw storageError;
        fileUrl = filePath;
      }

      const { data: contrat, error: dbError } = await supabase
        .from('contrats')
        .insert({
          copropriete_id: profile.copropriete_id,
          fournisseur,
          service,
          montant_annuel: parseFloat(montant) || 0,
          date_debut: dateDebut, // On envoie bien la date de début ici !
          date_fin: dateFin,
          preavis_jours: parseInt(preavis) || 90,
          fichier_url: fileUrl
        })
        .select()
        .single();

      if (dbError) throw dbError;

      await logAction({
        action: 'CONTRACT_CREATE',
        resourceType: 'contrats',
        resourceId: contrat.id,
        details: `Nouveau contrat : ${fournisseur} (${service})`,
        metadata: { montant: contrat.montant_annuel, echeance: contrat.date_fin },
        severity: 'info'
      });

      toast.success("Contrat enregistré et tracé", { id: tid });
      
      setOpen(false);
      setFournisseur('');
      setService('');
      setMontant('');
      setDateDebut('');
      setDateFin('');
      setFile(null);
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
        <Button className="bg-slate-900 hover:bg-black text-white rounded-[1.5rem] h-14 px-8 font-bold flex gap-3 shadow-2xl transition-all active:scale-95">
          <Plus className="h-5 w-5" /> Nouveau Contrat
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] rounded-[3rem] border-none shadow-2xl bg-white p-10">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900">
            Enregistrer un contrat
          </DialogTitle>
          <DialogDescription className="text-base text-slate-500 font-medium">
            Saisissez les détails du partenaire pour automatiser le suivi des échéances.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* LIGNE 1 : Fournisseur & Service */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fournisseur *</Label>
              <div className="relative">
                <Input 
                  value={fournisseur} onChange={(e) => setFournisseur(e.target.value)}
                  placeholder="Ex: Schindler" 
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20" 
                />
                <FileSignature className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Service *</Label>
              <Input 
                value={service} onChange={(e) => setService(e.target.value)}
                placeholder="Ex: Maintenance Ascenseur" 
                className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20 px-5" 
              />
            </div>
          </div>

          {/* LIGNE 2 : Dates */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Date de Début *</Label>
              <div className="relative">
                <Input 
                  type="date"
                  value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20" 
                />
                <CalendarCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Date de Fin (Échéance) *</Label>
              <div className="relative">
                <Input 
                  type="date"
                  value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20" 
                />
                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-400" />
              </div>
            </div>
          </div>

          {/* LIGNE 3 : Finances & Préavis */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Montant Annuel TTC (€)</Label>
              <div className="relative">
                <Input 
                  type="number" step="0.01"
                  value={montant} onChange={(e) => setMontant(e.target.value)}
                  placeholder="0.00" 
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20" 
                />
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Préavis (Jours)</Label>
              <Input 
                type="number"
                value={preavis} onChange={(e) => setPreavis(e.target.value)}
                placeholder="90" 
                className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20 px-5" 
              />
            </div>
          </div>

          {/* LIGNE 4 : Fichier */}
          <div className="space-y-2 pt-2">
            <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Document officiel (PDF)</Label>
            <Input 
              type="file" 
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="h-14 bg-slate-50 border-dashed border-2 border-slate-200 rounded-2xl pt-3 px-4 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer" 
            />
          </div>
        </div>

        <DialogFooter className="mt-8">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 rounded-[1.5rem] font-black text-lg shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Confirmer l'enregistrement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}