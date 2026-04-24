import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Configuration Supabase Serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialisation de Resend (si la clé est présente)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const { copropriete_id, categorie, titre, urgence } = await request.json();

    if (!copropriete_id || !categorie) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // 1. Trouver les artisans concernés par cette catégorie dans cette copro
    const { data: artisans, error } = await supabase
      .from('profiles')
      .select('email, prenom, nom')
      .eq('copropriete_id', copropriete_id)
      .eq('role', 'artisan')
      .eq('specialite', categorie);

    if (error) throw error;

    if (!artisans || artisans.length === 0) {
      return NextResponse.json({ message: "Aucun artisan trouvé pour cette spécialité." }, { status: 200 });
    }

    // 2. Envoi / Simulation
    for (const artisan of artisans) {
      
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 24px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 20px;">🚨 CoproSync : Nouvelle Intervention</h1>
          </div>
          <div style="padding: 32px; color: #1e293b;">
            <p>Bonjour <strong>${artisan.prenom}</strong>,</p>
            <p>Une nouvelle demande nécessite votre expertise :</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 24px 0;">
              <p style="margin: 4px 0;"><strong>📍 Catégorie :</strong> ${categorie.toUpperCase()}</p>
              <p style="margin: 4px 0;"><strong>⚠️ Urgence :</strong> ${urgence.toUpperCase()}</p>
              <p style="margin: 4px 0;"><strong>📄 Sujet :</strong> ${titre}</p>
            </div>
            <p>Veuillez vous connecter sur votre espace mobile pour planifier la date de passage.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/tickets" 
               style="display: block; background-color: #4f46e5; color: white; padding: 16px; text-align: center; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 32px;">
              Voir le ticket sur mon mobile
            </a>
          </div>
        </div>
      `;

      if (resend) {
        // ENVOI RÉEL VIA RESEND
        await resend.emails.send({
          from: 'CoproSync <onboarding@resend.dev>',
          to: artisan.email,
          subject: `🚨 ${urgence.toUpperCase()} : ${titre}`,
          html: emailHtml,
        });
        console.log(`✅ Email RÉEL envoyé via Resend à : ${artisan.email}`);
      } else {
        // SIMULATION DANS LA CONSOLE
        console.log('\n====================================================');
        console.log(`ℹ️ [SIMULATION] Envoi d'email à : ${artisan.email}`);
        console.log(`📝 SUJET : ${titre}`);
        console.log('====================================================\n');
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: resend ? "Notifications envoyées par email." : "Simulation d'email réussie (Ajoutez RESEND_API_KEY pour l'envoi réel)." 
    }, { status: 200 });

  } catch (error) {
    console.error("Erreur API Notifications:", error);
    const message = error instanceof Error ? error.message : "Une erreur inconnue est survenue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
