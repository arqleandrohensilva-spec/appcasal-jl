import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, RotateCcw, TrendingUp } from 'lucide-react';
import { useData } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { computeScore } from '@/lib/score';
import { invoiceMonthOf } from '@/lib/finance';
import { formatCurrency } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import type { UserTransaction, UserAccount, UserCard } from '@/lib/store';

export const Route = createFileRoute('/app/simulador-score')({
  component: SimuladorScore,
  head: () => ({
    meta: [
      { title: 'Simulador de Score · Casal Financeiro' },
      { name: 'description', content: 'Simule ajustes de renda, despesas, uso de cartão e reserva para ver o impacto no seu score financeiro.' },
    ],
  }),
});

function SimuladorScore() {
  const { activeProfile } = useAppContext();
  const { accounts, cards, transactions, goals, contributions, budgets } = useData();

  const [extraIncome, setExtraIncome] = useState(0);
  const [expenseReduction, setExpenseReduction] = useState(0);
  const [cardTargetPct, setCardTargetPct] = useState<number | null>(null);
  const [extraReserve, setExtraReserve] = useState(0);

  const matches = (owner: string) => activeProfile === 'casal' ? true : owner === activeProfile;

  const baseScore = useMemo(
    () => computeScore({ profile: activeProfile, accounts, cards, transactions, goals, contributions, budgets }),
    [activeProfile, accounts, cards, transactions, goals, contributions, budgets],
  );

  // ==== Simulação ====
  const simulated = useMemo(() => {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const owner = activeProfile === 'casal' ? 'leandro' : activeProfile;
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthKey = todayISO.slice(0, 7);

    // 1) Contas: adicionar reserva extra na primeira conta do perfil
    let simAccounts: UserAccount[] = accounts.map(a => ({ ...a }));
    if (extraReserve > 0) {
      const idx = simAccounts.findIndex(a => matches(a.owner));
      if (idx >= 0) simAccounts[idx].balance += extraReserve;
    }

    // 2) Transações: cortar despesas do mês proporcionalmente e adicionar renda extra
    let simTx: UserTransaction[] = transactions.map(t => ({ ...t }));

    if (expenseReduction > 0) {
      const monthDespesas = simTx.filter(t =>
        t.type === 'despesa' && matches(t.owner) && new Date(t.date) >= monthStart && new Date(t.date) <= today
      );
      const total = monthDespesas.reduce((s, t) => s + t.amount, 0);
      if (total > 0) {
        const factor = Math.max(0, 1 - expenseReduction / total);
        const ids = new Set(monthDespesas.map(t => t.id));
        simTx = simTx.map(t => ids.has(t.id) ? { ...t, amount: t.amount * factor } : t);
      }
    }

    if (extraIncome > 0) {
      simTx.push({
        id: 'sim-income',
        description: 'Renda extra simulada',
        amount: extraIncome,
        date: todayISO,
        category: 'Simulação',
        paymentMethod: 'PIX',
        type: 'receita',
        owner: owner as UserTransaction['owner'],
        createdAt: new Date().toISOString(),
      });
    }

    // 3) Cartão: escalar despesas da fatura aberta se acima do alvo
    let simCards: UserCard[] = cards.map(c => ({ ...c }));
    if (cardTargetPct !== null) {
      const myCards = simCards.filter(c => matches(c.owner));
      const totalLimit = myCards.reduce((s, c) => s + c.limit, 0);
      const targetOpen = totalLimit * (cardTargetPct / 100);

      // usage atual (fatura aberta)
      let currentOpen = 0;
      const invoiceTxByCard = new Map<string, UserTransaction[]>();
      for (const c of myCards) {
        const list = simTx.filter(t =>
          t.cardId === c.id && t.type === 'despesa' &&
          invoiceMonthOf(t.date, c.closingDay) === currentMonthKey &&
          !c.paidInvoices?.[currentMonthKey]
        );
        invoiceTxByCard.set(c.id, list);
        currentOpen += list.reduce((s, t) => s + t.amount, 0);
      }
      if (currentOpen > targetOpen && currentOpen > 0) {
        const factor = targetOpen / currentOpen;
        const idsToScale = new Set<string>();
        for (const list of invoiceTxByCard.values())
          for (const t of list) idsToScale.add(t.id);
        simTx = simTx.map(t => idsToScale.has(t.id) ? { ...t, amount: t.amount * factor } : t);
      }
    }

    return computeScore({
      profile: activeProfile,
      accounts: simAccounts,
      cards: simCards,
      transactions: simTx,
      goals, contributions, budgets,
    });
  }, [activeProfile, accounts, cards, transactions, goals, contributions, budgets, extraIncome, expenseReduction, cardTargetPct, extraReserve]);

  const delta = simulated.score - baseScore.score;
  const scoreColor = (s: number) =>
    s >= 850 ? 'text-emerald-500' :
    s >= 700 ? 'text-emerald-400' :
    s >= 500 ? 'text-amber-400' :
    s >= 300 ? 'text-orange-400' : 'text-rose-500';

  const reset = () => {
    setExtraIncome(0);
    setExpenseReduction(0);
    setCardTargetPct(null);
    setExtraReserve(0);
  };

  const dirty = extraIncome > 0 || expenseReduction > 0 || cardTargetPct !== null || extraReserve > 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Simulador de Score
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajuste os controles abaixo para ver o impacto nos próximos 30 dias.
        </p>
      </header>

      {/* Comparativo */}
      <Card className="border-primary/30">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score atual</p>
              <p className={cn('text-4xl font-bold', scoreColor(baseScore.score))}>{baseScore.score}</p>
              <p className="text-xs text-muted-foreground mt-1">{baseScore.grade}</p>
            </div>
            <div className="text-center">
              <ArrowRight className="h-6 w-6 mx-auto text-muted-foreground" />
              <Badge variant={delta > 0 ? 'default' : delta < 0 ? 'destructive' : 'secondary'} className="mt-2">
                {delta > 0 ? `+${delta}` : delta} pts
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score simulado</p>
              <p className={cn('text-4xl font-bold', scoreColor(simulated.score))}>{simulated.score}</p>
              <p className="text-xs text-muted-foreground mt-1">{simulated.grade}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sliders */}
      <div className="grid md:grid-cols-2 gap-4">
        <SliderCard
          title="Renda extra mensal"
          desc="Freelance, bônus, venda pontual — soma como receita hoje."
          value={extraIncome}
          onChange={setExtraIncome}
          min={0} max={10000} step={100}
          format={v => formatCurrency(v)}
        />
        <SliderCard
          title="Corte de despesas do mês"
          desc="Reduz proporcionalmente as despesas já lançadas no mês."
          value={expenseReduction}
          onChange={setExpenseReduction}
          min={0} max={5000} step={50}
          format={v => formatCurrency(v)}
        />
        <SliderCard
          title="Uso máximo do cartão"
          desc="Meta de utilização da fatura aberta (recomendado ≤ 30%)."
          value={cardTargetPct ?? 100}
          onChange={v => setCardTargetPct(v === 100 ? null : v)}
          min={0} max={100} step={5}
          format={v => cardTargetPct === null ? 'Atual' : `${v}%`}
        />
        <SliderCard
          title="Aporte extra na reserva"
          desc="Valor adicional depositado na conta principal."
          value={extraReserve}
          onChange={setExtraReserve}
          min={0} max={20000} step={250}
          format={v => formatCurrency(v)}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={reset} disabled={!dirty}>
          <RotateCcw className="h-4 w-4 mr-1" /> Zerar simulação
        </Button>
      </div>

      {/* Fatores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Impacto por fator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {simulated.factors.map((f, i) => {
            const base = baseScore.factors[i];
            const diff = Math.round(f.value - base.value);
            return (
              <div key={f.key} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{f.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(base.value)} → <span className="font-semibold text-foreground">{Math.round(f.value)}</span>
                    {diff !== 0 && (
                      <span className={cn('ml-1', diff > 0 ? 'text-emerald-500' : 'text-rose-500')}>
                        ({diff > 0 ? '+' : ''}{diff})
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 bg-muted-foreground/40 rounded-full"
                    style={{ width: `${Math.max(2, Math.min(100, base.value))}%` }} />
                  <div className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    f.value >= 70 ? 'bg-emerald-500' : f.value >= 40 ? 'bg-amber-400' : 'bg-rose-500',
                  )} style={{ width: `${Math.max(2, Math.min(100, f.value))}%`, opacity: 0.85 }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        Simulação não altera seus dados reais. Os efeitos consideram a janela dos próximos 30 dias.
      </p>
    </div>
  );
}

function SliderCard({ title, desc, value, onChange, min, max, step, format }: {
  title: string; desc: string;
  value: number; onChange: (v: number) => void;
  min: number; max: number; step: number;
  format: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-baseline gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <span className="text-sm font-semibold tabular-nums">{format(value)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
      </CardHeader>
      <CardContent>
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={min} max={max} step={step}
        />
      </CardContent>
    </Card>
  );
}
