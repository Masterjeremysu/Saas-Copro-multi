'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
// L'IMPORT CORRIGÉ EST ICI : J'ai ajouté ShieldAlert dans la liste
import { Building2, Key, Mail, Lock, User, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const prenom = formData.get('prenom') as string;
    const nom = formData.get('nom') as string;
    const codeInvitation = formData.get('code') as string;

    try {
      // 1. VÉRIFICATION DU CODE D'INVITATION
      const { data: codeData, error: codeError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', codeInvitation)
        .eq('actif', true)
        .maybeSingle(); // <--- LA SOLUTION PRO

      // Si le code est faux ou expiré, codeData sera null (plus de crash console)
      if (!codeData) {
        throw new Error("Ce code d'invitation est invalide, introuvable ou a déjà été utilisé.");
      }

      // 2. CRÉATION DU COMPTE SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 3. CRÉATION DU PROFIL UTILISATEUR LÍÉ À LA COPROPRIÉTÉ
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          email: email,
          prenom: prenom,
          nom: nom,
          role: codeData.role_attribue, 
          copropriete_id: codeData.copropriete_id 
        });

        if (profileError) throw profileError;

        // 4. DÉSACTIVATION DU CODE (Un code = un usage)
        await supabase
          .from('invitation_codes')
          .update({ actif: false })
          .eq('id', codeData.id);

        toast.success("Compte créé avec succès ! Bienvenue.");
        router.push('/dashboard');
      }

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4">
      <div className="w-full max-w-[1000px] flex rounded-[3rem] overflow-hidden shadow-2xl bg-white">
        
        {/* COLONNE GAUCHE (BRANDING) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -ml-40 -mt-40"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter">COPROSYNC</span>
          </div>

          <div className="relative z-10 space-y-6">
            <h1 className="text-5xl font-black tracking-tighter leading-[1.1]">
              Rejoignez votre <br/><span className="text-indigo-400">résidence.</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg max-w-sm">
              Saisissez la clé d'activation fournie par votre syndic pour accéder à votre espace de gestion dédié.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <ShieldAlert className="h-4 w-4" /> Plateforme Sécurisée
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (FORMULAIRE) */}
        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-8">
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Créer un compte</h2>
              <p className="text-slate-500 font-medium">Configurez votre profil d'accès.</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">Clé d'invitation CoproSync</Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                  <Input 
                    name="code" 
                    placeholder="Ex: ADMIN-X7Y8-Z9W1" 
                    required 
                    className="pl-12 h-14 rounded-2xl bg-indigo-50/50 border-indigo-100 font-mono font-bold text-lg focus:ring-4 focus:ring-indigo-100 text-indigo-900 placeholder:text-indigo-300" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Prénom</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input name="prenom" required className="pl-11 h-12 rounded-xl bg-slate-50 border-none font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom</Label>
                  <Input name="nom" required className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input name="email" type="email" required className="pl-11 h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input name="password" type="password" required className="pl-11 h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg transition-transform active:scale-95 mt-4">
                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <>Activer mon compte <ArrowRight className="ml-2 h-5 w-5" /></>}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-slate-500 font-medium">
                Vous avez déjà un compte ?{' '}
                <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                  Connectez-vous
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}