import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { useData } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { projectDailyBalance, recommendCardForPurchase } from '@/lib/projections';
import { formatCurrency } from '@/lib/mockData';
import { CalendarDays, CreditCard, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function DailyBalanceProjection() {
  const { accounts, cards, transactions } = useData();
  const { activeProfile } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  const days = useMemo(
    () => projectDailyBalance(accounts, cards, transactions, activeProfile, -14, 60),
    [accounts, cards, transactions, activeProfile],
  );

  const chartData = days.map(d => ({ ...d, label: fmtDateBR(d.date) }));
  const todayISO = new Date().toISOString().slice(0, 10);
  const selected = days.find(d => d.date === selectedDate);
  const today = days.find(d => d.date === todayISO);

  const minBalance = Math.min(...days.map(d => d.balance));
  const negativeDays = days.filter(d => d.date >= todayISO && d.balance < 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-600" />
            Projeção de Saldo Diário
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Ver data:</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-40 h-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Hoje</p>
            <p className="text-xl font-bold">{today ? formatCurrency(today.balance) : '—'}</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            selected && selected.balance < 0 ? "bg-rose-50" : "bg-purple-50",
          )}>
            <p className="text-xs text-muted-foreground uppercase font-semibold">
              {selected ? fmtDateBR(selected.date) : 'Data selecionada'}
            </p>
            <p className={cn(
              "text-xl font-bold",
              selected && selected.balance < 0 ? "text-rose-600" : "text-purple-700",
            )}>
              {selected ? formatCurrency(selected.balance) : '—'}
            </p>
            {selected && selected.delta !== 0 && (
              <p className={cn(
                "text-xs flex items-center gap-1 mt-1",
                selected.delta > 0 ? "text-emerald-600" : "text-rose-600",
              )}>
                {selected.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatCurrency(Math.abs(selected.delta))} no dia
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            minBalance < 0 ? "bg-rose-50" : "bg-emerald-50",
          )}>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Saldo mínimo (próx. 60d)</p>
            <p className={cn(
              "text-xl font-bold",
              minBalance < 0 ? "text-rose-600" : "text-emerald-700",
            )}>
              {formatCurrency(minBalance)}
            </p>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={6} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                labelFormatter={(l) => `Dia ${l}`}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
              {today && (
                <ReferenceLine x={fmtDateBR(today.date)} stroke="#8b5cf6" strokeDasharray="2 2" label={{ value: 'Hoje', fontSize: 10, fill: '#8b5cf6' }} />
              )}
              {selected && (
                <ReferenceDot x={fmtDateBR(selected.date)} y={selected.balance} r={5} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />
              )}
              <Line type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {selected && selected.events.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-semibold mb-2">Eventos em {fmtDateBR(selected.date)}:</p>
            <ul className="space-y-1">
              {selected.events.map((e, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-gray-700">
                    {e.kind === 'bill' ? `💳 Fatura ${e.cardName}: ` : ''}
                    {e.description}
                  </span>
                  <span className={cn("font-medium", e.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                    {formatCurrency(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {negativeDays.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-rose-900">
                Atenção: saldo negativo em {negativeDays.length} dia(s) nos próximos 60.
              </p>
              <p className="text-rose-700 text-xs mt-0.5">
                Primeiro dia crítico: {fmtDateBR(negativeDays[0].date)} ({formatCurrency(negativeDays[0].balance)})
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CardRecommendationWidget() {
  const { accounts, cards, transactions } = useData();
  const { activeProfile } = useAppContext();
  const [amount, setAmount] = useState<string>('300');

  const value = parseFloat(amount) || 0;
  const recommendations = useMemo(
    () => recommendCardForPurchase(value, accounts, cards, transactions, activeProfile),
    [value, accounts, cards, transactions, activeProfile],
  );

  const best = recommendations.find(r => r.canPay) || recommendations[0];
  const ownerCards = recommendations.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          Em qual cartão comprar?
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
            placeholder="R$"
          />
        </div>

        {ownerCards === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre um cartão para receber recomendações.</p>
        ) : best && value > 0 ? (
          <>
            <div className={cn(
              "p-3 rounded-lg border",
              best.canPay ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200",
            )}>
              <div className="flex items-start gap-2">
                {best.canPay ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="text-sm flex-1">
                  <p className={cn("font-bold", best.canPay ? "text-emerald-900" : "text-rose-900")}>
                    {best.canPay
                      ? `Melhor: ${best.card.name}`
                      : `Atenção — nenhum cartão paga essa compra com folga`}
                  </p>
                  <p className={cn("text-xs mt-1", best.canPay ? "text-emerald-700" : "text-rose-700")}>
                    Fatura vence em {fmtDateBR(best.dueDate)}. Saldo projetado: {formatCurrency(best.projectedBalanceOnDue)}.
                    Após pagar {formatCurrency(best.totalDueOnDate)}: {formatCurrency(best.safetyMargin)}.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {recommendations.map(r => (
                <div key={r.card.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{r.card.name}</span>
                    <span className="text-muted-foreground ml-2">
                      vence {fmtDateBR(r.dueDate)} • fatura atual {formatCurrency(r.currentBill)}
                    </span>
                  </div>
                  <span className={cn("font-bold", r.canPay ? "text-emerald-600" : "text-rose-600")}>
                    {r.canPay ? `✓ sobra ${formatCurrency(r.safetyMargin)}` : `✗ falta ${formatCurrency(Math.abs(r.safetyMargin))}`}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Digite um valor para ver a recomendação.</p>
        )}
      </CardContent>
    </Card>
  );
}
