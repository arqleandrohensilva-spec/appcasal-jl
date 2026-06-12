import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useData } from '@/lib/store';
import { useMemo, useEffect, useState } from 'react';
import { projectDailyBalance } from '@/lib/projections';

export const Route = createFileRoute('/app/fluxo')({
  component: FluxoCaixa,
});

function FluxoCaixa() {
  const { activeProfile } = useAppContext();
  const { transactions, accounts, cards } = useData();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const days = useMemo(
    () => projectDailyBalance(accounts, cards, transactions, activeProfile, 0, 30),
    [accounts, cards, transactions, activeProfile],
  );

  const chartData = days.map(d => ({
    date: d.date.slice(5).replace('-', '/'),
    balance: d.balance,
  }));

  const minDay = days.reduce((min, d) => d.balance < min.balance ? d : min, days[0]);
  const upcomingEvents = days.filter(d => d.events.length > 0).slice(0, 8);

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold">Fluxo de Caixa Projetado (30 dias)</h1>

      {minDay && minDay.balance < 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="text-amber-600 h-5 w-5 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Atenção para {minDay.date}</p>
              <p className="text-sm text-amber-800">Seu saldo projetado fica em {formatCurrency(minDay.balance)} — abaixo de zero.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Saldo dia a dia</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(val) => `${Math.round(val / 1000)}k`} />
              <Tooltip formatter={(val) => formatCurrency(Number(val))} />
              <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
              <ReferenceLine y={500} stroke="#EAB308" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="balance" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Próximos eventos</h2>
        {upcomingEvents.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem lançamentos no horizonte. Adicione transações em "Transações".</p>
        )}
        {upcomingEvents.map(d => (
          <Card key={d.date} className={`border-l-4 ${d.delta >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">{d.date}</span>
                <span className="text-sm">Saldo: {formatCurrency(d.balance)}</span>
              </div>
              <div className="space-y-1">
                {d.events.map((e, i) => (
                  <div key={i} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="flex items-center gap-2">
                      {e.amount >= 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-600" /> : <ArrowDownRight className="h-3 w-3 text-rose-600" />}
                      {e.description}{e.cardName ? ` · ${e.cardName}` : ''}
                    </span>
                    <span className={`font-bold ${e.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
