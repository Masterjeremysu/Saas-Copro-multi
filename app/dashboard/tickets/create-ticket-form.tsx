'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { notifyCopropriete } from '@/utils/notification-service';
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Camera } from "lucide-react";

export function CreateTicketForm({ onTicketCreated }: { onTicketCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    let imageUrl = null;

    try {
      // 1. Upload de l'image (si présente)
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('ticket-images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      // 2. Récupération infos utilisateur
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      // 3. Insertion du ticket
      const { error } = await supabase.from('tickets').insert({
        titre: formData.get('titre'),
        description: formData.get('description'),
        categorie: formData.get('categorie'),
        batiment: formData.get('batiment'),
        urgence: formData.get('urgence'), // Ici on envoie "basse", "normale", etc.
        image_url: imageUrl,
        auteur_id: user?.id,
        copropriete_id: profile?.copropriete_id
      });

      if (error) throw error;

      // Notification automatique à toute la copro
      await notifyCopropriete({
        coproprieteId: profile?.copropriete_id,
        titre: `🔧 Nouveau Signalement`,
        message: `"${formData.get('titre')}" a été signalé (${formData.get('urgence')}).`,
        lien: '/dashboard/tickets',
        type: 'ticket'
      });

      toast.success("Signalement envoyé !");
      setOpen(false);
      setFile(null);
      onTicketCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      console.error("Erreur détaillée :", err);
      toast.error("Erreur : " + message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Signaler un problème
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouveau signalement</DialogTitle>
          <DialogDescription>Détaillez le problème pour les techniciens.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-1">
            <Label>Titre</Label>
            <Input name="titre" placeholder="Ex: Fuite d'eau" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Bâtiment</Label>
              <Input name="batiment" placeholder="Tour 17" required />
            </div>
            <div className="space-y-1">
              <Label>Urgence</Label>
              <Select name="urgence" defaultValue="normale">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basse">Basse</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="critique">Critique 🔥</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Catégorie</Label>
            <Select name="categorie" defaultValue="autre">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plomberie">Plomberie</SelectItem>
                <SelectItem value="electricite">Électricité</SelectItem>
                <SelectItem value="ascenseur">Ascenseur</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea name="description" placeholder="Plus de détails..." />
          </div>

          <div className="space-y-2 pt-2">
            <Label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <Camera className="h-5 w-5 text-indigo-500" />
              <span className="text-xs text-slate-500 truncate">
                {file ? file.name : "Prendre/Ajouter une photo"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Label>
          </div>

          <Button type="submit" className="w-full bg-indigo-600" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Envoyer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}