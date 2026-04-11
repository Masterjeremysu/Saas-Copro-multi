'use client';

import Link from 'next/link';
import { 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Users, 
  Wrench, 
  LineChart,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <Zap className="h-6 w-6 text-white fill-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900">COPROSYNC</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-bold text-slate-600 hover:text-indigo-600 rounded-xl">
                Se connecter
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-slate-900 hover:bg-black text-white rounded-xl font-bold px-6 shadow-xl">
                Activer un code
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            <div className="flex-1 space-y-8 text-center lg:text-left z-10">
              <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none px-4 py-2 font-black uppercase tracking-widest text-[10px] rounded-full">
                La plateforme n°1 des syndics innovants
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1]">
                Gérez votre copropriété avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">zéro stress.</span>
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Centralisez les signalements, coordonnez les prestataires et informez les résidents en temps réel. Le tout, depuis une interface unifiée et ultra-sécurisée.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                <Link href="/signup">
                  <Button className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-lg font-black shadow-2xl shadow-indigo-200 transition-transform hover:scale-105">
                    J'ai un code d'invitation <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="h-14 px-8 rounded-2xl border-slate-200 text-slate-700 text-lg font-bold hover:bg-slate-50">
                  Demander une démo
                </Button>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-sm font-bold text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sans engagement</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Support 7/7</span>
              </div>
            </div>

            <div className="flex-1 relative w-full max-w-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-rose-400 rounded-[3rem] blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative bg-[#0F172A] rounded-[3rem] p-8 shadow-2xl border border-slate-800 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <Badge className="bg-white/10 text-white border-none text-[9px] uppercase tracking-widest font-bold">App Preview</Badge>
                </div>
                <div className="space-y-4">
                  <div className="h-20 bg-white/5 rounded-2xl border border-white/10 flex items-center px-6 gap-4">
                     <div className="h-10 w-10 bg-indigo-500 rounded-xl"></div>
                     <div className="space-y-2 flex-1">
                       <div className="h-3 w-1/3 bg-white/20 rounded-full"></div>
                       <div className="h-2 w-1/4 bg-white/10 rounded-full"></div>
                     </div>
                  </div>
                  <div className="h-20 bg-white/5 rounded-2xl border border-white/10 flex items-center px-6 gap-4 opacity-70">
                     <div className="h-10 w-10 bg-rose-500 rounded-xl"></div>
                     <div className="space-y-2 flex-1">
                       <div className="h-3 w-1/2 bg-white/20 rounded-full"></div>
                       <div className="h-2 w-1/3 bg-white/10 rounded-full"></div>
                     </div>
                  </div>
                  <div className="h-20 bg-white/5 rounded-2xl border border-white/10 flex items-center px-6 gap-4 opacity-40">
                     <div className="h-10 w-10 bg-amber-500 rounded-xl"></div>
                     <div className="space-y-2 flex-1">
                       <div className="h-3 w-1/4 bg-white/20 rounded-full"></div>
                       <div className="h-2 w-1/5 bg-white/10 rounded-full"></div>
                     </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* FEATURES SECTION */}
      <section className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Pensé pour l'efficacité.</h2>
            <p className="text-slate-500 font-medium text-lg">CoproSync remplace les emails perdus, les appels inutiles et les tableaux Excel par un flux de travail automatisé.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Wrench className="h-6 w-6 text-indigo-600" />}
              title="Gestion des Incidents"
              description="Signalements géolocalisés avec photos. Suivi en temps réel de la progression de la réparation."
            />
            <FeatureCard 
              icon={<Users className="h-6 w-6 text-indigo-600" />}
              title="Annuaire Technique"
              description="Tous les contrats et contacts des prestataires (plombiers, ascensoristes) centralisés en un clic."
            />
            <FeatureCard 
              icon={<LineChart className="h-6 w-6 text-indigo-600" />}
              title="Analyses & Registres"
              description="Génération automatique du carnet d'entretien numérique et statistiques de résolution pour vos AG."
            />
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="bg-slate-900 py-24 text-white text-center px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <Building2 className="h-16 w-16 text-indigo-500 mx-auto" />
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Prêt à moderniser votre immeuble ?</h2>
          <p className="text-slate-400 text-lg font-medium">Rejoignez les dizaines de copropriétés qui ont déjà fait le choix de la transparence et de l'efficacité.</p>
          <div className="pt-8">
            <Button className="h-14 px-10 rounded-2xl bg-white text-slate-900 hover:bg-indigo-50 font-black text-lg transition-transform hover:scale-105 shadow-2xl">
              Contacter l'équipe commerciale
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:shadow-xl transition-all group">
      <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
    </div>
  );
}