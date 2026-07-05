import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Area, ComposedChart } from 'recharts';
import { useData } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { projectDailyBalance } from '@/lib/projections';
import { formatCurrency } from '@/lib/mockData';
import { CalendarDays, TrendingDown, TrendingUp, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/projecao')({
  component: ProjecaoPage,
});

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}
function fmtShort(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
function weekdayBR(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

const RANGES = [
  { label: '30 dias', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
];

function ProjecaoPage() {
  const { accounts, cards, transactions } = useData();
  const { activeProfile } = useAppContext();
  const [rangeDays, setRangeDays] = useState(180);
  const [showPast, setShowPast] = useState(30);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  const days = useMemo(
    () => projectDailyBalance(accounts, cards, transactions, activeProfile, -showPast, rangeDays),
    [accounts, cards, transactions, activeProfile, rangeDays, showPast],
  );

  const todayISO = new Date().toISOString().slice(0, 10);
  const today = days.find(d => d.date === todayISO);
  const future = days.filter(d => d.date >= todayISO);
  const minDay = future.reduce((min, d) => (d.balance < min.balance ? d : min), future[0] || days[0]);
  const maxDay = future.reduce((max, d) => (d.balance > max.balance ? d : max), future[0] || days[0]);
  const negativeDays = future.filter(d => d.balance < 0);
  const finalBalance = future[future.length - 1]?.balance ?? 0;
  const currentBalance = today?.balance ?? 0;
  const variation = finalBalance - currentBalance;

  // Eventos agrupados por mês para o resumo
  const monthSummary = useMemo(() => {
    const map = new Map<string, { entrada: number; saida: number; days: typeof days }>();
    for (const d of future) {
      const ym = d.date.slice(0, 7);
      const existing = map.get(ym) || { entrada: 0, saida: 0, days: [] };
      existing.days.push(d);
      existing.entrada += d.events.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
      existing.saida += d.events.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
      map.set(ym, existing);
    }
    return Array.from(map.entries()).map(([ym, v]) => ({ ym, ...v }));
  }, [future]);

  const chartData = days.map(d => ({
    ...d,
    label: fmtShort(d.date),
    positivo: d.balance >= 0 ? d.balance : 0,
    negativo: d.balance < 0 ? d.balance : 0,
  }));

  const filteredDays = filterText
    ? days.filter(d =>
        d.date.includes(filterText) ||
        d.events.some(e => e.description.toLowerCase().includes(filterText.toLowerCase())),
      )
    : days;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-purple-600" />
          Projeção de Saldo Diário
        </h1>
        <p className="text-muted-foreground text-sm">
          Cenário de cada dia com base nas suas contas, transações e faturas de cartão — até 1 ano à frente.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Saldo Hoje</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(currentBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Em {Math.round(rangeDays / 30)} meses</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(finalBalance)}</p>
            <p className={cn("text-xs flex items-center gap-1 mt-1", variation >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatCurrency(Math.abs(variation))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Pior dia</p>
            <p className={cn("text-xl font-bold mt-1", minDay && minDay.balance < 0 ? "text-rose-600" : "")}>
              {minDay ? formatCurrency(minDay.balance) : '—'}
            </p>
            {minDay && <p className="text-xs text-muted-foreground mt-1">{fmtBR(minDay.date)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Melhor dia</p>
            <p className="text-xl font-bold mt-1 text-emerald-700">
              {maxDay ? formatCurrency(maxDay.balance) : '—'}
            </p>
            {maxDay && <p className="text-xs text-muted-foreground mt-1">{fmtBR(maxDay.date)}</p>}
          </CardContent>
        </Card>
      </div>

      {negativeDays.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-rose-900">
              Saldo negativo previsto em {negativeDays.length} dia(s).
            </p>
            <p className="text-rose-700 text-xs mt-1">
              Primeiro dia crítico: <b>{fmtBR(negativeDays[0].date)}</b> ({formatCurrency(negativeDays[0].balance)}).
              Considere antecipar receitas ou adiar gastos.
            </p>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Linha do tempo</CardTitle>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <Button
                  key={r.days}
                  size="sm"
                  variant={rangeDays === r.days ? 'default' : 'outline'}
                  onClick={() => setRangeDays(r.days)}
                  className="h-7 text-xs"
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="neg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(chartData.length / 12))} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  formatter={(v: any) => formatCurrency(Number(v))}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine x={fmtShort(todayISO)} stroke="#8b5cf6" strokeDasharray="2 2" label={{ value: 'Hoje', fontSize: 10, fill: '#8b5cf6' }} />
                <Area type="monotone" dataKey="positivo" stroke="none" fill="url(#pos)" />
                <Area type="monotone" dataKey="negativo" stroke="none" fill="url(#neg)" />
                <Line type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Resumo mensal */}
      <Card>
        <CardHeader><CardTitle>Resumo mensal</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {monthSummary.map(m => {
              const [y, mo] = m.ym.split('-');
              const monthName = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              const saldoFinal = m.days[m.days.length - 1]?.balance ?? 0;
              return (
                <div key={m.ym} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold capitalize">{monthName}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-600">+{formatCurrency(m.entrada)}</span>
                      {' / '}
                      <span className="text-rose-600">-{formatCurrency(m.saida)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold", saldoFinal < 0 ? "text-rose-600" : "")}>{formatCurrency(saldoFinal)}</p>
                    <p className="text-[10px] text-muted-foreground">saldo final do mês</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabela dia a dia */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Cenário dia a dia</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filtrar (data ou descrição)"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="h-8 w-56 text-sm"
              />
              <select
                value={showPast}
                onChange={e => setShowPast(Number(e.target.value))}
                className="h-8 text-xs border rounded px-2 bg-white"
              >
                <option value={0}>Só futuro</option>
                <option value={7}>+ últimos 7 dias</option>
                <option value={30}>+ últimos 30 dias</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">

              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="p-3 font-semibold w-8"></th>
                  <th className="p-3 font-semibold">Data</th>
                  <th className="p-3 font-semibold text-right">Movimento</th>
                  <th className="p-3 font-semibold text-right">Saldo do dia</th>
                </tr>
              </thead>
              <tbody>
                {filteredDays.map(d => {
                  const isToday = d.date === todayISO;
                  const isPast = d.date < todayISO;
                  const hasEvents = d.events.length > 0;
                  const expanded = expandedDay === d.date;
                  return (
                    <>
                      <tr
                        key={d.date}
                        className={cn(
                          "border-b hover:bg-gray-50 cursor-pointer",
                          isToday && "bg-purple-50",
                          isPast && "opacity-60",
                        )}
                        onClick={() => hasEvents && setExpandedDay(expanded ? null : d.date)}
                      >
                        <td className="p-3">
                          {hasEvents ? (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{fmtBR(d.date)}</span>
                            {isToday && <Badge className="bg-purple-600 text-white text-[10px]">Hoje</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {weekdayBR(d.date)}
                          </p>
                        </td>
                        <td className={cn("p-3 text-right tabular-nums", d.delta > 0 ? "text-emerald-600" : d.delta < 0 ? "text-rose-600" : "text-muted-foreground")}>
                          {d.delta === 0 ? '—' : `${d.delta > 0 ? '+' : ''}${formatCurrency(d.delta)}`}
                        </td>
                        <td className={cn("p-3 text-right font-bold tabular-nums", d.balance < 0 ? "text-rose-600" : "")}>
                          {formatCurrency(d.balance)}
                        </td>
                      </tr>
                      {expanded && hasEvents && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={4} className="p-3 pl-12">
                            <ul className="space-y-1 text-xs">
                              {d.events.map((e, i) => (
                                <li key={i} className="flex justify-between">
                                  <span>
                                    {e.kind === 'bill' ? `💳 Fatura ${e.cardName}: ` : ''}
                                    {e.description}
                                  </span>
                                  <span className={cn("font-medium", e.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                                    {formatCurrency(e.amount)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
