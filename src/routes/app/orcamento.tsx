import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PiggyBank, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useData, type Budget } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { CATEGORIES, formatCurrency } from '@/lib/mockData';
import { monthlyStats } from '@/lib/finance';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/orcamento')({
  component: Orcamento,
});

function Orcamento() {
  const { activeProfile } = useAppContext();
  const { budgets, addBudget, updateBudget, removeBudget, transactions } = useData();

  const owner = activeProfile === 'casal' ? 'casal' : activeProfile;
  const myBudgets = useMemo(
    () => budgets.filter(b => activeProfile === 'casal' ? true : b.owner === activeProfile),
    [budgets, activeProfile],
  );

  const now = new Date();
  const stats = useMemo(
    () => monthlyStats(transactions, activeProfile, now.getFullYear(), now.getMonth()),
    [transactions, activeProfile],
  );
  const catSpend = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of stats.porCategoria) m.set(c.name, c.value);
    return m;
  }, [stats]);

  const usedCategories = new Set(myBudgets.map(b => b.category));
  const totalLimit = myBudgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = myBudgets.reduce((s, b) => s + (catSpend.get(b.category) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PiggyBank className="h-6 w-6" /> Orçamento mensal</h1>
          <p className="text-muted-foreground">Defina um limite por categoria e acompanhe o consumo do mês.</p>
        </div>
        <BudgetDialog
          existingCategories={usedCategories}
          onSave={(b) => {
            addBudget({ ...b, owner });
            toast.success('Orçamento criado!');
          }}
        />
      </header>

      {myBudgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum orçamento ainda. Crie um limite por categoria pra controlar gastos.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Limite total</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(totalLimit)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Gasto do mês</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                <p className="text-xs text-muted-foreground mt-1">{totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0}% do orçamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Disponível</CardTitle></CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-bold', totalLimit - totalSpent < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                  {formatCurrency(Math.max(totalLimit - totalSpent, 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Por categoria</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {myBudgets
                .slice()
                .sort((a, b) => {
                  const pa = (catSpend.get(a.category) || 0) / Math.max(a.monthlyLimit, 1);
                  const pb = (catSpend.get(b.category) || 0) / Math.max(b.monthlyLimit, 1);
                  return pb - pa;
                })
                .map(b => {
                  const spent = catSpend.get(b.category) || 0;
                  const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
                  const status = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
                  return (
                    <div key={b.id} className="space-y-2 group">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{b.category}</span>
                          {status === 'over' && <AlertTriangle className="h-3 w-3 text-rose-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'tabular-nums font-semibold',
                            status === 'over' && 'text-rose-600',
                            status === 'warn' && 'text-amber-600',
                            status === 'ok' && 'text-foreground',
                          )}>
                            {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
                          </span>
                          <BudgetDialog
                            existing={b}
                            existingCategories={usedCategories}
                            onSave={(patch) => { updateBudget(b.id, patch); toast.success('Orçamento atualizado'); }}
                            trigger={
                              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <Pencil className="h-3 w-3" />
                              </Button>
                            }
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => { removeBudget(b.id); toast.success('Removido'); }}>
                            <Trash2 className="h-3 w-3 text-rose-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={Math.min(pct, 100)} className={cn(
                          'h-2',
                          status === 'over' && '[&>div]:bg-rose-500',
                          status === 'warn' && '[&>div]:bg-amber-500',
                          status === 'ok' && '[&>div]:bg-emerald-500',
                        )} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {status === 'over'
                          ? `Estourou em ${formatCurrency(spent - b.monthlyLimit)}`
                          : status === 'warn'
                          ? `Atenção: ${Math.round(pct)}% usado`
                          : `Restam ${formatCurrency(b.monthlyLimit - spent)}`}
                      </p>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function BudgetDialog({
  existing,
  existingCategories,
  onSave,
  trigger,
}: {
  existing?: Budget;
  existingCategories: Set<string>;
  onSave: (b: { category: string; monthlyLimit: number }) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(existing?.category || '');
  const [limit, setLimit] = useState(existing ? String(existing.monthlyLimit) : '');

  const available = CATEGORIES.filter(c => c === existing?.category || !existingCategories.has(c));

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setCategory(existing?.category || '');
        setLimit(existing ? String(existing.monthlyLimit) : '');
      }
    }}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2"><Plus className="h-4 w-4" /> Novo orçamento</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? 'Editar orçamento' : 'Novo orçamento'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!existing}>
              <SelectTrigger><SelectValue placeholder="Escolha a categoria" /></SelectTrigger>
              <SelectContent>
                {available.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Limite mensal (R$)</Label>
            <Input type="number" step="0.01" value={limit} onChange={e => setLimit(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            const v = parseFloat(limit);
            if (!category || !v || v <= 0) { toast.error('Preencha categoria e valor'); return; }
            onSave({ category, monthlyLimit: v });
            setOpen(false);
          }}>{existing ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
