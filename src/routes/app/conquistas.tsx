import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { Trophy, Star, Flame, Zap, Heart, CheckCircle2, Wallet, Repeat } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/store';
import { computeAchievements } from '@/lib/insights';

export const Route = createFileRoute('/app/conquistas')({
  component: Conquistas,
});

const ACHIEVEMENTS = [
  { id: 'first-tx', title: 'Primeira transação', desc: 'Registrou seu primeiro lançamento', icon: Star, color: 'text-yellow-500 bg-yellow-50' },
  { id: 'ten-tx', title: 'Em ritmo', desc: 'Registrou 10 transações', icon: Flame, color: 'text-orange-500 bg-orange-50' },
  { id: 'positive-balance', title: 'No verde', desc: 'Mantém saldo positivo', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'first-contribution', title: 'Investidor iniciante', desc: 'Primeiro aporte em meta', icon: Wallet, color: 'text-blue-500 bg-blue-50' },
  { id: 'reserve-5k', title: 'Reserva R$ 5k', desc: 'Acumular R$ 5.000 em contas', icon: Trophy, color: 'text-purple-500 bg-purple-50' },
  { id: 'set-recurrence', title: 'Despesa fixa mapeada', desc: 'Cadastrou uma recorrência', icon: Repeat, color: 'text-pink-500 bg-pink-50' },
];

function Conquistas() {
  const { activeProfile } = useAppContext();
  const { transactions, accounts, contributions } = useData();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const status = useMemo(
    () => computeAchievements(transactions, accounts, contributions, activeProfile),
    [transactions, accounts, contributions, activeProfile],
  );

  const unlockedCount = Object.values(status).filter(s => s.unlocked).length;

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3"><Trophy className="h-7 w-7 text-yellow-500" /> Conquistas</h1>
          <p className="text-muted-foreground">Baseado nos seus dados reais — desbloqueie ao usar o app.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl border shadow-sm">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-bold">Desbloqueadas</p>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xl font-bold">{unlockedCount}/{ACHIEVEMENTS.length}</span>
              <Heart className="h-5 w-5 text-rose-500 fill-current" />
            </div>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Suas conquistas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map(a => {
              const s = status[a.id];
              const unlocked = s?.unlocked;
              return (
                <div
                  key={a.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden',
                    unlocked ? 'bg-white shadow-sm hover:shadow' : 'bg-gray-50 opacity-70',
                  )}
                  onClick={() => unlocked && triggerConfetti()}
                >
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center mb-3', unlocked ? a.color : 'bg-gray-200 text-gray-400')}>
                    <a.icon className="h-6 w-6" />
                  </div>
                  <p className={cn('font-bold text-sm', unlocked ? 'text-gray-900' : 'text-gray-500')}>{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">{a.desc}</p>
                  <Progress value={Math.round((s?.progress || 0) * 100)} className="h-1.5 mt-3" />
                  <p className="text-[10px] text-muted-foreground mt-1">{s?.detail || '—'}</p>
                  {unlocked && <div className="absolute top-2 right-2 bg-yellow-400 h-2 w-2 rounded-full animate-pulse" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-orange-50/50 border-orange-100">
        <CardContent className="p-5 text-sm text-orange-900">
          As conquistas são calculadas em tempo real a partir das suas transações, contas e aportes. Use o app no dia a dia que elas aparecem sozinhas.
        </CardContent>
      </Card>
    </div>
  );
}
