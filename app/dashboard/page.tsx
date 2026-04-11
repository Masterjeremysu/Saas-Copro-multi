'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Ticket, 
  Users, 
  Building2, 
  ArrowRight, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // 1. On récupère le user connecté
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user; // Sécurité pour éviter le ReferenceError

      if (user) {
        // 2. On récupère le profil et la copropriété
        const { data: rawProfile } = await supabase
          .from('profiles')
          .select('*, copropriete:coproprietes(nom)')
          .eq('id', user.id)
          .single();
        
        // FIX TYPESCRIPT : On force le type 'any' pour éviter l'erreur de tableau
        const profile = rawProfile as any;
        
        // On sécurise l'objet copropriete au cas où Supabase renvoie un tableau
        if (profile?.copropriete && Array.isArray(profile.copropriete)) {
          profile.copropriete = profile.copropriete[0];
        }

        // 3. On compte les tickets ouverts
        const { count: ticketsCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .neq('statut', 'résolu');

        setData({ profile, ticketsCount });
      }
      setIsLoading(false);
    }
    
    loadData();
  }, []);

  if (isLoading) return <div className="p-10 animate-pulse text-slate-400 font-bold italic">Préparation du cockpit...</div>;

  return (
    <div className="p-6 lg:p-10 space-y-10">
      
      {/* BANNIÈRE DYNAMIQUE */}
      <div className="bg-indigo-600 rounded-[3rem] p-10 lg:p-16 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter leading-tight">
            Bonjour, {data?.profile?.prenom || 'Utilisateur'} !
          </h1>
          <p className="text-indigo-100 text-lg lg:text-xl font-medium max-w-xl">
            Tout est sous contrôle à <span className="font-black italic underline decoration-indigo-400 underline-offset-4">{data?.profile?.copropriete?.nom || 'votre résidence'}</span>. 
            Il y a {data?.ticketsCount || 0} dossiers en attente de traitement.
          </p>
          <div className="pt-4 flex gap-4">
             <Link href="/dashboard/tickets">
               <Button className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl px-8 h-14 font-black text-lg">
                 Voir les urgences <ArrowRight className="ml-2 h-5 w-5" />
               </Button>
             </Link>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickCard 
          title="Incidents Actifs" 
          value={data?.ticketsCount || 0} 
          icon={<AlertTriangle className="text-rose-500" />} 
          color="bg-rose-50"
        />
        <QuickCard 
          title="Membres" 
          value="42" 
          icon={<Users className="text-indigo-600" />} 
          color="bg-indigo-50"
        />
        <QuickCard 
          title="Prochaine AG" 
          value="15 Juin" 
          icon={<Clock className="text-amber-500" />} 
          color="bg-amber-50"
        />
      </div>

      {/* SECTION RÉCENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-8">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black">Dernières Activités</CardTitle>
            </CardHeader>
            <div className="space-y-6">
              <p className="text-slate-400 italic font-medium">Aucun mouvement récent dans la copropriété.</p>
            </div>
          </Card>
          
          <div className="bg-[#0F172A] rounded-[2.5rem] p-10 text-white flex flex-col justify-between">
            <div className="space-y-4">
              <Building2 className="h-10 w-10 text-indigo-400" />
              <h3 className="text-2xl font-black tracking-tighter">Besoin d'aide ?</h3>
              <p className="text-slate-400 font-medium">Consultez le Wiki ou contactez le support technique de CoproSync pour toute question sur l'outil.</p>
            </div>
            <Link href="/dashboard/wiki">
              <Button variant="outline" className="mt-8 border-slate-700 text-white hover:bg-white/5 rounded-xl h-12 font-bold w-full md:w-auto">
                Ouvrir le centre d'aide
              </Button>
            </Link>
          </div>
      </div>
    </div>
  );
}

function QuickCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
      <div className={`p-4 ${color} rounded-2xl group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </div>
  );
}