'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, TrendingUp, AlertCircle, 
  CheckCircle2, Clock, MailWarning, Plus, Loader2, Download, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { GenerateAppelModal } from './generate-appel-modal';

export default function FinancesPage() {
  const [appels, setAppels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State pour le tiroir d'encaissement
  const [selectedAppel, setSelectedAppel] = useState<any | null>(null);
  const [montantPaiement, setMontantPaiement] = useState('');
  const [methodePaiement, setMethodePaiement] = useState('virement');
  const [isProcessing, setIsProcessing] = useState(false);

  const supabase = createClient();

  const fetchAppels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appels_fonds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error("Erreur base de données financière");
    else setAppels(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppels(); }, []);

  // --- ACTION SÉCURISÉE : ENCAISSER UN PAIEMENT ---
  const handleEncaisser = async () => {
    if (!selectedAppel || !montantPaiement) return;
    setIsProcessing(true);
    const tid = toast.loading("Sécurisation de la transaction...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // On insère uniquement dans la table PAIEMENTS (Immutabilité)
      // Le Trigger SQL s'occupera de mettre à jour le statut de l'appel de fonds
      const { error } = await supabase
        .from('paiements')
        .insert({
          appel_fonds_id: selectedAppel.id,
          montant: parseFloat(montantPaiement),
          methode: methodePaiement,
          enregistre_par: user?.id
        });

      if (error) throw error;

      await logAction({
        action: 'PAYMENT_RECEIVED',
        resourceType: 'paiements',
        resourceId: selectedAppel.id,
        details: `Encaissement de ${montantPaiement}€ pour ${selectedAppel.coproprietaire_nom}`,
        metadata: { methode: methodePaiement, lot: selectedAppel.lot_reference },
        severity: 'info'
      });

      toast.success("Transaction validée et lettrée", { id: tid });
      setSelectedAppel(null);
      setMontantPaiement('');
      fetchAppels(); // Rafraîchit pour voir le nouveau statut calculé par le Trigger
    } catch (err: any) {
      toast.error(err.message, { id: tid });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAppels = appels.filter(a => 
    a.coproprietaire_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.lot_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPIs
  const totalAppele = appels.reduce((acc, curr) => acc + Number(curr.montant_total), 0);
  const totalEncaisse = appels.reduce((acc, curr) => acc + Number(curr.montant_regle), 0);
  const totalImpayes = totalAppele - totalEncaisse;
  const tauxRecouvrement = totalAppele > 0 ? Math.round((totalEncaisse / totalAppele) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 md:p-10 space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Trésorerie & Appels</h1>
          <p className="text-sm text-slate-500 mt-1">Supervision financière sécurisée de la copropriété.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-lg border-slate-200 shadow-sm font-medium bg-white text-slate-700">
            <Download className="mr-2 h-4 w-4" /> Export Comptable
          </Button>
          <GenerateAppelModal onRefresh={fetchAppels} />
        </div>
      </div>

      {/* STAT CARDS - Lignes de bilan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Émis</p>
          <div>
            <p className="text-3xl font-bold text-slate-900">{totalAppele.toLocaleString('fr-FR')} €</p>
          </div>
        </div>

        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Trésorerie Encaissée</p>
          <div className="flex justify-between items-end">
            <p className="text-3xl font-bold text-emerald-700">{totalEncaisse.toLocaleString('fr-FR')} €</p>
            <div className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded-md text-xs">
              <TrendingUp className="h-3 w-3" /> {tauxRecouvrement}%
            </div>
          </div>
        </div>

        <div className="bg-rose-50 p-5 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Reste à recouvrer</p>
          <div>
            <p className="text-3xl font-bold text-rose-700">{totalImpayes.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-rose-600/70 mt-1">Déficit théorique</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Factures en retard</p>
          <div>
            <p className="text-3xl font-bold text-slate-900">{appels.filter(a => a.statut === 'en_retard').length}</p>
          </div>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher un résident ou un lot..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white border-slate-200 rounded-lg shadow-sm focus-visible:ring-slate-300" 
          />
        </div>
      </div>

      {/* TABLEAU COMPTABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lot & Résident</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Période</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exigibilité</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Montant Dû</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reste à Payer</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" /></td></tr>
              ) : filteredAppels.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-500">Aucune donnée financière.</td></tr>
              ) : filteredAppels.map((appel) => {
                
                const reste_a_payer = Number(appel.montant_total) - Number(appel.montant_regle);

                let statusBadge;
                if (appel.statut === 'solde') {
                  statusBadge = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Soldé</span>;
                } else if (appel.statut === 'en_retard') {
                  statusBadge = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-700"><AlertCircle className="h-3 w-3" /> En retard</span>;
                } else {
                  statusBadge = <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700"><Clock className="h-3 w-3" /> En attente</span>;
                }

                return (
                  <tr key={appel.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-900">{appel.coproprietaire_nom}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 border border-slate-200 rounded-md text-[10px] text-slate-600 bg-slate-50 font-bold uppercase">
                        {appel.lot_reference}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top font-semibold text-slate-600">{appel.trimestre}</td>
                    <td className="px-6 py-4 align-top font-semibold text-slate-900">
                      {format(new Date(appel.date_exigibilite), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 align-top font-black text-slate-900">
                      {Number(appel.montant_total).toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-6 py-4 align-top font-black text-rose-600">
                      {reste_a_payer > 0 ? `${reste_a_payer.toLocaleString('fr-FR')} €` : '---'}
                    </td>
                    <td className="px-6 py-4 align-top">{statusBadge}</td>
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        {appel.statut !== 'solde' && (
                          <Button 
                            onClick={() => {
                              setSelectedAppel(appel);
                              setMontantPaiement(reste_a_payer.toString());
                            }}
                            variant="outline" size="sm" 
                            className="h-8 text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm"
                          >
                            <Landmark className="h-4 w-4 mr-1.5 text-emerald-600" /> Encaisser
                          </Button>
                        )}
                        {appel.statut === 'en_retard' && (
                          <Button variant="outline" size="sm" className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 shadow-sm">
                            <MailWarning className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALE D'ENCAISSEMENT --- */}
      <Dialog open={!!selectedAppel} onOpenChange={(open) => !open && setSelectedAppel(null)}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl p-6 bg-white border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Saisir un encaissement</DialogTitle>
          </DialogHeader>
          
          {selectedAppel && (
            <div className="space-y-5 pt-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Bénéficiaire</p>
                <p className="text-base font-bold text-slate-900 mt-1">{selectedAppel.coproprietaire_nom} ({selectedAppel.lot_reference})</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Montant reçu (€)</Label>
                <Input 
                  type="number" step="0.01"
                  value={montantPaiement} 
                  onChange={(e) => setMontantPaiement(e.target.value)}
                  className="h-12 bg-white font-bold text-lg border-slate-200" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Méthode</Label>
                <select 
                  value={methodePaiement}
                  onChange={(e) => setMethodePaiement(e.target.value)}
                  className="w-full h-12 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="virement">Virement bancaire</option>
                  <option value="prelevement">Prélèvement SEPA</option>
                  <option value="cheque">Chèque</option>
                  <option value="cb">Carte Bancaire</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setSelectedAppel(null)} className="h-11 rounded-lg">Annuler</Button>
            <Button onClick={handleEncaisser} disabled={isProcessing} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Valider le paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}