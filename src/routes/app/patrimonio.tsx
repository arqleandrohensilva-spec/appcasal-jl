import { createFileRoute } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Landmark, CreditCard, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/lib/store';
import { useMemo } from 'react';
import { totalLiabilities, openCardBills } from '@/lib/insights';
import { monthlyEvolution } from '@/lib/finance';

export const Route = createFileRoute('/app/patrimonio')({
  component: Patrimonio,
});

function Patrimonio() {
  const { activeProfile } = useAppContext();
  const { accounts, transactions, cards } = useData();

  const ownAccounts = useMemo(
    () => accounts.filter(a => activeProfile === 'casal' || a.owner === activeProfile),
    [accounts, activeProfile],
  );

  const totalAssets = ownAccounts.reduce((s, a) => s + a.balance, 0);
  const passives = useMemo(() => totalLiabilities(transactions, cards, activeProfile), [transactions, cards, activeProfile]);
  const netWorth = totalAssets - passives;

  const evolution = useMemo(() => monthlyEvolution(transactions, activeProfile, 6), [transactions, activeProfile]);
  // Aprox: patrimônio mês a mês = patrimônio atual ajustado pelo saldoDoMes acumulado reverso
  const historyData = useMemo(() => {
    let cur = netWorth;
    const out: { month: string; value: number }[] = [];
    for (let i = evolution.length - 1; i >= 0; i--) {
      out.unshift({ month: evolution[i].mes, value: cur });
      cur = cur - evolution[i].saldo;
    }
    return out;
  }, [evolution, netWorth]);

  const composition = [
    { name: 'Corrente', value: ownAccounts.filter(a => a.type === 'corrente').reduce((s, a) => s + a.balance, 0) },
    { name: 'Poupança', value: ownAccounts.filter(a => a.type === 'poupanca').reduce((s, a) => s + a.balance, 0) },
    { name: 'Investimentos', value: ownAccounts.filter(a => a.type === 'investimento').reduce((s, a) => s + a.balance, 0) },
    { name: 'Dinheiro', value: ownAccounts.filter(a => a.type === 'dinheiro').reduce((s, a) => s + a.balance, 0) },
  ].filter(d => d.value > 0);

  const colors = ['#8b5cf6', '#34d399', '#f59e0b', '#3b82f6'];

  const bills = useMemo(() => openCardBills(transactions, cards, activeProfile), [transactions, cards, activeProfile]);

  const growth = historyData.length > 1 ? netWorth - historyData[historyData.length - 2].value : 0;
  const growthPct = historyData.length > 1 && historyData[historyData.length - 2].value > 0
    ? (growth / historyData[historyData.length - 2].value) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Patrimônio</h1>
        <p className="text-muted-foreground">Visão consolidada — calculada a partir das suas contas e cartões.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <CardHeader className="pb-2 text-gray-400 text-xs uppercase font-bold tracking-wider">Patrimônio Líquido</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(netWorth)}</div>
            {growth !== 0 && (
              <div className={`flex items-center gap-1 text-sm mt-2 ${growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {growth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatCurrency(Math.abs(growth))} este mês ({growthPct.toFixed(1)}%)
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-muted-foreground text-xs uppercase font-bold tracking-wider">Total Ativos</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAssets)}</div>
            <p className="text-xs text-muted-foreground mt-1">{ownAccounts.length} conta(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-muted-foreground text-xs uppercase font-bold tracking-wider">Total Passivos</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(passives)}</div>
            <p className="text-xs text-muted-foreground mt-1">{bills.length} fatura(s) em aberto</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Composição dos Ativos</CardTitle></CardHeader>
          <CardContent className="h-64">
            {composition.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-16">Adicione contas em "Contas"</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={composition} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {composition.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Evolução (6 meses)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis hide />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="passivos">Passivos</TabsTrigger>
        </TabsList>
        <TabsContent value="ativos" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownAccounts.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {a.type === 'investimento' ? <TrendingUp className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{a.type}</p>
                    </div>
                  </div>
                  <p className="font-bold">{formatCurrency(a.balance)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="passivos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {bills.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma fatura em aberto.</p>
                )}
                {bills.map(b => (
                  <div key={`${b.cardId}-${b.dueDate}`} className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Fatura {b.cardName}</p>
                        <p className="text-xs text-muted-foreground">Vence {b.dueDate} · {b.itemCount} compra(s)</p>
                      </div>
                    </div>
                    <span className="font-bold">{formatCurrency(b.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
