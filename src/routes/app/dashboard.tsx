import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Heart, Flame, Sparkles, X, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DailyBalanceProjection, CardRecommendationWidget } from '@/components/dashboard/BalanceProjection';
import { CoupleDiagnostic } from '@/components/dashboard/CoupleDiagnostic';
import { useData } from '@/lib/store';
import { monthlyStats, goalProgress } from '@/lib/finance';


export const Route = createFileRoute('/app/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const { activeProfile } = useAppContext();
  const { transactions, accounts, goals, contributions } = useData();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mockProfile = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  const now = new Date();
  const stats = useMemo(
    () => monthlyStats(transactions, activeProfile, now.getFullYear(), now.getMonth()),
    [transactions, activeProfile, now.getFullYear(), now.getMonth()],
  );
  const saldoTotal = useMemo(
    () => accounts
      .filter(a => activeProfile === 'casal' || a.owner === activeProfile)
      .reduce((s, a) => s + a.balance, 0),
    [accounts, activeProfile],
  );
  const userGoals = useMemo(
    () => goals.filter(g => activeProfile === 'casal' || g.owner === activeProfile).slice(0, 3),
    [goals, activeProfile],
  );

  // Dados de exibição: combina perfil mockado (nome/score/cor) com cálculos reais
  const data: any = {
    ...mockProfile,
    receita: stats.receita,
    gastos: stats.gastos,
    poupanca: saldoTotal,
    patrimonio: saldoTotal,
    gastosPorCategoria: stats.porCategoria.slice(0, 6).map(c => ({ ...c, prevValue: c.value })),
    metas: userGoals.length > 0
      ? userGoals.map(g => ({
          name: g.name,
          alvo: g.target,
          atual: goalProgress(contributions, g.id),
          prazo: g.deadline,
        }))
      : [],
  };

  if (!isMounted) return null;


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu dashboard financeiro</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
             <Flame className="h-4 w-4 fill-current" /> 12 Semanas
           </div>
           <div className="text-right">
             <p className="text-xs text-muted-foreground uppercase font-semibold">Saúde Financeira</p>
             <Badge className={cn("mt-1", data.color)}>{data.score}/100</Badge>
           </div>
        </div>
      </header>

      {/* Briefing Diário */}
      <Card className="bg-gradient-to-r from-purple-50 via-white to-emerald-50 border-none shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardContent className="p-5 flex gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm h-fit text-purple-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-bold text-gray-900">Bom dia, {activeProfile === 'leandro' ? 'Leandro' : activeProfile === 'jonathan' ? 'Jonathan' : 'pessoal'} ☀️</p>
            <div className="text-sm text-gray-600 space-y-0.5">
              <p>• Hoje vence sua fatura Nubank — R$ 2.340</p>
              <p>• Esta semana você gastou R$ 340 — 22% abaixo da média</p>
              <p>• {activeProfile === 'jonathan' ? 'Sexta chegando — lembre do limite de R$ 50 em delivery' : 'Sua reserva de emergência cresceu R$ 800 este mês'}</p>
            </div>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="icon" className="text-gray-400">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Anomalia */}

      {(data as any).gastosPorCategoria?.some((c: any) => c.value > c.prevValue * 1.5) && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-rose-900">Anomalia detectada!</p>
            <p className="text-sm text-rose-700">Você gastou 2.4x mais em <b>Alimentação</b> esta semana em comparação à sua média dos últimos 3 meses.</p>
          </div>
        </div>
      )}

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

      {/* Diagnóstico exclusivo do casal */}
      {activeProfile === 'casal' && <CoupleDiagnostic />}

      {/* Projeção diária de saldo + Recomendação de cartão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DailyBalanceProjection />
        </div>
        <CardRecommendationWidget />
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

          {activeProfile !== 'casal' && (data as any).gastosPorCategoria && isMounted && (
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
