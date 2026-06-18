import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { PiggyBank, AlertTriangle } from 'lucide-react';
import { useData } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { monthlyStats } from '@/lib/finance';
import { formatCurrency } from '@/lib/mockData';
import { cn } from '@/lib/utils';

export function BudgetWidget() {
  const { activeProfile } = useAppContext();
  const { budgets, transactions } = useData();

  const now = new Date();
  const stats = useMemo(
    () => monthlyStats(transactions, activeProfile, now.getFullYear(), now.getMonth()),
    [transactions, activeProfile],
  );
  const myBudgets = useMemo(
    () => budgets.filter(b => activeProfile === 'casal' ? true : b.owner === activeProfile),
    [budgets, activeProfile],
  );
  const items = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of stats.porCategoria) m.set(c.name, c.value);
    return myBudgets
      .map(b => {
        const spent = m.get(b.category) || 0;
        const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
        return { ...b, spent, pct };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  }, [myBudgets, stats]);

  if (myBudgets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PiggyBank className="h-4 w-4" /> Orçamento</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Defina limites por categoria para controlar gastos.</p>
          <Button asChild size="sm" variant="outline" className="w-full"><Link to="/app/orcamento">Criar orçamento</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><PiggyBank className="h-4 w-4" /> Orçamento do mês</CardTitle>
        <Button asChild size="sm" variant="ghost" className="h-6 text-xs"><Link to="/app/orcamento">Ver tudo</Link></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(b => {
          const status = b.pct >= 100 ? 'over' : b.pct >= 80 ? 'warn' : 'ok';
          return (
            <div key={b.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-1">
                  {status === 'over' && <AlertTriangle className="h-3 w-3 text-rose-500" />}
                  {b.category}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(b.spent)} / {formatCurrency(b.monthlyLimit)}
                </span>
              </div>
              <Progress value={Math.min(b.pct, 100)} className={cn(
                'h-1.5',
                status === 'over' && '[&>div]:bg-rose-500',
                status === 'warn' && '[&>div]:bg-amber-500',
                status === 'ok' && '[&>div]:bg-emerald-500',
              )} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
