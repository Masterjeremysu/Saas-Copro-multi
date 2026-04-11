'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  FileText, Folder, Search, 
  Download, FilePlus, Loader2, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card'; 
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArchiveDocumentModal } from './archive-document-modal';
import { logAction } from '@/utils/audit';

const CATEGORIES = [
  { id: 'Tous', label: 'Tous les fichiers', icon: <Folder className="h-4 w-4" /> },
  { id: 'Règlement', label: 'Règlement de Copro', icon: <FileText className="h-4 w-4" /> },
  { id: 'Procès-Verbaux', label: 'Procès-Verbaux AG', icon: <FileText className="h-4 w-4" /> },
  { id: 'Factures', label: 'Factures & Devis', icon: <FileText className="h-4 w-4" /> },
  { id: 'Technique', label: 'Dossiers Techniques', icon: <FileText className="h-4 w-4" /> },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState('Tous');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const supabase = createClient();

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('documents').select('*, uploader:profiles(prenom, nom)').is('deleted_at', null);
      if (activeCat !== 'Tous') query = query.eq('categorie', activeCat);
      if (searchQuery) query = query.ilike('nom', `%${searchQuery}%`);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setDocs(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [activeCat, searchQuery]);

  const handleSoftDelete = async (docId: string, docNom: string) => {
    if (!window.confirm(`Mettre "${docNom}" à la poubelle ?`)) return;
    setIsDeleting(docId);
    try {
      const { error } = await supabase.from('documents').update({ deleted_at: new Date().toISOString() }).eq('id', docId);
      if (error) throw error;
      await logAction({
        action: 'DOCUMENT_SOFT_DELETE',
        resourceType: 'documents',
        resourceId: docId,
        details: `Mise à la corbeille : ${docNom}`,
        metadata: { filename: docNom },
        severity: 'warning'
      });
      toast.success("Document archivé en corbeille");
      fetchDocs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="p-6 md:p-12 space-y-12 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-[0.2em]">Coffre-fort Digital</Badge>
          <h1 className="text-6xl font-black tracking-tighter text-slate-900 leading-none">Documents</h1>
          <p className="text-slate-500 font-medium text-xl italic tracking-tight">Gestion documentaire de prestige.</p>
        </div>
        <ArchiveDocumentModal onRefresh={fetchDocs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-3 space-y-4">
          <p className="px-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Navigation</p>
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`whitespace-nowrap flex items-center gap-4 px-8 py-5 rounded-[2rem] text-sm transition-all duration-500 ${activeCat === cat.id ? 'bg-indigo-600 text-white shadow-2xl font-bold scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 font-semibold hover:translate-x-1'}`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-9 space-y-8">
          <div className="relative group">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
            <Input placeholder="Rechercher une archive officielle..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-20 h-20 bg-white border-none rounded-[2.5rem] shadow-sm text-xl focus-visible:ring-2 focus-visible:ring-indigo-500/10 transition-all" />
          </div>

          <Card className="border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] bg-white rounded-[4rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Nom de la pièce</th>
                    <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Uploader</th>
                    <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={3} className="p-40 text-center"><Loader2 className="animate-spin h-12 w-12 mx-auto text-indigo-600" /></td></tr>
                  ) : docs.length === 0 ? (
                    <tr><td colSpan={3} className="p-40 text-center text-slate-300 italic font-medium text-xl">Aucun document à afficher.</td></tr>
                  ) : docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-indigo-50/20 transition-all group">
                      <td className="px-12 py-10">
                        <div className="flex items-center gap-8">
                          <div className="h-20 w-20 bg-slate-50 rounded-[2.2rem] flex items-center justify-center text-indigo-600 group-hover:bg-white group-hover:shadow-2xl transition-all duration-700 scale-95 group-hover:scale-100"><FileText className="h-10 w-10" /></div>
                          <div>
                            <p className="font-black text-slate-900 text-xl tracking-tight">{doc.nom}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">{doc.categorie}</Badge>
                              <span className="text-xs text-slate-400 font-bold uppercase">{(doc.taille / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-12 py-10 text-base font-bold text-slate-700">{doc.uploader?.prenom} {doc.uploader?.nom}</td>
                      <td className="px-12 py-10 text-right">
                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500">
                          <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-indigo-600 hover:scale-110"><Download className="h-6 w-6" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleSoftDelete(doc.id, doc.nom)} className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-300 hover:text-rose-600 hover:scale-110"><Trash2 className="h-6 w-6" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}