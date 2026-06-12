import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/lib/store';
import { monthlyEvolution, monthlyStats } from '@/lib/finance';

export const Route = createFileRoute('/app/relatorios')({
  component: Relatorios,
});

const PIE_COLORS = ['#8b5cf6', '#34d399', '#f59e0b', '#ef4444', '#3b82f6', '#6366f1', '#ec4899', '#14b8a6'];

function Relatorios() {
  const { activeProfile } = useAppContext();
  const { transactions } = useData();
  const [isMounted, setIsMounted] = useState(false);
  const [monthsBack, setMonthsBack] = useState(6);

  useEffect(() => { setIsMounted(true); }, []);

  const now = new Date();
  const evolution = useMemo(
    () => monthlyEvolution(transactions, activeProfile, monthsBack),
    [transactions, activeProfile, monthsBack],
  );
  const currentMonth = useMemo(
    () => monthlyStats(transactions, activeProfile, now.getFullYear(), now.getMonth()),
    [transactions, activeProfile, now.getFullYear(), now.getMonth()],
  );

  const comparativo = useMemo(() => {
    if (activeProfile !== 'casal') return [];
    const L = monthlyStats(transactions, 'leandro', now.getFullYear(), now.getMonth());
    const J = monthlyStats(transactions, 'jonathan', now.getFullYear(), now.getMonth());
    const cats = new Set([...L.porCategoria.map(c => c.name), ...J.porCategoria.map(c => c.name)]);
    return Array.from(cats).map(name => ({
      category: name,
      L: L.porCategoria.find(c => c.name === name)?.value ?? 0,
      J: J.porCategoria.find(c => c.name === name)?.value ?? 0,
    })).sort((a, b) => (b.L + b.J) - (a.L + a.J)).slice(0, 6);
  }, [activeProfile, transactions, now.getFullYear(), now.getMonth()]);

  const totalReceita = evolution.reduce((s, m) => s + m.receita, 0);
  const totalGastos = evolution.reduce((s, m) => s + m.gastos, 0);
  const totalSaldo = totalReceita - totalGastos;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatórios e Análise</h1>
          <p className="text-muted-foreground">Receita, gastos e categorias — dados reais das suas transações</p>
        </div>
        <Select value={String(monthsBack)} onValueChange={v => setMonthsBack(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Receita acumulada</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceita)}</div>
            <p className="text-xs text-muted-foreground">em {monthsBack} meses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Gastos acumulados</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalGastos)}</div>
            <p className="text-xs text-muted-foreground">em {monthsBack} meses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Saldo do período</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalSaldo >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(totalSaldo)}</div>
            <p className="text-xs text-muted-foreground">receita − gastos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Receita vs Gastos</CardTitle></CardHeader>
        <CardContent className="h-80">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita" />
                <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} name="Gastos" />
                <Line type="monotone" dataKey="saldo" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 2" name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Gastos do mês por categoria</CardTitle></CardHeader>
          <CardContent>
            {currentMonth.porCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem gastos neste mês ainda.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="h-48">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={currentMonth.porCategoria} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                          {currentMonth.porCategoria.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="space-y-2">
                  {currentMonth.porCategoria.slice(0, 6).map((c, i) => (
                    <div key={c.name} className="flex justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {c.name}
                      </span>
                      <span className="font-bold">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {activeProfile === 'casal' && (
          <Card>
            <CardHeader><CardTitle>Leandro vs Jonathan (mês)</CardTitle></CardHeader>
            <CardContent className="h-64">
              {comparativo.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sem dados para comparar.</p>
              ) : isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativo}>
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="L" fill="#8b5cf6" name="Leandro" />
                    <Bar dataKey="J" fill="#10b981" name="Jonathan" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
