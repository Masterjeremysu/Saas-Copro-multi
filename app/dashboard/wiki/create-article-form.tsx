'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilePlus, Loader2 } from "lucide-react";

interface WikiCategory {
  id: string;
  titre: string;
}

export function CreateArticleForm({ onArticleCreated }: { onArticleCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const supabase = useMemo(() => createClient(), []);

  // Charger les catégories pour le menu déroulant
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('wiki_categories').select('*').order('titre');
      if (data) setCategories(data);
    }
    if (open) fetchCategories();
  }, [open, supabase]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    const { error } = await supabase.from('wiki_articles').insert({
      categorie_id: formData.get('categorie_id'),
      titre: formData.get('titre'),
      contenu: formData.get('contenu'),
    });

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Article ajouté au livret !");
      setOpen(false);
      onArticleCreated();
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
          <FilePlus className="mr-2 h-4 w-4" /> Nouvel article
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter au livret d&apos;accueil</DialogTitle>
          <DialogDescription>
            Partagez une information utile avec tous les résidents.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-1">
            <Label>Catégorie</Label>
            <Select name="categorie_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.titre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label>Titre de l&apos;article</Label>
            <Input name="titre" placeholder="Ex: Code du portillon piéton" required />
          </div>

          <div className="space-y-1">
            <Label>Contenu</Label>
            <Textarea 
              name="contenu" 
              placeholder="Détaillez l'information ici..." 
              className="min-h-[150px]"
              required 
            />
          </div>

          <Button type="submit" className="w-full bg-indigo-600" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Publier l&apos;article"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
