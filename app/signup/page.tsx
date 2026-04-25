'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Key, Mail, Lock, User, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

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
    const codeInvitation = (formData.get('code') as string).trim().toUpperCase();

    try {
      // 1. Consommation atomique du code (actif -> false en une seule operation)
      const { data: codeData, error: codeError } = await supabase
        .from('invitation_codes')
        .update({ actif: false })
        .select('id, role_attribue, copropriete_id')
        .eq('code', codeInvitation)
        .eq('actif', true)
        .maybeSingle();

      if (codeError) throw codeError;
      if (!codeData) {
        throw new Error("Ce code d'invitation est invalide, introuvable ou deja utilise.");
      }

      // 2. Creation du compte Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        await supabase.from('invitation_codes').update({ actif: true }).eq('id', codeData.id);
        throw authError;
      }

      if (!authData.user) {
        await supabase.from('invitation_codes').update({ actif: true }).eq('id', codeData.id);
        throw new Error("Le compte n'a pas pu etre cree.");
      }

      // 3. Creation du profil utilisateur lie a la copropriete
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        prenom,
        nom,
        role: codeData.role_attribue,
        copropriete_id: codeData.copropriete_id,
      });

      if (profileError) {
        await supabase.from('invitation_codes').update({ actif: true }).eq('id', codeData.id);
        throw profileError;
      }

      toast.success('Compte cree avec succes ! Bienvenue.');
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4">
      <div className="w-full max-w-[1000px] flex rounded-[3rem] overflow-hidden shadow-2xl bg-white">
        <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -ml-40 -mt-40"></div>

          <div className="relative z-10 flex items-center gap-3">
            <Logo variant="white" />
          </div>

          <div className="relative z-10 space-y-6">
            <h1 className="text-5xl font-black tracking-tighter leading-[1.1]">
              Rejoignez votre <br />
              <span className="text-indigo-400">residence.</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg max-w-sm">
              Saisissez la cle d&apos;activation fournie par votre syndic pour acceder a votre espace de gestion dedie.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <ShieldAlert className="h-4 w-4" /> Plateforme securisee
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Creer un compte</h2>
              <p className="text-slate-500 font-medium">Configurez votre profil d&apos;acces.</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">
                  Cle d&apos;invitation CoproSync
                </Label>
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
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Prenom</Label>
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg transition-transform active:scale-95 mt-4"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  <>
                    Activer mon compte <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-slate-500 font-medium">
                Vous avez deja un compte ?{' '}
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
