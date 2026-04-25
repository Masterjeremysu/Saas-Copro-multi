'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  User, 
  Bell, 
  Shield, 
  Moon, 
  Smartphone, 
  Mail, 
  Lock, 
  Save,
  Loader2,
  ChevronRight,
  LogOut,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useRef } from 'react';

interface UserProfile {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  specialite?: string;
  copropriete_id?: string;
  email?: string;
  telephone?: string;
  bio?: string;
  avatar_url?: string;
  notifications_enabled?: boolean;
  dark_mode_enabled?: boolean;
  two_factor_enabled?: boolean;
}

export default function ParametrePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile({ ...data, email: user.email });
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({
      prenom: profile.prenom,
      nom: profile.nom,
      specialite: profile.specialite,
      telephone: profile.telephone,
      bio: profile.bio,
      notifications_enabled: profile.notifications_enabled,
      dark_mode_enabled: profile.dark_mode_enabled,
      two_factor_enabled: profile.two_factor_enabled
    }).eq('id', profile.id);

    if (!error) {
      toast.success("Profil mis à jour avec succès !");
    } else {
      toast.error("Erreur lors de la sauvegarde.");
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setIsSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      // 1. Upload vers Supabase Storage (bucket 'avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Mettre à jour le profil en DB
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Photo mise à jour !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de la photo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-32">
      
      {/* TACTICAL HERO - MISSION CONTROL STYLE */}
      <div className="bg-[#0F172A] rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 text-white relative overflow-hidden shadow-2xl">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="space-y-6 text-center lg:text-left flex-1">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10"
            >
               <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#60a5fa]"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Centre de Configuration</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-8xl font-black tracking-tighter leading-none italic"
            >
               Mon <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-indigo-400">Profil</span>
            </motion.h1>
            
            <p className="text-slate-400 font-medium text-sm lg:text-xl max-w-xl leading-relaxed mx-auto lg:mx-0">
               Gérez vos accès, vos préférences de notification et personnalisez votre expérience CoproSync.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
             <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="h-16 lg:h-24 px-8 lg:px-12 rounded-[1.5rem] lg:rounded-[2.5rem] bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-600/30 font-black text-xs lg:text-xl uppercase tracking-widest transition-all active:scale-95 group"
              >
                 {isSaving ? <Loader2 className="h-6 w-6 lg:h-8 lg:w-8 animate-spin" /> : <><Save className="h-6 w-6 lg:h-8 lg:w-8 mr-4 group-hover:scale-110 transition-transform" /> ENREGISTRER</>}
              </Button>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* COLONNE GAUCHE : AVATAR & STATUT */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm text-center">
              <div className="relative inline-block mb-6">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 w-24 rounded-[2rem] bg-indigo-600 overflow-hidden flex items-center justify-center text-white text-3xl font-black italic shadow-2xl relative group cursor-pointer"
                >
                  {profile?.avatar_url ? (
                    <Image 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      width={96} 
                      height={96} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                  ) : (
                    <>{profile?.prenom?.[0]}{profile?.nom?.[0]}</>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 h-10 w-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 border border-slate-100 dark:border-white/5 transition-colors"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">{profile?.prenom} {profile?.nom}</h2>
              <Badge className="mt-2 bg-indigo-50 text-indigo-600 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
                {profile?.role || 'Résident'}
              </Badge>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">État du compte</h3>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-emerald-500" /> Vérifié</span>
                <span className="text-emerald-500 italic">ACTIF</span>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : FORMULAIRE */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">

              {/* INFORMATIONS PERSONNELLES */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                  <User className="h-4 w-4" /> Informations Personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Prénom</label>
                    <Input
                      value={profile?.prenom || ''}
                      onChange={(e) => { if (profile) setProfile({...profile, prenom: e.target.value}); }}
                      className="rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nom</label>
                    <Input
                      value={profile?.nom || ''}
                      onChange={(e) => { if (profile) setProfile({...profile, nom: e.target.value}); }}
                      className="rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input value={profile?.email || ''} disabled className="pl-12 rounded-xl bg-slate-50/50 dark:bg-white/5 border-none font-bold text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Téléphone</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="+33 6 00 00 00 00" 
                        value={profile?.telephone || ''} 
                        onChange={(e) => { if (profile) setProfile({...profile, telephone: e.target.value}); }}
                        className="pl-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">À propos / Bio</label>
                  <textarea
                    placeholder="Parlez-nous un peu de vous ou de votre rôle dans la copro..."
                    value={profile?.bio || ''}
                    onChange={(e) => { if (profile) setProfile({...profile, bio: e.target.value}); }}
                    className="w-full min-h-[100px] rounded-2xl bg-slate-50 dark:bg-white/5 border-none p-4 font-medium text-sm text-slate-600 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                  />
                </div>

                {/* Rôle affiché (non modifiable) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rôle Système</label>
                  <div className="h-12 rounded-xl bg-slate-100 dark:bg-white/[0.03] flex items-center px-4 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest border border-slate-200/50 dark:border-white/5">
                    <Shield className="h-4 w-4 mr-2" /> {profile?.role}
                  </div>
                </div>

                {/* Spécialité (artisans uniquement) */}
                {profile?.role === 'artisan' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-2">Spécialité Métier</label>
                    <select
                      value={profile?.specialite || ''}
                      onChange={(e) => { if (profile) setProfile({...profile, specialite: e.target.value}); }}
                      className="w-full h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900/30 px-4 font-black text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all"
                    >
                      <option value="">Sélectionner votre métier...</option>
                      <option value="Plomberie">Plomberie</option>
                      <option value="Électricité">Électricité</option>
                      <option value="Chauffage">Chauffage</option>
                      <option value="Toiture">Toiture</option>
                      <option value="Serrurerie">Serrurerie</option>
                      <option value="Ascenseur">Ascenseur</option>
                      <option value="Espaces Verts">Espaces Verts</option>
                      <option value="Parties Communes">Parties Communes</option>
                      <option value="Gros Œuvre">Gros Œuvre</option>
                    </select>
                    <p className="text-[10px] text-slate-400 italic ml-2">Permet au système de vous recommander pour les bons dossiers.</p>
                  </div>
                )}
              </div>

              {/* PRÉFÉRENCES */}
              <div className="pt-8 border-t border-slate-50 dark:border-white/5 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Préférences & Notifications
                </h3>
                <div className="space-y-4">
                  <ToggleItem 
                    icon={Moon} 
                    label="Mode sombre automatique" 
                    description="S'adapte à l'heure de la journée" 
                    checked={profile?.dark_mode_enabled ?? true} 
                    onChange={(val) => setProfile(p => p ? { ...p, dark_mode_enabled: val } : null)}
                  />
                  <ToggleItem 
                    icon={Smartphone} 
                    label="Notifications push" 
                    description="Alertes en temps réel sur mobile" 
                    checked={profile?.notifications_enabled ?? true} 
                    onChange={(val) => setProfile(p => p ? { ...p, notifications_enabled: val } : null)}
                  />
                  <ToggleItem 
                    icon={Lock} 
                    label="Double authentification" 
                    description="Sécurité renforcée de votre compte" 
                    checked={profile?.two_factor_enabled ?? false} 
                    onChange={(val) => setProfile(p => p ? { ...p, two_factor_enabled: val } : null)}
                  />
                </div>
              </div>

              {/* DÉCONNEXION */}
              <div className="pt-8 border-t border-slate-50 dark:border-white/5">
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full justify-between h-14 rounded-2xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-black text-xs uppercase tracking-widest group"
                >
                  <span className="flex items-center gap-3"><LogOut className="h-5 w-5" /> Se déconnecter</span>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
}

function ToggleItem({ icon: Icon, label, description, checked, onChange }: { 
  icon: React.ComponentType<{ className?: string }>, 
  label: string, 
  description: string, 
  checked: boolean, 
  onChange: (val: boolean) => void 
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{label}</p>
          <p className="text-[10px] font-medium text-slate-400">{description}</p>
        </div>
      </div>
      <div 
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full p-1 transition-colors duration-200 cursor-pointer ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'}`}
      >
        <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
