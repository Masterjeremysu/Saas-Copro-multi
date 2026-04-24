'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Building2, Users, Key, 
  ChevronLeft, Copy, Check 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HasRole } from '@/components/auth-guard';
import { toast } from 'sonner';
import Link from 'next/link';

interface Copropriete {
  id: string;
  nom: string;
}

interface UserProfile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  appartement?: string;
  role: string;
}

interface InvitationCode {
  id: string;
  code: string;
  role_attribue: string;
}

export default function CoproManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [copro, setCopro] = useState<Copropriete | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = createClient();

  // CHARGEMENT DES DONNÉES DE L'INSTANCE
  const loadData = useCallback(async () => {
    // 1. Infos de la copro
    const { data: coproData } = await supabase.from('coproprietes').select('*').eq('id', id).single();
    if (coproData) setCopro(coproData);

    // 2. Utilisateurs attachés à cette copro
    const { data: usersData } = await supabase.from('profiles').select('*').eq('copropriete_id', id);
    if (usersData) setUsers(usersData);

    // 3. Codes d'invitation actifs
    const { data: codesData } = await supabase.from('invitation_codes').select('*').eq('copropriete_id', id).order('created_at', { ascending: false });
    if (codesData) setCodes(codesData);
  }, [id, supabase]);

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    init();
  }, [loadData]);

  // GÉNÉRATEUR DE CODE MAGIQUE
  async function generateCode(role: string) {
    setIsGenerating(true);
    // Génère un code style : SYNC-A1B2-C3D4
    const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
    const prefix = role === 'syndic' ? 'ADMIN' : role === 'membre_cs' ? 'CS' : role === 'artisan' ? 'PRO' : 'RES';
    const newCode = `${prefix}-${randomString.slice(0,4)}-${randomString.slice(4,8)}`;

    const { error } = await supabase.from('invitation_codes').insert({
      copropriete_id: id,
      code: newCode,
      role_attribue: role
    });

    if (error) {
      toast.error("Erreur lors de la génération");
    } else {
      toast.success("Nouveau code généré !");
      loadData();
    }
    setIsGenerating(false);
  }

  // FONCTION POUR COPIER LE CODE
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast("Code copié dans le presse-papier");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!copro) return <div className="p-20 text-center animate-pulse text-slate-400">Accès au serveur...</div>;

  return (
    <HasRole roles={['administrateur']}>
      <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto mb-20">
        
        {/* HEADER */}
        <Link href="/dashboard/admin" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600">
          <ChevronLeft className="h-5 w-5" /> Retour au parc
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{copro.nom}</h1>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                ID: <span className="font-mono text-xs">{copro.id}</span>
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-50 text-emerald-600 border-none px-4 py-2 font-black uppercase tracking-widest">
            Instance Connectée
          </Badge>
        </div>

        {/* ONGLETS DE GESTION (LE TRUC DE FOU) */}
        <Tabs defaultValue="codes" className="space-y-8">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 w-full md:w-auto flex">
            <TabsTrigger value="codes" className="rounded-xl font-bold flex-1 md:flex-none text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Key className="h-4 w-4 mr-2" /> Codes d&apos;accès
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl font-bold flex-1 md:flex-none text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 mr-2" /> Utilisateurs ({users.length})
            </TabsTrigger>
          </TabsList>

          {/* ONGLET 1 : LES CODES D'INVITATION */}
          <TabsContent value="codes" className="space-y-6">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-[#0F172A] text-white p-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black">Clés de déploiement</CardTitle>
                  <CardDescription className="text-slate-400 mt-1">Générez des codes pour inviter le syndic ou les résidents.</CardDescription>
                </div>
                
                {/* GÉNÉRATEUR */}
                <div className="flex gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-md">
                  <Select onValueChange={(v) => generateCode(v)} disabled={isGenerating}>
                    <SelectTrigger className="w-[180px] bg-transparent border-none text-white font-bold h-10 focus:ring-0">
                      <SelectValue placeholder="Générer un code..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="syndic">Pour le Syndic 👑</SelectItem>
                      <SelectItem value="membre_cs">Pour le Conseil Syndical</SelectItem>
                      <SelectItem value="copropriétaire">Pour un Résident</SelectItem>
                      <SelectItem value="artisan">Pour une Entreprise Prestataire 🛠️</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-8">
                {codes.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium italic">Aucun code actif. Générez-en un ci-dessus.</div>
                ) : (
                  <div className="grid gap-4">
                    {codes.map((code) => (
                      <div key={code.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`${
                            code.role_attribue === 'syndic' ? 'border-rose-200 text-rose-600 bg-rose-50' : 
                            code.role_attribue === 'membre_cs' ? 'border-amber-200 text-amber-600 bg-amber-50' : 
                            code.role_attribue === 'artisan' ? 'border-indigo-200 text-indigo-600 bg-indigo-50' :
                            'border-emerald-200 text-emerald-600 bg-emerald-50'
                          } uppercase text-[10px] font-black tracking-widest px-3 py-1`}>
                            {code.role_attribue}
                          </Badge>
                          <span className="font-mono text-lg font-black text-slate-700 tracking-wider">
                            {code.code}
                          </span>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          {copiedCode === code.code ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET 2 : LES UTILISATEURS */}
          <TabsContent value="users">
             <Card className="rounded-[2.5rem] border-slate-100 shadow-sm">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-2xl font-black">Comptes liés à l&apos;instance</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  {users.length === 0 ? (
                    <p className="text-slate-400 italic">Personne n&apos;a encore rejoint cette résidence.</p>
                  ) : (
                    <div className="grid gap-4">
                      {users.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                              {u.prenom?.[0]}{u.nom?.[0]}
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{u.prenom} {u.nom}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Apt {u.appartement || '?'}</span>
                            <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold uppercase text-[10px]">{u.role}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
             </Card>
          </TabsContent>

        </Tabs>
      </div>
    </HasRole>
  );
}