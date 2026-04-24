'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  titre: string;
  message: string;
  lu: boolean;
  lien: string | null;
  created_at: string;
  user_id: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    loadNotifications();
    let channel: RealtimeChannel;

    // FIX : Création d'une fonction asynchrone propre pour gérer le temps réel
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // FIX : On donne un nom UNIQUE au canal pour éviter le conflit du Strict Mode
        const channelName = `notifs-${user.id}-${Date.now()}`;
        
        channel = supabase.channel(channelName)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications', 
            filter: `user_id=eq.${user.id}` 
          }, 
          () => {
            loadNotifications();
          })
          .subscribe();
      }
    };

    setupRealtime();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    // FIX : On nettoie le canal et l'événement quand on quitte la page
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = notifications.filter(n => !n.lu).length;

  const markAsRead = async (id: string, lien: string | null) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', id);
    setIsOpen(false);
    loadNotifications();
    if (lien) {
      router.push(lien);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id);
    loadNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-indigo-600"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-3 w-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-black text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50">
                Tout marquer lu
              </Button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-sm italic">
                Vous êtes à jour !
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => markAsRead(notif.id, notif.lien)}
                  className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${!notif.lu ? 'bg-indigo-50/30' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.lu ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    <div>
                      <p className={`text-sm ${!notif.lu ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                        {notif.titre}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">{notif.message}</p>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-2">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}