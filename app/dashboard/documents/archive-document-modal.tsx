'use client';

import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { logAction } from '@/utils/audit';
import { toast } from 'sonner';

export function ArchiveDocumentModal({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('Technique');
  const [customName, setCustomName] = useState('');

  const supabase = createClient();

  const sanitizePath = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_/]/g, "");
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const tid = toast.loading("Archivage en cours...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile?.copropriete_id}/${sanitizePath(category)}/${fileName}`;

      const { error: storageError } = await supabase.storage.from('copropriete-docs').upload(filePath, file);
      if (storageError) throw storageError;

      const { data: doc, error: dbError } = await supabase.from('documents').insert({
        nom: customName || file.name,
        url_path: filePath,
        categorie: category,
        taille: file.size,
        type_mime: file.type,
        copropriete_id: profile?.copropriete_id,
        uploader_id: user?.id
      }).select().single();

      if (dbError) throw dbError;

      // LOG ENRICHI : On envoie le détail ici
      await logAction({
        action: 'DOCUMENT_UPLOAD',
        resourceType: 'documents',
        resourceId: doc.id,
        details: `Archivage du document : ${doc.nom}`,
        metadata: { category },
        severity: 'info'
      });

      toast.success("Document archivé", { id: tid });
      setOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(message, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-14 px-8 font-black text-lg shadow-xl shadow-indigo-100">
          <Upload className="mr-2 h-5 w-5" /> Archiver un document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tighter">Coffre-fort</DialogTitle>
          <DialogDescription>Ajouter une pièce officielle aux archives.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Sélectionner le fichier</Label>
            <Input type="file" onChange={(e) => {
              const f = e.target.files?.[0];
              if(f) { setFile(f); setCustomName(f.name); }
            }} className="rounded-xl bg-slate-50" />
          </div>
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Nom du document</Label>
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700">Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Règlement">Règlement de Copro</SelectItem>
                <SelectItem value="Procès-Verbaux">Procès-Verbaux AG</SelectItem>
                <SelectItem value="Factures">Factures & Devis</SelectItem>
                <SelectItem value="Technique">Dossiers Techniques</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={loading || !file} className="w-full h-14 bg-indigo-600 rounded-2xl font-black text-lg">
            {loading ? <Loader2 className="animate-spin" /> : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
