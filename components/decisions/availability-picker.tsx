'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, X, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AvailabilityPickerProps {
  slots: { date: string; time: string }[];
  onChange: (slots: { date: string; time: string }[]) => void;
}

export function AvailabilityPicker({ slots, onChange }: AvailabilityPickerProps) {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const addSlot = () => {
    if (!currentDate) return;
    const newSlot = { date: currentDate, time: currentTime || 'Toute la journée' };
    onChange([...slots, newSlot]);
    setCurrentDate('');
    setCurrentTime('');
  };

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date proposée</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="date" 
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Heure (Optionnel)</Label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="time" 
              value={currentTime}
              onChange={(e) => setCurrentTime(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>
        </div>
        <Button 
          type="button"
          onClick={addSlot}
          className="sm:mt-6 h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">Créneaux ajoutés</Label>
        {slots.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucun créneau sélectionné</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {format(new Date(slot.date), 'EEEE dd MMMM', { locale: fr })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {slot.time}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeSlot(i)}
                  className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}>{children}</label>;
}
