'use client';

import { 
  Vote, Calendar, BarChart3, Users, 
  Clock, CheckCircle2,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface Consultation {
  id: string;
  type: 'official' | 'poll' | 'availability';
  title: string;
  description: string;
  closing_date: string;
  is_anonymous: boolean;
  allow_multiple: boolean;
  quorum_percentage?: number;
  status: 'draft' | 'active' | 'closed';
  created_at: string;
  options: { id: string; label: string; votes_count: number }[];
  total_participants: number;
  current_participation: number; // percentage
}

interface DecisionCardProps {
  consultation: Consultation;
  onVote?: (id: string) => void;
}

export function DecisionCard({ consultation, onVote }: DecisionCardProps) {
  const isClosed = consultation.status === 'closed';
  const isUrgent =
    !isClosed && new Date(consultation.closing_date).getTime() - new Date().getTime() < 86400000; // < 24h

  const typeConfig = {
    official: { icon: <Vote className="h-4 w-4" />, color: 'indigo', label: 'Vote Officiel' },
    poll: { icon: <BarChart3 className="h-4 w-4" />, color: 'emerald', label: 'Sondage' },
    availability: { icon: <Calendar className="h-4 w-4" />, color: 'amber', label: 'Disponibilités' },
  };

  const config = typeConfig[consultation.type] || typeConfig.poll;

  return (
    <div 
      onClick={() => onVote?.(consultation.id)}
      className="group relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 dark:border-white/5 p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 cursor-pointer overflow-hidden flex flex-col h-full"
    >
      {/* GLOW EFFECT ON HOVER */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
      
      <div className="space-y-6 relative z-10 flex-1 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
             <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-${config.color}-500/10 text-${config.color}-600 dark:text-${config.color}-400 shadow-sm`}>
                {config.icon}
             </div>
             <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{config.label}</p>
                <div className="flex items-center gap-1.5">
                   <Clock className={`h-3 w-3 ${isUrgent ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`} />
                   <span className={`text-[10px] font-bold uppercase tracking-tight ${isUrgent ? 'text-rose-600' : 'text-slate-400'}`}>
                      {isClosed ? 'Clôturé' : `Finit ${formatDistanceToNow(new Date(consultation.closing_date), { addSuffix: true, locale: fr })}`}
                   </span>
                </div>
             </div>
          </div>
          {isClosed ? (
            <Badge className="bg-emerald-500 text-white border-none font-black text-[8px] tracking-tighter uppercase px-2 py-0.5 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Terminé
            </Badge>
          ) : isUrgent ? (
            <Badge className="bg-rose-500 text-white border-none font-black text-[8px] tracking-tighter uppercase px-2 py-0.5 shadow-lg shadow-rose-500/20">
              <AlertCircle className="h-3 w-3 mr-1" /> Urgent
            </Badge>
          ) : (
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
          )}
        </div>

        {/* CONTENT */}
        <div className="space-y-2">
          <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight">
            {consultation.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
            {consultation.description}
          </p>
        </div>

        {/* PROGRESS SECTION */}
        <div className="space-y-3 pt-2 mt-auto">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Participation</p>
               <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                     {[1, 2, 3].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                           <div className="h-full w-full bg-gradient-to-br from-indigo-400 to-indigo-600 opacity-80" />
                        </div>
                     ))}
                     <div className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                        +{consultation.total_participants}
                     </div>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{consultation.current_participation}%</span>
               </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quorum</p>
               <p className="text-xs font-black text-slate-900 dark:text-white">{consultation.quorum_percentage}% requis</p>
            </div>
          </div>
          <div className="relative h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
             <div 
               className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isClosed ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
               style={{ width: `${consultation.current_participation}%` }}
             />
             <div 
               className="absolute top-0 h-full border-r-2 border-dashed border-slate-300 dark:border-white/20" 
               style={{ left: `${consultation.quorum_percentage}%` }}
             />
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-2 flex items-center justify-between">
           <div className="flex items-center gap-2 text-slate-400">
              <Users className="h-4 w-4" />
              <span className="text-xs font-bold">{consultation.total_participants} résidents ont voté</span>
           </div>
           <Button 
            variant="ghost" 
            className="h-10 w-10 rounded-full p-0 text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all"
           >
              <ChevronRight className="h-6 w-6" />
           </Button>
        </div>
      </div>
    </div>
  );
}
