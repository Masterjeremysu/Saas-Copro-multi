import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ARTICLES = [
  {
    titre: "🚨 Sécurité : Procédures en cas d'urgence",
    categorie: "Urgences",
    contenu: "En cas de détection de fumée ou d'odeur de gaz, évacuez immédiatement les lieux par les escaliers (ne pas utiliser l'ascenseur). Appelez le 18 ou le 112. Le point de rassemblement se situe devant le portail principal de la résidence. Pour une coupure de gaz générale, la vanne d'arrêt se trouve dans le placard technique au rez-de-chaussée, accessible avec la clé carrée universelle."
  },
  {
    titre: "🚲 Local Vélos & Mobilités Douces",
    categorie: "Vie Quotidienne",
    contenu: "Le local vélos est situé au sous-sol -1. L'accès se fait via le badge de la résidence. Merci d'attacher vos vélos aux supports prévus et de ne pas encombrer les allées de circulation. Les vélos électriques ne doivent pas être chargés dans le local pour des raisons de sécurité incendie. Tout vélo abandonné depuis plus de 6 mois sera retiré après affichage préalable."
  },
  {
    titre: "🚰 Procédure de coupure d'eau individuelle",
    categorie: "Entretien",
    contenu: "Chaque appartement dispose d'une vanne d'arrêt générale située généralement dans la gaine technique de la salle de bain ou sous l'évier de la cuisine. En cas de fuite importante, fermez cette vanne immédiatement. Si la fuite concerne les parties communes, contactez d'urgence le gardien ou le numéro d'astreinte du syndic affiché dans le hall."
  },
  {
    titre: "📜 Rôle et fonctionnement du Conseil Syndical",
    categorie: "Règlementation",
    contenu: "Le Conseil Syndical (CS) est composé de copropriétaires élus en Assemblée Générale. Son rôle est de contrôler la gestion du syndic et de l'assister dans ses décisions. Le CS se réunit une fois par trimestre pour examiner les comptes et suivre l'avancement des travaux. Vous pouvez contacter les membres du CS via l'annuaire de CoproSync pour toute suggestion concernant la vie de la résidence."
  }
];

async function seedWiki() {
  console.log("🌱 Début de l'injection des données Wiki...");
  
  // On nettoie les anciens articles de test (optionnel)
  // await supabase.from('wiki_articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { error } = await supabase.from('wiki_articles').insert(ARTICLES);
  
  if (error) {
    console.error("❌ Erreur lors de l'insertion :", error);
  } else {
    console.log("✅ Données Wiki injectées avec succès !");
  }
}

seedWiki();
