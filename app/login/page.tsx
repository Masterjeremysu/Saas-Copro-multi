'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Content de vous revoir !");
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error("Erreur de connexion : " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4">
      <div className="w-full max-w-[1000px] flex rounded-[3rem] overflow-hidden shadow-2xl bg-white min-h-[600px]">
        
        {/* COLONNE GAUCHE (BRANDING / IMAGE) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -mr-40 -mt-40"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter">COPROSYNC</span>
          </div>

          <div className="relative z-10 space-y-6">
            <h1 className="text-5xl font-black tracking-tighter leading-[1.1]">
              Votre gestion,<br/><span className="text-indigo-400">partout.</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg max-w-sm">
              Accédez à votre tableau de bord résident ou syndic et gardez un œil sur votre copropriété en temps réel.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Connexion Sécurisée
          </div>
        </div>

        {/* COLONNE DROITE (FORMULAIRE) */}
        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-10">
            
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Connexion</h2>
              <p className="text-slate-500 font-medium">Heureux de vous revoir parmi nous.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Adresse Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    name="email" 
                    type="email" 
                    placeholder="nom@exemple.com" 
                    required 
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mot de passe</Label>
                  <Link href="#" className="text-[10px] font-black uppercase text-indigo-600 hover:underline">Oublié ?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    name="password" 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50" 
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <>Se connecter <ArrowRight className="h-5 w-5" /></>}
              </Button>
            </form>

            <div className="pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Pas encore de compte ?{' '}
                <Link href="/signup" className="text-indigo-600 font-black hover:underline underline-offset-4">
                  Activer un code résidence
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}