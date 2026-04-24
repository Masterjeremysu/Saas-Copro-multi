import { createClient } from '@/utils/supabase/client';

export async function notifyCopropriete({
  coproprieteId,
  titre,
  message,
  lien,
  type
}: {
  coproprieteId: string;
  titre: string;
  message: string;
  lien?: string;
  type: 'vote' | 'agenda' | 'ticket' | 'annonce';
}) {
  const supabase = createClient();

  // 1. Récupérer tous les profils de cette copropriété
  const { data: users, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('copropriete_id', coproprieteId);

  if (fetchError || !users) {
    console.error("Erreur lors de la récupération des résidents pour notification:", fetchError);
    return;
  }

  // 2. Préparer les insertions groupées
  const notifications = users.map(user => ({
    user_id: user.id,
    titre,
    message,
    lien,
    type
  }));

  // 3. Insérer en base de données
  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error("Erreur lors de l'envoi des notifications groupées:", insertError);
  } else {
    console.log(`✅ ${notifications.length} notifications envoyées (Type: ${type})`);
  }
}
