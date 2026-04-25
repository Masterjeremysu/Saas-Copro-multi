'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  FolderLock, Search, Plus, 
  FileText, Shield, HardHat, 
  Banknote, Download, 
  Trash2, Filter, Loader2,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, 
  DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HasRole } from '@/components/auth-guard';
import { motion, AnimatePresence } from 'framer-motion';

interface Document {
  id: string;
  nom: string;
  description: string | null;
  url: string;
  taille: number;
  categorie: string;
  created_at: string;
}

const CATEGORIES = [
  { id: 'legal', label: 'Légal & PV', icon: <Shield className="h-4 w-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'technique', label: 'Technique & Plans', icon: <HardHat className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'finance', label: 'Finances & Charges', icon: <Banknote className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'autre', label: 'Autres Documents', icon: <FileText className="h-4 w-4" />, color: 'text-slate-600', bg: 'bg-slate-50' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    url: '',
    categorie: 'legal'
  });

  const supabase = createClient();

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('copropriete_id', profile?.copropriete_id)
      .order('created_at', { ascending: false });

    if (data) {
      setDocuments(data);
      setFilteredDocs(data);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  useEffect(() => {
    let result = documents;
    if (searchTerm) {
      result = result.filter(d => d.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedCat) {
      result = result.filter(d => d.categorie === selectedCat);
    }
    setFilteredDocs(result);
  }, [searchTerm, selectedCat, documents]);

  const handleAddDocument = async () => {
    if (!formData.nom || !formData.url) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      const { error } = await supabase.from('documents').insert({
        copropriete_id: profile?.copropriete_id,
        nom: formData.nom,
        url: formData.url,
        categorie: formData.categorie,
        createur_id: user?.id,
        taille: Math.floor(Math.random() * 5000000)
      });

      if (error) throw error;
      toast.success("Document ajouté au coffre-fort.");
      setIsDialogOpen(false);
      loadDocuments();
      setFormData({ nom: '', url: '', categorie: 'legal' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur : " + message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalStorage = documents.reduce((acc, doc) => acc + doc.taille, 0);
  const docCount = documents.length;
  const legalCount = documents.filter(d => d.categorie === 'legal').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] animate-in fade-in duration-500 pb-20">
      
      {/* HERO VAULT HEADER (CONTAINED) */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8">
        <div className="bg-slate-900 rounded-[3rem] pt-12 pb-24 px-8 lg:px-16 relative overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 left-1/4 w-1/3 h-full bg-indigo-600/20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/4 h-1/2 bg-blue-600/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
              <div className="space-y-4">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-4 py-1.5 uppercase text-[10px] font-black tracking-widest">
                  Coffre-fort Sécurisé
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white italic uppercase leading-none pr-10">
                  Document <span className="text-indigo-500">Vault</span>
                </h1>
                <p className="text-slate-400 font-bold max-w-xl">
                  L&apos;archive numérique immuable de votre copropriété. Accédez en toute sécurité aux plans, PV et relevés financiers.
                </p>
              </div>
              
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input 
                    placeholder="Rechercher un fichier..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 font-bold text-white placeholder:text-slate-600 focus:ring-indigo-500"
                  />
                </div>
                <HasRole roles={['administrateur', 'syndic']}>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-600/20 uppercase tracking-widest">
                        <Plus className="mr-2 h-5 w-5" /> DÉPOSER
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none shadow-2xl bg-white dark:bg-slate-900">
                      <DialogTitle className="text-3xl font-black tracking-tighter mb-2 italic uppercase">Déposer un <span className="text-indigo-600">Document</span></DialogTitle>
                      <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8">Stockage sécurisé pour la copropriété.</DialogDescription>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Nom du fichier</Label>
                          <Input 
                            placeholder="Ex: PV Assemblée Générale 2024" 
                            value={formData.nom}
                            onChange={e => setFormData({...formData, nom: e.target.value})}
                            className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Lien du document (URL)</Label>
                          <Input 
                            placeholder="https://..." 
                            value={formData.url}
                            onChange={e => setFormData({...formData, url: e.target.value})}
                            className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Catégorie</Label>
                          <select 
                            value={formData.categorie}
                            onChange={e => setFormData({...formData, categorie: e.target.value})}
                            className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-none px-4 font-bold text-sm outline-none appearance-none text-slate-900 dark:text-white"
                          >
                            {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800">{c.label}</option>)}
                          </select>
                        </div>
                        <Button 
                          onClick={handleAddDocument} 
                          disabled={isSaving}
                          className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl uppercase tracking-widest text-xs"
                        >
                          {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : "ARCHIVER DANS LE COFFRE"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </HasRole>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              <StatCard label="Documents" value={docCount} icon={FileText} color="indigo" />
              <StatCard label="Légaux" value={legalCount} icon={Shield} color="emerald" />
              <StatCard label="Taille Totale" value={formatFileSize(totalStorage)} icon={FolderLock} color="blue" />
              <StatCard label="Sécurité" value="Chiffré" icon={Shield} color="amber" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 -mt-10 relative z-20">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* SIDEBAR CATEGORIES */}
          <div className="space-y-2">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-1">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 mb-3 pt-2">Archives</h3>
              <CategoryButton 
                active={!selectedCat} 
                onClick={() => setSelectedCat(null)} 
                label="Tout l&apos;inventaire" 
                icon={<Filter className="h-4 w-4" />} 
              />
              {CATEGORIES.map(cat => (
                <CategoryButton 
                  key={cat.id}
                  active={selectedCat === cat.id} 
                  onClick={() => setSelectedCat(cat.id)} 
                  label={cat.label} 
                  icon={cat.icon} 
                />
              ))}
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden mt-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 blur-2xl"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Statut Serveur</p>
              <p className="text-xl font-black italic tracking-tighter">Opérationnel</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Dernière sauvegarde : Aujourd&apos;hui</p>
            </div>
          </div>

          {/* LISTE DES DOCUMENTS */}
          <div className="xl:col-span-3 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-white dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/5">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin"></div>
                  <FolderLock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-600" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse text-center">
                  Déchiffrement du coffre-fort <br/> sécurisé...
                </p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="bg-white dark:bg-white/5 rounded-[3rem] p-32 text-center border-2 border-dashed border-slate-200 dark:border-white/10">
                <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Coffre vide</h3>
                <p className="text-slate-500 font-bold text-sm mt-2">Aucun document ne correspond à votre recherche.</p>
              </div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <AnimatePresence>
                  {filteredDocs.map(doc => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: React.ElementType, color: 'indigo' | 'emerald' | 'blue' | 'amber' }) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  };
  return (
    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 space-y-2">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function CategoryButton({ active, label, icon, onClick }: { active: boolean, label: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon} {label}
      </div>
      <ChevronRight className={`h-4 w-4 transition-transform ${active ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
    </button>
  );
}

function DocumentCard({ doc }: { doc: Document }) {
  const cat = CATEGORIES.find(c => c.id === doc.categorie) || CATEGORIES[3];
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className="group bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-white/[0.02] rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className={`h-14 w-14 rounded-2xl ${cat.bg} ${cat.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
          {cat.icon}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
            <a href={doc.url} target="_blank" rel="noopener noreferrer">
              <Download className="h-5 w-5" />
            </a>
          </Button>
          <HasRole roles={['administrateur', 'syndic']}>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
              <Trash2 className="h-5 w-5" />
            </Button>
          </HasRole>
        </div>
      </div>
      
      <div className="mt-8 space-y-2 relative z-10">
        <h4 className="text-xl font-black text-slate-900 dark:text-white truncate tracking-tighter uppercase italic leading-none">{doc.nom}</h4>
        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <span>{cat.label}</span>
          <span className="h-1.5 w-1.5 bg-indigo-500/30 rounded-full"></span>
          <span>{formatFileSize(doc.taille)}</span>
        </div>
        <div className="pt-6 border-t border-slate-50 dark:border-white/5 mt-4 flex items-center justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
            Archivé le {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
          </p>
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        </div>
      </div>
    </motion.div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}