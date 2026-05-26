import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const { activeProfile } = useAppContext();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu dashboard financeiro</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
             <p className="text-xs text-muted-foreground uppercase font-semibold">Saúde Financeira</p>
             <Badge className={cn("mt-1", data.color)}>{data.score}/100</Badge>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Receita do Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.receita)}</div>
            <p className="text-xs text-emerald-600 flex items-center mt-1"><ArrowUpRight className="h-3 w-3 mr-1" /> +12% vs mês ant.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Gastos do Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.gastos)}</div>
            <p className="text-xs text-red-600 flex items-center mt-1"><ArrowDownRight className="h-3 w-3 mr-1" /> +5% vs mês ant.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Poupança</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.poupanca)}</div>
            <p className="text-xs text-emerald-600 mt-1">{('poupancaPercent' in data ? (data as any).poupancaPercent : 31)}% da receita</p>
          </CardContent>
        </Card>
        {activeProfile === 'casal' && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Patrimônio Líquido</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency((data as any).patrimonio)}</div>
              <p className="text-xs text-emerald-600 mt-1">Crescimento constante</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Últimas Transações</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {((data as any).transacoes || []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full bg-gray-100", t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600')}>
                      {t.tipo === 'receita' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{t.descricao}</p>
                      <p className="text-xs text-muted-foreground">{t.categoria} • {t.data}</p>
                    </div>
                  </div>
                  <div className={cn("font-bold", t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600')}>
                    {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(t.valor)}
                  </div>
                </div>
              ))}
              {activeProfile === 'casal' && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h4 className="font-bold text-orange-800 flex items-center gap-2">
                    <Heart className="h-4 w-4 fill-current" /> IA do Casal
                  </h4>
                  <p className="text-sm text-orange-700 mt-1">Identificamos que vocês podem economizar R$ 180,00 cancelando assinaturas duplicadas de streaming.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Metas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.metas.map((meta: any, idx: number) => {
                const percent = Math.round((meta.atual / meta.alvo) * 100);
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{meta.name}</span>
                      <span className="text-muted-foreground">{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">Faltam {formatCurrency(meta.alvo - meta.atual)}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {activeProfile !== 'casal' && (data as any).gastosPorCategoria && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Gastos por Categoria</CardTitle></CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={(data as any).gastosPorCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} fill="#8884d8">
                      {(data as any).gastosPorCategoria.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#8b5cf6', '#34d399', '#f59e0b', '#ef4444', '#3b82f6', '#6366f1'][index % 6]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
