'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HasRole } from '@/components/auth-guard';
import Link from 'next/link';

export default function NouveauWikiPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('copropriete_id')
        .eq('id', user?.id)
        .single();

      const payload = {
        titre: formData.get('titre'),
        contenu: formData.get('contenu'),
        categorie: formData.get('categorie'),
        auteur_id: user?.id,
        copropriete_id: profile?.copropriete_id,
      };

      const { error } = await supabase.from('wiki_articles').insert(payload).select();
      if (error) throw new Error(error.message);

      toast.success('Article publie !');
      router.push('/dashboard/wiki');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Echec : ' + message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <HasRole roles={['administrateur', 'syndic']}>
      <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
        <Link href="/dashboard/wiki" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600">
          <ChevronLeft className="h-5 w-5" /> Retour
        </Link>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
            <div className="space-y-2">
              <Label>Titre de l&apos;article</Label>
              <Input name="titre" placeholder="Ex: Code de la porte d'entree" required className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
            </div>

            <div className="space-y-2">
              <Label>Categorie</Label>
              <Select name="categorie" defaultValue="Pratique">
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pratique">Pratique</SelectItem>
                  <SelectItem value="Reglement">Reglement</SelectItem>
                  <SelectItem value="Securite">Securite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea name="contenu" placeholder="Ecrivez ici..." required className="min-h-[200px] rounded-xl bg-slate-50 border-none font-medium" />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-14 bg-indigo-600 rounded-2xl font-black">
              {isLoading ? <Loader2 className="animate-spin" /> : "PUBLIER L'ARTICLE"}
            </Button>
          </div>
        </form>
      </div>
    </HasRole>
  );
}
