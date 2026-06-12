import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownCircle, Info, TrendingDown, Zap, CreditCard, Receipt } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useData } from '@/lib/store';
import { openCardBills, openInstallments } from '@/lib/insights';

export const Route = createFileRoute('/app/dividas')({
  component: Dividas,
});

function Dividas() {
  const [method, setMethod] = useState<'snowball' | 'avalanche'>('avalanche');
  const [isMounted, setIsMounted] = useState(false);
  const { activeProfile } = useAppContext();
  const { transactions, cards } = useData();

  useEffect(() => { setIsMounted(true); }, []);

  const bills = useMemo(() => openCardBills(transactions, cards, activeProfile), [transactions, cards, activeProfile]);
  const installments = useMemo(() => openInstallments(transactions, activeProfile), [transactions, activeProfile]);

  const totalBills = bills.reduce((s, b) => s + b.total, 0);
  const totalInstallments = installments.reduce((s, i) => s + i.totalRemaining, 0);
  const totalDivida = totalBills + totalInstallments;

  // Lista única ordenada por método
  const ordered = useMemo(() => {
    const items = [
      ...bills.map(b => ({
        kind: 'bill' as const, id: `bill-${b.cardId}-${b.dueDate}`,
        nome: `Fatura ${b.cardName}`, valor: b.total,
        juros: 12, // estimativa rotativo se atrasar
        minima: b.total * 0.15, when: b.dueDate,
      })),
      ...installments.map(i => ({
        kind: 'install' as const, id: i.groupId,
        nome: i.description, valor: i.totalRemaining,
        juros: 0, minima: i.monthlyValue, when: i.nextDueDate,
      })),
    ];
    return items.sort((a, b) => method === 'snowball' ? a.valor - b.valor : b.juros - a.juros);
  }, [bills, installments, method]);

  // Projeção saldo devedor (linear pelas próximas N meses)
  const chartData = useMemo(() => {
    const months = 8;
    const decay = totalDivida / months;
    return Array.from({ length: months + 1 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      return {
        mes: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`,
        saldo: Math.max(0, totalDivida - decay * i),
      };
    });
  }, [totalDivida]);

  if (!isMounted) return null;

  if (totalDivida === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Plano de Quitação de Dívidas</h1>
          <p className="text-muted-foreground">Estratégias inteligentes para zerar suas pendências.</p>
        </header>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-4xl">🎉</p>
            <p className="font-bold text-emerald-900">Você não tem dívidas pendentes!</p>
            <p className="text-sm text-emerald-700">Nenhuma fatura em aberto nem parcelamento ativo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plano de Quitação</h1>
          <p className="text-muted-foreground">Faturas em aberto + parcelamentos a vencer.</p>
        </div>
        <Tabs value={method} onValueChange={(v: any) => setMethod(v)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="snowball">Snowball</TabsTrigger>
            <TabsTrigger value="avalanche">Avalanche</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Total devido</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalDivida)}</p>
            <p className="text-xs text-muted-foreground mt-1">{bills.length} fatura(s) + {installments.length} parcelamento(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Faturas em aberto</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalBills)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Cartões</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Parcelamentos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalInstallments)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Receipt className="h-3 w-3" /> A vencer</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Ordem recomendada</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordered.map((d, idx) => (
                  <div key={d.id} className="flex items-center gap-4 p-4 border rounded-lg bg-white">
                    <div className="bg-emerald-100 text-emerald-700 h-8 w-8 rounded-full flex items-center justify-center font-bold">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="font-bold flex items-center gap-2">
                        {d.kind === 'bill' ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <Receipt className="h-4 w-4 text-muted-foreground" />}
                        {d.nome}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Info className="h-3 w-3" /> {d.kind === 'bill' ? `Vence ${d.when}` : `Próx. parc. ${d.when}`}</span>
                        <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Mín: {formatCurrency(d.minima)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(d.valor)}</p>
                      {idx === 0 && <Badge className="bg-emerald-500">FOCO</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Projeção de saldo devedor</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="saldo" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saldo devedor" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200 h-fit">
          <CardHeader><CardTitle className="text-blue-900 flex items-center gap-2"><Zap className="h-5 w-5" /> Método {method === 'snowball' ? 'Snowball' : 'Avalanche'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-blue-800">
              {method === 'snowball'
                ? 'Quita primeiro as dívidas menores para gerar motivação rápida.'
                : 'Quita primeiro as dívidas com maior juros, economizando dinheiro no longo prazo.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
