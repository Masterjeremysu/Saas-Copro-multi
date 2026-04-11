'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, Phone, Mail, FileText, Pencil, Trash2, 
  Check, X, Loader2, CalendarDays, Building2, Euro
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { AddContractModal } from './add-contract-modal';
import { logAction } from '@/utils/audit';

export default function ContratsPage() {
  const [contrats, setContrats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actifsOnly, setActifsOnly] = useState(false);
  
  // États pour les actions
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [viewContract, setViewContract] = useState<any | null>(null);
  const [editContract, setEditContract] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClient();

  const fetchContrats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contrats')
      .select('*')
      .is('deleted_at', null) // On cache la corbeille
      .order('date_fin', { ascending: true });

    if (error) toast.error("Erreur de chargement");
    else setContrats(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchContrats(); }, []);

  // --- ACTION 1 : SOFT DELETE ---
  const handleSoftDelete = async (id: string, fournisseur: string) => {
    if (!window.confirm(`Mettre le contrat "${fournisseur}" à la corbeille ?`)) return;
    
    setIsDeleting(id);
    const tid = toast.loading("Archivage en cours...");
    try {
      const { error } = await supabase.from('contrats').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'CONTRACT_SOFT_DELETE',
        resourceType: 'contrats',
        resourceId: id,
        details: `Contrat archivé : ${fournisseur}`,
        severity: 'warning'
      });

      toast.success("Contrat mis à la corbeille", { id: tid });
      fetchContrats();
    } catch (err: any) {
      toast.error(err.message, { id: tid });
    } finally {
      setIsDeleting(null);
    }
  };

  // --- ACTION 2 : MISE À JOUR (EDIT) ---
  const handleUpdate = async () => {
    if (!editContract) return;
    setIsUpdating(true);
    const tid = toast.loading("Mise à jour...");

    try {
      const { error } = await supabase
        .from('contrats')
        .update({
          fournisseur: editContract.fournisseur,
          service: editContract.service,
          montant_annuel: parseFloat(editContract.montant_annuel) || 0,
          date_debut: editContract.date_debut,
          date_fin: editContract.date_fin,
          contact_nom: editContract.contact_nom,
          contact_telephone: editContract.contact_telephone,
          contact_email: editContract.contact_email,
          notes: editContract.notes
        })
        .eq('id', editContract.id);

      if (error) throw error;

      await logAction({
        action: 'CONTRACT_UPDATE',
        resourceType: 'contrats',
        resourceId: editContract.id,
        details: `Mise à jour du contrat : ${editContract.fournisseur}`,
        severity: 'info'
      });

      toast.success("Contrat mis à jour", { id: tid });
      setEditContract(null);
      fetchContrats();
    } catch (err: any) {
      toast.error(err.message, { id: tid });
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtrage
  const filteredContrats = contrats.filter(c => {
    const matchesSearch = c.fournisseur?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.service?.toLowerCase().includes(searchTerm.toLowerCase());
    const daysLeft = differenceInDays(new Date(c.date_fin), new Date());
    if (actifsOnly && daysLeft < 0) return false;
    return matchesSearch;
  });

  // KPIs
  const actifs = contrats.filter(c => differenceInDays(new Date(c.date_fin), new Date()) >= 0);
  const budgetActif = actifs.reduce((acc, curr) => acc + (Number(curr.montant_annuel) || 0), 0);
  const expires = contrats.filter(c => differenceInDays(new Date(c.date_fin), new Date()) < 0).length;
  const enAlerte = actifs.filter(c => differenceInDays(new Date(c.date_fin), new Date()) <= (c.preavis_jours || 90)).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 md:p-10 space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Contrats fournisseurs</h1>
          <p className="text-sm text-slate-500 mt-1">{contrats.length} contrat(s) au total</p>
        </div>
        <AddContractModal onRefresh={fetchContrats} />
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget annuel (Actifs)</p>
          <div>
            <p className="text-3xl font-bold text-slate-900">{budgetActif.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-slate-500 mt-1">{actifs.length} contrat(s) actif(s)</p>
          </div>
        </div>
        <div className="bg-rose-50 p-5 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expirés</p>
          <div>
            <p className="text-3xl font-bold text-rose-600">{expires}</p>
            <p className="text-xs text-slate-500 mt-1">À renouveler</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">En alerte</p>
          <div>
            <p className="text-3xl font-bold text-slate-900">{enAlerte}</p>
            <p className="text-xs text-slate-500 mt-1">Échéance proche</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total contrats</p>
          <div>
            <p className="text-3xl font-bold text-slate-900">{contrats.length}</p>
            <p className="text-xs text-slate-500 mt-1">Tous statuts</p>
          </div>
        </div>
      </div>

      {/* RECHERCHE ET FILTRE */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher un fournisseur..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white border-slate-200 rounded-lg shadow-sm w-full focus-visible:ring-slate-300" 
          />
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setActifsOnly(!actifsOnly)}
            className={`h-11 rounded-lg border-slate-200 shadow-sm font-medium ${actifsOnly ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-600'}`}
          >
            {actifsOnly && <Check className="mr-2 h-4 w-4" />} Actifs uniquement
          </Button>
          <span className="text-sm text-slate-500 whitespace-nowrap">{filteredContrats.length} résultat(s)</span>
        </div>
      </div>

      {/* TABLEAU PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fournisseur</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Début</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Échéance ↑</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Délai ↑</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Montant/An</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" /></td></tr>
              ) : filteredContrats.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-500">Aucun résultat.</td></tr>
              ) : filteredContrats.map((contrat) => {
                
                const daysLeft = differenceInDays(new Date(contrat.date_fin), new Date());
                const isExpired = daysLeft < 0;

                return (
                  <tr key={contrat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-900">{contrat.fournisseur}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 border border-slate-200 rounded-md text-[11px] text-slate-600 bg-slate-50">
                        {contrat.service}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-700">
                          <X className="h-3 w-3" /> Expiré
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
                          <Check className="h-3 w-3" /> Conforme
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-slate-600">
                      {contrat.date_debut ? format(new Date(contrat.date_debut), 'dd/MM/yyyy') : '---'}
                    </td>
                    <td className="px-6 py-4 align-top font-bold text-slate-900">
                      {format(new Date(contrat.date_fin), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 align-top font-bold">
                      {isExpired ? (
                        <span className="text-rose-600">Expiré ({Math.abs(daysLeft)}j)</span>
                      ) : (
                        <span className="text-emerald-600">{daysLeft}j</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top font-bold text-slate-900">
                      {Number(contrat.montant_annuel).toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-slate-900 text-xs mb-1 uppercase tracking-tight">{contrat.contact_nom || '---'}</p>
                      <div className="space-y-1">
                        {contrat.contact_telephone && (
                          <a href={`tel:${contrat.contact_telephone}`} className="flex items-center gap-1.5 text-indigo-600 hover:underline text-xs">
                            <Phone className="h-3 w-3" /> {contrat.contact_telephone}
                          </a>
                        )}
                        {contrat.contact_email && (
                          <a href={`mailto:${contrat.contact_email}`} className="flex items-center gap-1.5 text-indigo-600 hover:underline text-xs">
                            <Mail className="h-3 w-3" /> {contrat.contact_email}
                          </a>
                        )}
                      </div>
                    </td>
                    
                    {/* LES BOUTONS D'ACTION CÂBLÉS */}
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => setViewContract(contrat)} variant="outline" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 shadow-sm" title="Voir les détails">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => setEditContract(contrat)} variant="outline" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 shadow-sm" title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => handleSoftDelete(contrat.id, contrat.fournisseur)} 
                          disabled={isDeleting === contrat.id}
                          variant="outline" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:border-rose-200 shadow-sm" title="Supprimer"
                        >
                          {isDeleting === contrat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALE : VOIR LES DÉTAILS --- */}
      <Dialog open={!!viewContract} onOpenChange={() => setViewContract(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl bg-white p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Building2 className="text-indigo-600 h-6 w-6" />
              {viewContract?.fournisseur}
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500 uppercase tracking-widest text-xs">
              {viewContract?.service}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant Annuel</span>
                <span className="text-lg font-black text-slate-900">{Number(viewContract?.montant_annuel).toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Échéance</span>
                <span className="text-sm font-bold text-slate-900">{viewContract && format(new Date(viewContract.date_fin), 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informations de contact</p>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">{viewContract?.contact_nom || 'Non spécifié'}</p>
                <p className="text-sm text-slate-600 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {viewContract?.contact_telephone || '---'}</p>
                <p className="text-sm text-slate-600 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {viewContract?.contact_email || '---'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes internes</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl leading-relaxed italic border border-slate-100">
                {viewContract?.notes || "Aucune note ajoutée pour ce contrat."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODALE : MODIFIER LE CONTRAT --- */}
      <Dialog open={!!editContract} onOpenChange={(open) => !open && setEditContract(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-none shadow-2xl bg-white p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Modifier le contrat</DialogTitle>
          </DialogHeader>
          
          {editContract && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Fournisseur</Label>
                <Input value={editContract.fournisseur} onChange={e => setEditContract({...editContract, fournisseur: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Service</Label>
                <Input value={editContract.service} onChange={e => setEditContract({...editContract, service: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Date de fin</Label>
                <Input type="date" value={editContract.date_fin} onChange={e => setEditContract({...editContract, date_fin: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Montant Annuel (€)</Label>
                <Input type="number" value={editContract.montant_annuel} onChange={e => setEditContract({...editContract, montant_annuel: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              
              <div className="col-span-2 mt-2 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-4">Contacts & Notes</p>
              </div>
              
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Nom du contact</Label>
                <Input value={editContract.contact_nom || ''} onChange={e => setEditContract({...editContract, contact_nom: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Téléphone</Label>
                <Input value={editContract.contact_telephone || ''} onChange={e => setEditContract({...editContract, contact_telephone: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Email</Label>
                <Input value={editContract.contact_email || ''} onChange={e => setEditContract({...editContract, contact_email: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Notes (Visibles dans le tableau)</Label>
                <Input value={editContract.notes || ''} onChange={e => setEditContract({...editContract, notes: e.target.value})} className="h-12 bg-slate-50 border-slate-200" />
              </div>
            </div>
          )}

          <DialogFooter className="mt-8">
            <Button variant="outline" onClick={() => setEditContract(null)} className="h-12 rounded-xl border-slate-200">Annuler</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm">
              {isUpdating ? <Loader2 className="animate-spin h-5 w-5" /> : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}