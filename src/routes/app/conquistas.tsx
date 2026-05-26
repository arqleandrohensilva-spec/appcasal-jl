import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA } from '@/lib/mockData';
import { Trophy, Star, Flame, Zap, Heart, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/conquistas')({
  component: Conquistas,
});

const ALL_ACHIEVEMENTS = [
  { id: 'Primeiro mês no verde', title: 'Primeiro mês no verde', desc: '30 dias sem saldo negativo', icon: Flame, color: 'text-orange-500 bg-orange-50' },
  { id: 'Investidor iniciante', title: 'Investidor iniciante', desc: 'Primeiro aporte registrado', icon: Star, color: 'text-yellow-500 bg-yellow-50' },
  { id: 'Dívida zerada', title: 'Dívida zerada', desc: 'Quitar um parcelamento antecipadamente', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'Parceiros em sintonia', title: 'Parceiros em sintonia', desc: 'Score do casal acima de 80 por 3 meses', icon: Heart, color: 'text-pink-500 bg-pink-50', casal: true },
  { id: 'Assinatura caçada', title: 'Assinatura caçada', desc: 'Cancelar uma assinatura duplicada', icon: Zap, color: 'text-blue-500 bg-blue-50' },
];

function Conquistas() {
  const { activeProfile } = useAppContext();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;
  const unlocked = (data as any).conquistas || [];

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3"><Trophy className="h-7 w-7 text-yellow-500" /> Conquistas FinançasDuo</h1>
          <p className="text-muted-foreground">Transforme sua saúde financeira em um jogo empolgante.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl border shadow-sm">
           <div className="text-right">
             <p className="text-xs text-muted-foreground uppercase font-bold">Streak Atual</p>
             <div className="flex items-center gap-1 justify-end">
               <span className="text-xl font-bold">12 Semanas</span>
               <Flame className="h-5 w-5 text-orange-600 fill-current" />
             </div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Suas Conquistas</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {ALL_ACHIEVEMENTS.filter(a => !a.casal).map(achievement => {
                 const isUnlocked = unlocked.includes(achievement.id);
                 return (
                   <div 
                     key={achievement.id} 
                     className={cn(
                       "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                       isUnlocked ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-transparent opacity-60"
                     )}
                     onClick={() => isUnlocked && triggerConfetti()}
                   >
                     <div className={cn("h-10 w-10 rounded-full flex items-center justify-center mb-3", isUnlocked ? achievement.color : "bg-gray-200 text-gray-400")}>
                        <achievement.icon className="h-6 w-6" />
                     </div>
                     <p className={cn("font-bold text-sm", isUnlocked ? "text-gray-900" : "text-gray-400")}>{achievement.title}</p>
                     <p className="text-xs text-muted-foreground mt-1 leading-tight">{achievement.desc}</p>
                     {isUnlocked && <div className="absolute top-2 right-2 bg-yellow-400 h-2 w-2 rounded-full animate-pulse"></div>}
                   </div>
                 );
               })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-100">
          <CardHeader><CardTitle className="text-orange-900 flex items-center gap-2"><Heart className="h-5 w-5 fill-current" /> Conquistas do Casal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             {ALL_ACHIEVEMENTS.filter(a => a.casal).map(achievement => {
                 const isUnlocked = unlocked.includes(achievement.id);
                 return (
                   <div key={achievement.id} className="flex gap-4 p-4 rounded-xl bg-white border border-orange-100 shadow-sm">
                      <div className={cn("h-12 w-12 shrink-0 rounded-full flex items-center justify-center", isUnlocked ? achievement.color : "bg-gray-200 text-gray-400")}>
                        <achievement.icon className="h-7 w-7" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-bold">{achievement.title}</p>
                          <span className="text-xs font-bold text-orange-600">85%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{achievement.desc}</p>
                        <Progress value={85} className="h-2 mt-3" />
                      </div>
                   </div>
                 );
               })}
             <div className="p-3 bg-white rounded-lg border border-orange-100 text-center">
                <p className="text-xs text-orange-800 font-medium">Trabalhem juntos para desbloquear a próxima badge!</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
