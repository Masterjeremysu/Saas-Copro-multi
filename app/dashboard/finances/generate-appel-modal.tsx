'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { logAction } from '@/utils/audit';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge'; 

export function GenerateAppelModal({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  
  // Paramètres globaux de l'appel
  const [trimestre, setTrimestre] = useState('');
  const [dateExigibilite, setDateExigibilite] = useState('');
  const [budgetGlobal, setBudgetGlobal] = useState('');
  
  // Données de simulation
  const [lots, setLots] = useState<any[]>([]);
  const [simulation, setSimulation] = useState<any[]>([]);
  const [totalTantiemes, setTotalTantiemes] = useState(0);

  const supabase = createClient();

  // Charger la matrice des lots à l'ouverture
  useEffect(() => {
    if (open) {
      fetchLots();
      setStep(1);
      setSimulation([]);
    }
  }, [open]);

  const fetchLots = async () => {
    const { data } = await supabase.from('lots').select('*');
    if (data) {
      setLots(data);
      const total = data.reduce((acc, curr) => acc + curr.tantiemes, 0);
      setTotalTantiemes(total);
    }
  };

  // ÉTAPE 1 : Le calcul financier strict
  const handleSimulate = () => {
    const budget = parseFloat(budgetGlobal);
    if (!trimestre || !dateExigibilite || isNaN(budget) || budget <= 0) {
      toast.error("Veuillez remplir tous les champs avec un montant valide.");
      return;
    }
    if (lots.length === 0) {
      toast.error("Aucun lot trouvé dans la copropriété. Impossible de répartir.");
      return;
    }
    if (totalTantiemes === 0) {
      toast.error("Erreur de matrice : Le total des tantièmes est de 0.");
      return;
    }

    // Répartition au centime près
    const repartition = lots.map(lot => {
      // Formule : (Budget Global / Total Tantièmes) * Tantièmes du lot
      const partTheorique = (budget / totalTantiemes) * lot.tantiemes;
      // Arrondi bancaire (2 décimales)
      const partArrondie = Math.round(partTheorique * 100) / 100; 
      
      return {
        ...lot,
        montant_appel: partArrondie
      };
    });

    setSimulation(repartition);
    setStep(2);
  };

  // ÉTAPE 2 : Insertion "Batch" en base de données
  const handleConfirmGenerate = async () => {
    setLoading(true);
    const tid = toast.loading("Génération sécurisée des appels de fonds...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      // Préparation du tableau d'insertion (Batch)
      const appelsToInsert = simulation.map(lot => ({
        copropriete_id: profile!.copropriete_id,
        coproprietaire_nom: lot.proprietaire_nom,
        lot_reference: lot.numero_lot,
        trimestre: trimestre,
        date_exigibilite: dateExigibilite,
        montant_total: lot.montant_appel,
        statut: 'valide' // Directement valide pour émission
      }));

      // Insertion multiple en une seule requête (Transaction sécurisée)
      const { error } = await supabase.from('appels_fonds').insert(appelsToInsert);

      if (error) throw error;

      // Traçabilité Audit
      await logAction({
        action: 'BATCH_FUNDS_CALL_GENERATED',
        resourceType: 'appels_fonds',
        details: `Émission globale : ${trimestre} - ${budgetGlobal}€`,
        metadata: { budget: budgetGlobal, lots_impactes: simulation.length },
        severity: 'critical' // C'est une action financière majeure
      });

      toast.success(`${simulation.length} appels de fonds générés avec succès.`, { id: tid });
      setOpen(false);
      onRefresh();

    } catch (err: any) {
      toast.error(`Erreur d'émission : ${err.message}`, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-black text-white rounded-lg h-11 px-6 font-bold shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Émettre un appel
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] rounded-2xl bg-white border-slate-200 shadow-2xl p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-indigo-600" />
            Générateur d'Appels de Fonds
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6 pt-4">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-900 font-medium leading-relaxed">
                Le système va diviser le budget global en fonction de la matrice des tantièmes (Total actuel : <strong>{totalTantiemes}</strong>).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Période visée *</Label>
                <Input 
                  placeholder="Ex: T3 2026" 
                  value={trimestre} onChange={e => setTrimestre(e.target.value)}
                  className="h-12 bg-slate-50 border-slate-200 font-bold" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Date d'exigibilité *</Label>
                <Input 
                  type="date" 
                  value={dateExigibilite} onChange={e => setDateExigibilite(e.target.value)}
                  className="h-12 bg-slate-50 border-slate-200 font-bold" 
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Budget global appelé (€) *</Label>
                <Input 
                  type="number" step="0.01"
                  placeholder="Ex: 15000.00" 
                  value={budgetGlobal} onChange={e => setBudgetGlobal(e.target.value)}
                  className="h-14 bg-white border-slate-300 font-black text-xl text-indigo-900 focus-visible:ring-indigo-500" 
                />
              </div>
            </div>

            <DialogFooter className="mt-8">
              <Button onClick={handleSimulate} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
                Calculer la répartition
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Aperçu de la répartition ({trimestre})</h3>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-black">
                  Total : {budgetGlobal} €
                </Badge>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Lot & Propriétaire</th>
                      <th className="py-3 px-4 text-center">Tantièmes</th>
                      <th className="py-3 px-4 text-right">Montant calculé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {simulation.map((lot, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{lot.proprietaire_nom}</p>
                          <p className="text-xs text-slate-500">{lot.numero_lot}</p>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-600">
                          {lot.tantiemes} / {totalTantiemes}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-600">
                          {lot.montant_appel.toLocaleString('fr-FR')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="flex-1 h-12 rounded-xl">
                Modifier les paramètres
              </Button>
              <Button onClick={handleConfirmGenerate} disabled={loading} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Confirmer l'émission</>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}