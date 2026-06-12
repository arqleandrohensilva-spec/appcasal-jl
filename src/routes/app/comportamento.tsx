import { createFileRoute } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useData } from '@/lib/store';
import { useMemo, useEffect, useState } from 'react';
import { weekdayHeatmap, categoryAnomalies } from '@/lib/insights';

export const Route = createFileRoute('/app/comportamento')({
  component: Comportamento,
});

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const BUCKETS = ['Início mês', 'Meio mês', 'Fim mês'];

function Comportamento() {
  const { activeProfile } = useAppContext();
  const { transactions } = useData();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const heatmap = useMemo(() => weekdayHeatmap(transactions, activeProfile), [transactions, activeProfile]);
  const anomalies = useMemo(() => categoryAnomalies(transactions, activeProfile), [transactions, activeProfile]);

  const max = Math.max(1, ...heatmap.flat());
  const intensity = (v: number) => {
    const p = v / max;
    if (v === 0) return 'bg-gray-100';
    if (p < 0.3) return 'bg-emerald-200';
    if (p < 0.6) return 'bg-emerald-400';
    if (p < 0.85) return 'bg-emerald-600';
    return 'bg-emerald-800';
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Comportamento</h1>
        <p className="text-muted-foreground">Padrões reais dos seus gastos por dia da semana e período do mês.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" /> Heatmap de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <div className="space-y-4 pt-8">
                {BUCKETS.map(b => <div key={b} className="text-xs text-muted-foreground h-10 flex items-center">{b}</div>)}
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS.map(d => <div key={d} className="text-xs text-center text-muted-foreground">{d}</div>)}
                </div>
                <div className="space-y-2">
                  {BUCKETS.map((_, bi) => (
                    <div key={bi} className="grid grid-cols-7 gap-2">
                      {WEEKDAYS.map((d, wi) => {
                        const v = heatmap[wi][bi];
                        return (
                          <TooltipProvider key={d}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn('h-10 rounded-md transition-colors', intensity(v))} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{d} · {BUCKETS[bi]}</p>
                                <p className="font-bold">{formatCurrency(v)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground justify-end">
              <span>Menos</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-gray-100 rounded" />
                <div className="w-3 h-3 bg-emerald-200 rounded" />
                <div className="w-3 h-3 bg-emerald-400 rounded" />
                <div className="w-3 h-3 bg-emerald-600 rounded" />
                <div className="w-3 h-3 bg-emerald-800 rounded" />
              </div>
              <span>Mais</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" /> Anomalias detectadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalies.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum gasto fora do padrão dos últimos 3 meses. Bom controle! 👏</p>
            )}
            {anomalies.map(a => (
              <div key={a.category} className="p-4 border rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{a.category}</p>
                    <p className="text-xs text-muted-foreground">Você gastou <b>{a.ratio.toFixed(1)}x</b> mais que a média</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Este mês</p>
                    <p className="font-bold text-rose-600">{formatCurrency(a.current)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Média 3m</p>
                    <p>{formatCurrency(a.avg3m)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(() => {
        const top = heatmap.flatMap((row, wi) => row.map((v, bi) => ({ v, wi, bi })))
          .sort((a, b) => b.v - a.v)[0];
        if (!top || top.v === 0) return null;
        return (
          <Card className="bg-orange-50 border-orange-100">
            <CardHeader>
              <CardTitle className="text-orange-900 text-sm flex items-center gap-2">
                <Info className="h-4 w-4" /> Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-800">
                Seu pico de gastos acontece <b>{WEEKDAYS[top.wi]}</b> no <b>{BUCKETS[top.bi].toLowerCase()}</b> — {formatCurrency(top.v)} no período analisado.
              </p>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
