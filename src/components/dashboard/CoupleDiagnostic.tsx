import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Legend } from 'recharts';
import { useData } from '@/lib/store';
import { projectDailyBalance, recommendCardForPurchase, getBillDueDate } from '@/lib/projections';
import { formatCurrency } from '@/lib/mockData';
import { Heart, CreditCard, AlertTriangle, CheckCircle2, ArrowRightLeft, CalendarClock, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function CoupleCardRecommendation() {
  const { accounts, cards, transactions } = useData();
  const [amount, setAmount] = useState('300');
  const value = parseFloat(amount) || 0;

  const recommendations = useMemo(
    () => recommendCardForPurchase(value, accounts, cards, transactions, 'casal'),
    [value, accounts, cards, transactions],
  );

  const best = recommendations.find(r => r.canPay) || recommendations[0];

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-5 w-5 text-purple-600" />
          Melhor cartão do casal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Valor:</span>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-32 h-9"
          />
          <span className="text-xs text-muted-foreground">considera os cartões dos dois</span>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
        ) : value > 0 && best ? (
          <>
            <div className={cn(
              "p-3 rounded-lg border",
              best.canPay ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200",
            )}>
              <div className="flex items-start gap-2">
                {best.canPay
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />}
                <div className="text-sm flex-1">
                  <p className={cn("font-bold", best.canPay ? "text-emerald-900" : "text-rose-900")}>
                    {best.canPay
                      ? `Use o ${best.card.name} (${best.card.owner === 'leandro' ? 'Leandro' : 'Jonathan'})`
                      : `Nenhum cartão paga com folga — considere usar conta ou parcelar`}
                  </p>
                  <p className={cn("text-xs mt-1", best.canPay ? "text-emerald-700" : "text-rose-700")}>
                    Vence {fmtDateBR(best.dueDate)} • Sobra após pagar: {formatCurrency(best.safetyMargin)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {recommendations.map(r => (
                <div key={r.card.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {r.card.owner === 'leandro' ? 'L' : 'J'}
                    </Badge>
                    <span className="font-medium">{r.card.name}</span>
                    <span className="text-muted-foreground">
                      vence {fmtDateBR(r.dueDate)} • fatura {formatCurrency(r.currentBill)}
                    </span>
                  </div>
                  <span className={cn("font-bold", r.canPay ? "text-emerald-600" : "text-rose-600")}>
                    {r.canPay ? `✓ ${formatCurrency(r.safetyMargin)}` : `✗ −${formatCurrency(Math.abs(r.safetyMargin))}`}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Digite um valor.</p>
        )}
      </CardContent>
    </Card>
  );
}

function CoupleBalanceProjection() {
  const { accounts, cards, transactions } = useData();

  const { chartData, imbalanceAlerts, todayL, todayJ } = useMemo(() => {
    const dL = projectDailyBalance(accounts, cards, transactions, 'leandro', -7, 60);
    const dJ = projectDailyBalance(accounts, cards, transactions, 'jonathan', -7, 60);
    const mapJ = new Map(dJ.map(d => [d.date, d.balance]));
    const chartData = dL.map(d => {
      const j = mapJ.get(d.date) ?? 0;
      return {
        date: d.date,
        label: fmtDateBR(d.date),
        leandro: d.balance,
        jonathan: j,
        total: d.balance + j,
      };
    });

    const todayISO = new Date().toISOString().slice(0, 10);
    const imbalanceAlerts: { date: string; negativeOwner: 'Leandro' | 'Jonathan'; negativeBal: number; positiveBal: number; suggest: number }[] = [];
    for (const row of chartData) {
      if (row.date < todayISO) continue;
      if (row.leandro < 0 && row.jonathan > Math.abs(row.leandro)) {
        imbalanceAlerts.push({
          date: row.date,
          negativeOwner: 'Leandro',
          negativeBal: row.leandro,
          positiveBal: row.jonathan,
          suggest: Math.abs(row.leandro),
        });
      } else if (row.jonathan < 0 && row.leandro > Math.abs(row.jonathan)) {
        imbalanceAlerts.push({
          date: row.date,
          negativeOwner: 'Jonathan',
          negativeBal: row.jonathan,
          positiveBal: row.leandro,
          suggest: Math.abs(row.jonathan),
        });
      }
      if (imbalanceAlerts.length >= 3) break;
    }

    const today = chartData.find(c => c.date === todayISO);
    return { chartData, imbalanceAlerts, todayL: today?.leandro ?? 0, todayJ: today?.jonathan ?? 0 };
  }, [accounts, cards, transactions]);

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-5 w-5 text-rose-500 fill-current" />
          Saldo consolidado — Leandro + Jonathan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-purple-50">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Leandro</p>
            <p className={cn("text-lg font-bold", todayL < 0 ? "text-rose-600" : "text-purple-700")}>{formatCurrency(todayL)}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Jonathan</p>
            <p className={cn("text-lg font-bold", todayJ < 0 ? "text-rose-600" : "text-emerald-700")}>{formatCurrency(todayJ)}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-100">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total hoje</p>
            <p className="text-lg font-bold">{formatCurrency(todayL + todayJ)}</p>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={6} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="leandro" name="Leandro" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="jonathan" name="Jonathan" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#1f2937" strokeWidth={2} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {imbalanceAlerts.length > 0 && (
          <div className="space-y-2">
            {imbalanceAlerts.map((a, i) => (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm">
                <ArrowRightLeft className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">
                    Dia {fmtDateBR(a.date)}: {a.negativeOwner} fica negativo ({formatCurrency(a.negativeBal)})
                  </p>
                  <p className="text-xs text-amber-700">
                    O outro tem {formatCurrency(a.positiveBal)} — uma transferência de {formatCurrency(a.suggest)} resolve.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoupleBillsThisMonth() {
  const { accounts, cards, transactions } = useData();

  const { bills, total, projectedTotal, daysAhead } = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    const cutoffISO = cutoff.toISOString().slice(0, 10);

    const billsMap = new Map<string, { card: typeof cards[number]; dueDate: string; amount: number }>();
    for (const t of transactions) {
      if (!t.cardId || t.type !== 'despesa') continue;
      const card = cards.find(c => c.id === t.cardId);
      if (!card) continue;
      const due = getBillDueDate(t.date, card.closingDay, card.dueDay);
      if (due < todayISO || due > cutoffISO) continue;
      const key = `${card.id}__${due}`;
      const prev = billsMap.get(key);
      billsMap.set(key, {
        card,
        dueDate: due,
        amount: (prev?.amount || 0) + Math.abs(t.amount),
      });
    }
    const bills = Array.from(billsMap.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const total = bills.reduce((s, b) => s + b.amount, 0);

    const proj = projectDailyBalance(accounts, cards, transactions, 'casal', 0, 30);
    // saldo total na última data antes do primeiro vencimento
    const projectedTotal = bills.length > 0
      ? (proj.find(p => p.date === bills[bills.length - 1].dueDate)?.balance ?? 0) + total
      : proj[proj.length - 1]?.balance ?? 0;

    return { bills, total, projectedTotal, daysAhead: 30 };
  }, [accounts, cards, transactions]);

  const margin = projectedTotal - total;
  const status = margin < 0 ? 'critical' : margin < total * 0.2 ? 'warning' : 'ok';

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-5 w-5 text-orange-600" />
          Faturas dos próximos {daysAhead} dias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={cn(
          "p-3 rounded-lg border",
          status === 'critical' && "bg-rose-50 border-rose-200",
          status === 'warning' && "bg-amber-50 border-amber-200",
          status === 'ok' && "bg-emerald-50 border-emerald-200",
        )}>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-semibold text-muted-foreground">Total a pagar</p>
            <p className="text-xl font-bold">{formatCurrency(total)}</p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Saldo combinado projetado</p>
            <p className="text-sm font-semibold">{formatCurrency(projectedTotal)}</p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Margem após pagar</p>
            <p className={cn(
              "text-sm font-bold flex items-center gap-1",
              status === 'critical' && "text-rose-600",
              status === 'warning' && "text-amber-700",
              status === 'ok' && "text-emerald-700",
            )}>
              {status !== 'ok' && <TrendingDown className="h-3 w-3" />}
              {formatCurrency(margin)}
            </p>
          </div>
          {status !== 'ok' && (
            <p className={cn(
              "text-xs mt-2",
              status === 'critical' ? "text-rose-700" : "text-amber-700",
            )}>
              {status === 'critical'
                ? '⚠️ Saldo combinado não cobre as faturas — reduza gastos ou antecipe receitas.'
                : 'Margem apertada — evite novas compras grandes neste período.'}
            </p>
          )}
        </div>

        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fatura nos próximos 30 dias.</p>
        ) : (
          <div className="space-y-1">
            {bills.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {b.card.owner === 'leandro' ? 'L' : 'J'}
                  </Badge>
                  <span className="font-medium">{b.card.name}</span>
                  <span className="text-muted-foreground">vence {fmtDateBR(b.dueDate)}</span>
                </div>
                <span className="font-bold">{formatCurrency(b.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CoupleDiagnostic() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-rose-500 fill-current" />
        <h2 className="text-lg font-bold">Diagnóstico do Casal</h2>
        <Badge className="bg-purple-100 text-purple-700 text-[10px]">visão combinada</Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CoupleCardRecommendation />
        <CoupleBillsThisMonth />
        <div className="lg:col-span-1">
          <CoupleBalanceProjection />
        </div>
      </div>
    </div>
  );
}
