'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Mail, Shield, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ProfilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      setIsLoading(false);
    }
    getProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update(profile).eq('id', profile.id);
    if (!error) toast.success("Profil mis à jour !");
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-10 animate-pulse font-bold text-slate-400 italic">Chargement de vos réglages...</div>;

  return (
    <div className="p-6 lg:p-10 max-w-4xl space-y-10">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Paramètres</h1>
        <p className="text-slate-500 font-medium">Gérez vos informations personnelles et préférences.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Prénom</Label>
            <Input 
              value={profile?.prenom || ''} 
              onChange={(e) => setProfile({...profile, prenom: e.target.value})}
              className="h-12 rounded-xl bg-slate-50 border-none font-bold"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom</Label>
            <Input 
              value={profile?.nom || ''} 
              onChange={(e) => setProfile({...profile, nom: e.target.value})}
              className="h-12 rounded-xl bg-slate-50 border-none font-bold"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Rôle (Lecture seule)</Label>
          <div className="h-12 rounded-xl bg-slate-100 flex items-center px-4 text-slate-500 font-black uppercase text-xs tracking-widest">
            <Shield className="h-4 w-4 mr-2" /> {profile?.role}
          </div>
        </div>

        <Button type="submit" disabled={isSaving} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-transform active:scale-95">
          {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : <><Save className="h-5 w-5 mr-2" /> ENREGISTRER LES MODIFICATIONS</>}
        </Button>
      </form>
    </div>
  );
}