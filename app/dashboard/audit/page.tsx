'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  ShieldCheck, Activity, Search, Loader2, 
  Calendar, Database, ShieldAlert, FileUp, Download, Eye, RotateCcw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const supabase = createClient();

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*, profiles(prenom, nom, role)')
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleRestore = async (log: any) => {
    if (log.resource_type !== 'documents' || !log.resource_id) return;

    const tid = toast.loading("Restauration de l'actif numérique...");
    try {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: null })
        .eq('id', log.resource_id);

      if (error) throw error;

      await logAction({
        action: 'DOCUMENT_RESTORE',
        resourceType: 'documents',
        resourceId: log.resource_id,
        details: `Restauration forcée : ${log.metadata?.filename || 'Document'}`,
        severity: 'info'
      });

      toast.success("Élément réintégré avec succès", { id: tid });
      fetchLogs();
    } catch (err: any) {
      toast.error("Échec de la restauration", { id: tid });
    }
  };

  const filteredLogs = logs.filter(log => 
    log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: filteredLogs.length,
    critical: filteredLogs.filter(l => l.severity === 'critical').length,
    uploads: filteredLogs.filter(l => l.action.includes('UPLOAD')).length
  };

  return (
    <div className="p-6 md:p-12 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-[0.2em]">
            Registre Officiel
          </Badge>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">Journal d'Audit</h1>
          <p className="text-slate-500 font-medium text-lg italic">Surveillance 360° des flux de la copropriété.</p>
        </div>
        <Button onClick={() => toast.success("Génération du rapport...")} className="bg-slate-900 hover:bg-black text-white rounded-[1.5rem] h-14 px-8 font-bold flex gap-3 shadow-2xl transition-all active:scale-95">
          <Download className="h-5 w-5" /> Exporter le Registre
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <StatCard title="Opérations" value={stats.total} icon={<Activity className="text-indigo-600" />} />
        <StatCard title="Alertes" value={stats.critical} icon={<ShieldAlert className="text-rose-600" />} color="text-rose-600" />
        <StatCard title="Archives" value={stats.uploads} icon={<FileUp className="text-emerald-600" />} />
      </div>

      <Card className="border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] bg-white rounded-[3.5rem] overflow-hidden">
        <div className="p-10 border-b border-slate-50 bg-slate-50/20">
          <div className="relative max-w-lg w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Rechercher une opération..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-16 h-18 bg-white border-none rounded-[2rem] shadow-sm text-lg focus-visible:ring-2 focus-visible:ring-indigo-500/10" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-12 py-7 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Événement Métier</th>
                <th className="px-12 py-7 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Sévérité</th>
                <th className="px-12 py-7 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Responsable</th>
                <th className="px-12 py-7 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Analyse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="p-32 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-600" /></td></tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-indigo-50/20 transition-all group">
                  <td className="px-12 py-10">
                    <div className="flex items-center gap-8">
                      <div className={`h-16 w-16 rounded-[2rem] shadow-sm flex items-center justify-center shrink-0 ${log.severity === 'critical' ? 'bg-rose-50 text-rose-600' : 'bg-white text-indigo-600 border border-slate-100'}`}>
                        <Activity className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg tracking-tight">{log.details || log.action}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.1em] mt-1 italic">{log.resource_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-12 py-10 text-center">
                    <Badge className={`font-black text-[10px] uppercase px-5 py-2 rounded-full ${log.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                      {log.severity}
                    </Badge>
                  </td>
                  <td className="px-12 py-10">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-[1.2rem] bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase shadow-2xl">
                        {log.profiles?.prenom?.[0]}{log.profiles?.nom?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{log.profiles?.prenom} {log.profiles?.nom}</p>
                        <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{log.profiles?.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-12 py-10 text-right">
                    <div className="flex justify-end gap-3">
                      {log.action === 'DOCUMENT_SOFT_DELETE' && (
                        <button 
                          onClick={() => handleRestore(log)}
                          className="p-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-[1.2rem] transition-all shadow-sm"
                        >
                          <RotateCcw className="h-6 w-6" />
                        </button>
                      )}
                      <button onClick={() => setSelectedLog(log)} className="p-4 text-slate-300 hover:text-indigo-600 transition-all group-hover:bg-white rounded-[1.2rem] group-hover:shadow-md">
                        <Eye className="h-6 w-6" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] rounded-[3.5rem] bg-white border-none shadow-2xl p-12">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900">Expertise Technique</DialogTitle>
            <DialogDescription>Détails du payload JSON de l'événement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-10 pt-8">
             <pre className="p-10 bg-slate-900 text-indigo-300 rounded-[2.5rem] text-sm font-mono overflow-auto max-h-[500px] border border-slate-800 leading-relaxed scrollbar-hide">
                {JSON.stringify(selectedLog?.metadata, null, 2)}
             </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon, color = "text-slate-900" }: any) {
  return (
    <Card className="p-12 border-none shadow-[0_25px_60px_-15px_rgba(0,0,0,0.05)] bg-white rounded-[3rem] flex items-center justify-between group hover:translate-y-[-8px] transition-all duration-700">
      <div className="flex flex-col justify-center min-w-0">
        <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">{title}</p>
        <p className={`text-6xl font-black leading-none tracking-tighter ${color}`}>
          {value}
        </p>
      </div>
      <div className="h-24 w-24 flex items-center justify-center bg-slate-50 rounded-[2.2rem] group-hover:bg-indigo-50 transition-colors duration-700 shrink-0">
        {icon}
      </div>
    </Card>
  );
}