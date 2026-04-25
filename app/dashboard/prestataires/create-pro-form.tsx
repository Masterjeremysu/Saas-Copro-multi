'use client';

import { useState } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

export function CreateProForm({ onProCreated }: { onProCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // On récupère l'ID de la copropriété de l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

    const { error } = await supabase.from('prestataires').insert({
      nom: formData.get('nom'),
      specialite: formData.get('specialite'),
      telephone: formData.get('telephone'),
      email: formData.get('email'),
      contrat_numero: formData.get('contrat_numero'),
      copropriete_id: profile?.copropriete_id
    });

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Prestataire ajouté avec succès !");
      setOpen(false);
      onProCreated();
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 shadow-xl shadow-indigo-100 font-bold">
          <Plus className="mr-2 h-5 w-5" /> Ajouter un partenaire
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Nouveau Prestataire</DialogTitle>
          <DialogDescription>Enregistrez une entreprise de maintenance.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-1">
            <Label>Nom de l&apos;entreprise</Label>
            <Input name="nom" placeholder="Ex: Otis, Veolia, etc." required className="rounded-xl h-11" />
          </div>

          <div className="space-y-1">
            <Label>Spécialité</Label>
            <Select name="specialite" defaultValue="Autre">
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Choisir un métier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Plomberie">Plomberie</SelectItem>
                <SelectItem value="Électricité">Électricité</SelectItem>
                <SelectItem value="Ascenseur">Ascenseur</SelectItem>
                <SelectItem value="Chauffage">Chauffage</SelectItem>
                <SelectItem value="Espaces Verts">Espaces Verts</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input name="telephone" placeholder="01..." required className="rounded-xl h-11" />
            </div>
            <div className="space-y-1">
              <Label>N° Contrat</Label>
              <Input name="contrat_numero" placeholder="Optionnel" className="rounded-xl h-11" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input name="email" type="email" placeholder="contact@entreprise.com" required className="rounded-xl h-11" />
          </div>

          <Button type="submit" className="w-full bg-indigo-600 h-12 rounded-2xl font-bold mt-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Enregistrer le partenaire"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
