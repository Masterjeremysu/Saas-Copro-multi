'use client';

import Link from 'next/link';
import { 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Wrench, 
  LineChart,
  CheckCircle2,
  Vote,
  Bell,
  FileText,
  Star,
  ChevronRight,
  Globe,
  Lock,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/logo';

const FEATURES = [
  { icon: Wrench, title: "Gestion des Incidents", description: "Signalements avec photos et suivi en temps réel de chaque intervention technique.", color: "text-rose-600", bg: "bg-rose-50" },
  { icon: Users, title: "Annuaire & Prestataires", description: "Contacts des résidents et prestataires centralisés. Matching intelligent par spécialité.", color: "text-indigo-600", bg: "bg-indigo-50" },
  { icon: Vote, title: "Votes & Sondages", description: "Consultations numériques avec quorum, anonymat optionnel et export PDF des résultats.", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: Bell, title: "Notifications Temps Réel", description: "Alertes instantanées pour chaque événement important de la copropriété.", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: FileText, title: "Coffre-fort & Contrats", description: "Archivage sécurisé de tous les documents officiels et contrats de maintenance.", color: "text-violet-600", bg: "bg-violet-50" },
  { icon: LineChart, title: "Statistiques & Audit", description: "Tableaux de bord décisionnels et journal d'audit complet pour vos AG.", color: "text-sky-600", bg: "bg-sky-50" },
];

const PRICING = [
  { 
    name: "Essentiel", 
    price: "29", 
    period: "/mois",
    description: "Pour les petites copropriétés",
    features: ["Jusqu'à 30 lots", "Signalements illimités", "Votes & Sondages", "Notifications", "Support email"],
    cta: "Commencer",
    highlight: false
  },
  { 
    name: "Professionnel", 
    price: "79", 
    period: "/mois",
    description: "Pour les syndics exigeants",
    features: ["Jusqu'à 200 lots", "Tout Essentiel +", "Coffre-fort documents", "Contrats & Carnet", "Conseil Syndical", "Support prioritaire"],
    cta: "Essai gratuit 30 jours",
    highlight: true
  },
  { 
    name: "Entreprise", 
    price: "Sur devis", 
    period: "",
    description: "Multi-résidences & sur-mesure",
    features: ["Lots illimités", "Tout Professionnel +", "Multi-copropriétés", "API & Intégrations", "SLA garanti", "Account manager dédié"],
    cta: "Contacter l'équipe",
    highlight: false
  },
];

const STATS = [
  { value: "2,400+", label: "Résidents connectés" },
  { value: "98%", label: "Taux de satisfaction" },
  { value: "< 24h", label: "Temps de réponse moyen" },
  { value: "150+", label: "Copropriétés" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC] selection:bg-indigo-100 selection:text-indigo-900 font-sans overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Tarifs</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">Sécurité</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-bold text-slate-600 hover:text-indigo-600 rounded-xl text-sm">
                Connexion
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-4 lg:px-6 shadow-xl shadow-indigo-200 text-sm">
                Démarrer <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <main className="pt-28 lg:pt-40 pb-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 space-y-6 lg:space-y-8 text-center lg:text-left z-10"
            >
              <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none px-4 py-2 font-black uppercase tracking-widest text-[10px] rounded-full">
                Plateforme n°1 des syndics innovants
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-[1.05]">
                Gérez votre copro avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">zéro stress.</span>
              </h1>
              <p className="text-base lg:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Centralisez signalements, votes et contrats. Informez les résidents en temps réel. Le tout depuis une interface mobile-first ultra-sécurisée.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
                <Link href="/signup">
                  <Button className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base lg:text-lg font-black shadow-2xl shadow-indigo-200 transition-all hover:scale-105 w-full sm:w-auto">
                    Essai gratuit 30 jours <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="h-14 px-8 rounded-2xl border-slate-200 text-slate-700 text-base lg:text-lg font-bold hover:bg-slate-50 w-full sm:w-auto">
                  Voir une démo
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 lg:gap-6 pt-2 text-xs lg:text-sm font-bold text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sans engagement</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Support 7/7</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> RGPD</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, rotate: 3 }}
              animate={{ opacity: 1, scale: 1, rotate: 2 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex-1 relative w-full max-w-lg lg:max-w-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-rose-400 rounded-[3rem] blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative bg-[#0F172A] rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-8 shadow-2xl border border-slate-800 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-6 lg:mb-8 border-b border-white/10 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <Badge className="bg-white/10 text-white border-none text-[9px] uppercase tracking-widest font-bold">CoproSync V3</Badge>
                </div>
                <div className="space-y-3 lg:space-y-4">
                  {[
                    { color: "bg-indigo-500", w1: "w-1/3", w2: "w-1/4", opacity: "" },
                    { color: "bg-rose-500", w1: "w-1/2", w2: "w-1/3", opacity: "opacity-70" },
                    { color: "bg-amber-500", w1: "w-1/4", w2: "w-1/5", opacity: "opacity-40" },
                  ].map((row, i) => (
                    <div key={i} className={`h-16 lg:h-20 bg-white/5 rounded-xl lg:rounded-2xl border border-white/10 flex items-center px-4 lg:px-6 gap-4 ${row.opacity}`}>
                      <div className={`h-8 w-8 lg:h-10 lg:w-10 ${row.color} rounded-lg lg:rounded-xl shrink-0`}></div>
                      <div className="space-y-2 flex-1">
                        <div className={`h-2.5 lg:h-3 ${row.w1} bg-white/20 rounded-full`}></div>
                        <div className={`h-2 ${row.w2} bg-white/10 rounded-full`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </main>

      {/* SOCIAL PROOF NUMBERS */}
      <section className="border-y border-slate-100 bg-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl lg:text-4xl font-black text-indigo-600 italic">{stat.value}</p>
              <p className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-20 lg:py-28 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16 space-y-4">
            <Badge className="bg-indigo-50 text-indigo-700 border-none font-black uppercase tracking-widest text-[10px] px-4 py-1.5 rounded-full">Fonctionnalités</Badge>
            <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight">Tout ce dont vous avez besoin.</h2>
            <p className="text-slate-500 font-medium text-base lg:text-lg">Remplacez les emails perdus, les appels inutiles et les tableaux Excel par un flux automatisé.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 lg:p-8 bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 hover:shadow-xl transition-all group"
              >
                <div className={`h-12 w-12 lg:h-14 lg:w-14 ${feature.bg} rounded-xl lg:rounded-2xl shadow-sm flex items-center justify-center mb-5 lg:mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg lg:text-xl font-black text-slate-900 mb-2 lg:mb-3">{feature.title}</h3>
                <p className="text-sm lg:text-base text-slate-500 font-medium leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY SECTION */}
      <section id="security" className="bg-[#0F172A] py-20 lg:py-28 px-4 lg:px-8 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black uppercase tracking-widest text-[10px] px-4 py-1.5 rounded-full">Sécurité</Badge>
              <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">Vos données sont <span className="text-emerald-400">sacrées.</span></h2>
              <p className="text-slate-400 font-medium text-base lg:text-lg leading-relaxed">CoproSync utilise un chiffrement de niveau bancaire et une authentification à double facteur. Vos documents et données personnelles ne quittent jamais l&apos;espace sécurisé de votre copropriété.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              {[
                { icon: Lock, title: "Chiffrement AES-256", desc: "Données chiffrées au repos et en transit" },
                { icon: ShieldCheck, title: "Conforme RGPD", desc: "Hébergement 100% européen" },
                { icon: Globe, title: "RLS Supabase", desc: "Isolation par copropriété native" },
                { icon: Smartphone, title: "Auth 2FA", desc: "Double authentification disponible" },
              ].map((item) => (
                <div key={item.title} className="p-5 lg:p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <item.icon className="h-6 w-6 text-emerald-400" />
                  <h4 className="font-black text-sm lg:text-base">{item.title}</h4>
                  <p className="text-xs lg:text-sm text-slate-400 font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 lg:py-28 px-4 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16 space-y-4">
            <Badge className="bg-indigo-50 text-indigo-700 border-none font-black uppercase tracking-widest text-[10px] px-4 py-1.5 rounded-full">Tarifs</Badge>
            <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight">Simple, transparent, sans surprise.</h2>
            <p className="text-slate-500 font-medium text-base lg:text-lg">Choisissez le plan adapté à la taille de votre copropriété.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border-2 transition-all ${
                  plan.highlight 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xl shadow-indigo-200 scale-105' 
                    : 'bg-white border-slate-100 hover:shadow-xl'
                }`}
              >
                <h3 className={`text-lg font-black uppercase tracking-widest ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-3 mb-4">
                  <span className="text-4xl lg:text-5xl font-black">{plan.price}</span>
                  {plan.period && <span className={`text-sm font-bold ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{plan.period}</span>}
                </div>
                <p className={`text-sm font-medium mb-6 ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm font-bold">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? 'text-white' : 'text-emerald-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className={`w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest ${
                  plan.highlight 
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50' 
                    : 'bg-slate-900 text-white hover:bg-black'
                }`}>
                  {plan.cta} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 lg:py-28 px-4 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16 space-y-4">
            <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight">Ils nous font confiance.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { quote: "CoproSync a transformé notre gestion quotidienne. Les signalements sont traités 3x plus vite.", author: "Marie D.", role: "Présidente du Conseil Syndical", stars: 5 },
              { quote: "Enfin une solution qui rassemble tout en un seul endroit. Plus de mails perdus.", author: "Pierre L.", role: "Syndic professionnel", stars: 5 },
              { quote: "L'interface mobile est parfaite. Je gère tout depuis mon téléphone entre deux visites.", author: "Karim B.", role: "Gestionnaire immobilier", stars: 5 },
            ].map((t) => (
              <div key={t.author} className="p-6 lg:p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm lg:text-base text-slate-700 font-medium leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-black text-slate-900 text-sm">{t.author}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="bg-[#0F172A] py-20 lg:py-28 text-white text-center px-4 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6 lg:space-y-8">
          <Building2 className="h-12 w-12 lg:h-16 lg:w-16 text-indigo-500 mx-auto" />
          <h2 className="text-3xl lg:text-5xl font-black tracking-tighter">Prêt à moderniser votre immeuble ?</h2>
          <p className="text-slate-400 text-base lg:text-lg font-medium">Rejoignez les dizaines de copropriétés qui ont déjà fait le choix de la transparence et de l&apos;efficacité.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-base lg:text-lg transition-all hover:scale-105 shadow-2xl shadow-indigo-900/30 w-full sm:w-auto">
                Essai gratuit 30 jours <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" className="h-14 px-10 rounded-2xl border-white/20 text-white hover:bg-white/10 font-bold text-base lg:text-lg w-full sm:w-auto">
              Demander une démo
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0F1A] py-12 lg:py-16 px-4 lg:px-8 text-slate-500 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between gap-8">
          <div className="space-y-3">
            <Logo variant="white" className="mb-4 scale-90 origin-left" />
            <p className="text-sm font-medium max-w-xs">Gestion de copropriété connectée. Signalements, votes, contrats en temps réel.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <p className="font-black text-white text-[10px] uppercase tracking-widest">Produit</p>
              <a href="#features" className="block hover:text-white transition-colors">Fonctionnalités</a>
              <a href="#pricing" className="block hover:text-white transition-colors">Tarifs</a>
              <a href="#security" className="block hover:text-white transition-colors">Sécurité</a>
            </div>
            <div className="space-y-3">
              <p className="font-black text-white text-[10px] uppercase tracking-widest">Légal</p>
              <a href="#" className="block hover:text-white transition-colors">CGV</a>
              <a href="#" className="block hover:text-white transition-colors">Politique de confidentialité</a>
              <a href="#" className="block hover:text-white transition-colors">RGPD</a>
            </div>
            <div className="space-y-3">
              <p className="font-black text-white text-[10px] uppercase tracking-widest">Contact</p>
              <a href="#" className="block hover:text-white transition-colors">contact@coprosync.fr</a>
              <a href="#" className="block hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-4 text-xs font-bold">
          <p>© {new Date().getFullYear()} CoproSync. Tous droits réservés.</p>
          <p className="text-slate-600">Conçu avec ❤️ en France</p>
        </div>
      </footer>

    </div>
  );
}