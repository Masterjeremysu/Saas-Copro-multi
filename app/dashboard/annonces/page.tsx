'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Megaphone, 
  Clock, 
  Loader2,
  AlertTriangle,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AnnoncesPage() {
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const supabase = createClient();

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const fetchAnnonces = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('annonces')
      .select('*, auteur:profiles(prenom, nom, role)')
      .order('prioritaire', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) setAnnonces(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchAnnonces(); }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    setIsPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('copropriete_id').eq('id', user?.id).single();

      const { error } = await supabase.from('annonces').insert({
        titre: newTitle,
        contenu: newContent,
        auteur_id: user?.id,
        copropriete_id: profile?.copropriete_id,
        prioritaire: false
      });

      if (error) throw error;

      toast.success("Annonce publiée sur le mur !");
      setNewTitle('');
      setNewContent('');
      fetchAnnonces();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-4xl mx-auto mb-20">
      
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3 italic">
          <Megaphone className="h-10 w-10 text-indigo-600" /> Le Mur
        </h1>
        <p className="text-slate-500 font-medium">L'actualité de votre résidence en temps réel.</p>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-xl shadow-indigo-100/50 overflow-hidden">
        <CardContent className="p-8 space-y-4">
          <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">Nouvelle publication</p>
          <form onSubmit={handlePost} className="space-y-4">
            <Input 
              placeholder="Titre de l'annonce..." 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-4 focus:ring-indigo-50"
            />
            <Textarea 
              placeholder="Que voulez-vous dire à vos voisins ?" 
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[100px] rounded-xl bg-slate-50 border-none font-medium focus:ring-4 focus:ring-indigo-50"
            />
            <div className="flex justify-end">
              <Button disabled={isPosting} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8 h-12 font-black shadow-lg">
                {isPosting ? <Loader2 className="animate-spin h-5 w-5" /> : <><Send className="mr-2 h-4 w-4" /> Publier</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6 pt-4">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
        ) : annonces.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold italic">Le mur est vide. Soyez le premier à poster !</p>
          </div>
        ) : (
          annonces.map((post) => (
            <Card key={post.id} className={`rounded-[2.5rem] border-none shadow-sm overflow-hidden transition-all hover:shadow-md ${
              post.prioritaire ? 'ring-2 ring-rose-500 ring-offset-4' : ''
            }`}>
              <CardContent className="p-0">
                <div className={`px-8 py-3 flex justify-between items-center ${
                  post.prioritaire ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400'
                }`}>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Clock className="h-3 w-3" /> {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-8 space-y-4 bg-white">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
                      {post.titre}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600">{post.auteur?.prenom} {post.auteur?.nom}</span>
                      <Badge variant="outline" className="text-[9px] font-black uppercase opacity-40 px-2">
                        {post.auteur?.role}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                    {post.contenu}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}