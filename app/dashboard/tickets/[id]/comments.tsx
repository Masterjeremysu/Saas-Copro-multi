'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, User, Loader2 } from 'lucide-react';

export function TicketComments({ ticketId }: { ticketId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  // Charger les commentaires
  async function fetchComments() {
    const { data } = await supabase
      .from('commentaires')
      .select('*, auteur:profiles(nom, prenom)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  }

  useEffect(() => { fetchComments(); }, [ticketId]);

  // Envoyer un commentaire
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('commentaires').insert({
      ticket_id: ticketId,
      auteur_id: user?.id,
      contenu: newComment,
    });

    if (error) {
      toast.error("Erreur d'envoi");
    } else {
      setNewComment('');
      fetchComments(); // Rafraîchir la liste
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div className="bg-white border rounded-2xl p-3 px-4 shadow-sm max-w-[80%]">
              <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">
                {c.auteur?.prenom} {c.auteur?.nom}
              </p>
              <p className="text-sm text-slate-700">{c.contenu}</p>
              <p className="text-[9px] text-slate-400 mt-2">
                {new Date(c.created_at).toLocaleDateString()} à {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="relative mt-4">
        <Textarea 
          placeholder="Ajouter une précision ou une question..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="pr-12 min-h-[80px] rounded-2xl border-slate-200 focus:ring-indigo-500"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={isSubmitting || !newComment.trim()}
          className="absolute right-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}