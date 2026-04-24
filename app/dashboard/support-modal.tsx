'use client';

import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Headset, Mail, 
  Send, Loader2, Sparkles, Globe, 
  PhoneCall
} from 'lucide-react';
import { toast } from 'sonner';

export function SupportModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    // Simulation d'envoi
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Votre message a été envoyé à l'équipe support !");
    setLoading(false);
    setOpen(false);
    setFormData({ subject: '', message: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] rounded-[3rem] bg-white dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden">
        {/* DECORATIVE TOP */}
        <div className="bg-indigo-600 h-32 relative flex items-center px-10">
          <div className="absolute top-0 right-0 w-32 h-full bg-white/10 blur-2xl rounded-full translate-x-10"></div>
          <div className="relative z-10 flex items-center gap-4">
             <div className="h-16 w-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/20">
                <Headset className="h-8 w-8" />
             </div>
             <div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
                  Besoin d&apos;aide <span className="text-indigo-200">?</span>
                </h2>
                <p className="text-indigo-100/70 text-[10px] font-black uppercase tracking-widest mt-1">
                  Support CoproSync 24/7
                </p>
             </div>
          </div>
        </div>

        <div className="p-8 lg:p-10 space-y-8">
          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <a href="mailto:support@coprosync.com" className="group">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-indigo-500 transition-all">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                         <Mail className="h-5 w-5" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Direct</p>
                         <p className="text-xs font-bold text-slate-900 dark:text-white">support@coprosync.com</p>
                      </div>
                   </div>
                </div>
             </a>
             <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-indigo-500 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <PhoneCall className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ligne Urgence</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">01 23 45 67 89</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="relative">
             <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-white/5"></span></div>
             <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white dark:bg-slate-900 px-4 text-slate-400">OU ENVOYEZ UN TICKET</span></div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Sujet de votre demande</Label>
              <Input 
                placeholder="Ex: Problème d'affichage, Question facture..." 
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Message</Label>
              <Textarea 
                placeholder="Décrivez votre besoin en quelques lignes..." 
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-medium min-h-[120px] focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 rounded-2xl bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-600/20 group"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  ENVOYER LE MESSAGE <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 dark:bg-white/5 p-6 flex justify-center items-center gap-6">
           <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest underline">Centre d&apos;aide</span>
           </div>
           <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Français</span>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
