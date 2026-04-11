'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Mail, UserCircle } from 'lucide-react';

export default function AnnuairePage() {
  const [voisins, setVoisins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchVoisins() {
      // On récupère la liste des profils de la résidence
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('nom', { ascending: true });

      if (data) setVoisins(data);
      setIsLoading(false);
    }
    fetchVoisins();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto mb-20 md:mb-0">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-600" />
          Annuaire des résidents
        </h1>
        <p className="text-sm text-slate-500">Retrouvez vos voisins du 13-19 rue du Moucherotte.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-slate-400 animate-pulse">Chargement des profils...</p>
        ) : voisins.length === 0 ? (
          <p className="text-slate-500">Personne dans l'annuaire pour le moment.</p>
        ) : (
          voisins.map((v) => (
            <Card key={v.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex items-center gap-3">
                  {/* Avatar de secours : les initiales */}
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {v.prenom[0]}{v.nom[0]}
                  </div>
                  <div>
                    <CardTitle className="text-base">{v.prenom} {v.nom}</CardTitle>
                    <span className="text-[10px] px-2 py-0.5 bg-white border rounded-full text-slate-500 font-bold uppercase tracking-wider">
                      {v.role}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{v.batiment || 'Non renseigné'} — Lot {v.lot || '??'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{v.email}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}