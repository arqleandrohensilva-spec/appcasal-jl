import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { LIFE_EVENTS } from '@/lib/premiumData';
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/metas')({
  component: Metas,
});

function Metas() {
  const { activeProfile } = useAppContext();
  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Metas</h1>
          <p className="text-muted-foreground">Acompanhe seu progresso financeiro</p>
        </div>
        <Button className={data.color}>
          <Plus className="h-4 w-4 mr-2" /> Nova Meta
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.metas.map((meta: any, idx: number) => {
          const percent = Math.round((meta.atual / meta.alvo) * 100);
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{meta.name}</CardTitle>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" /> {meta.prazo}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(meta.atual)}</p>
                    <p className="text-xs text-muted-foreground">de {formatCurrency(meta.alvo)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-emerald-600">{percent}%</span>
                  </div>
                </div>
                <Progress value={percent} className="h-3" />
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">Faltam {formatCurrency(meta.alvo - meta.atual)} para atingir o objetivo.</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="pt-6">
        <h2 className="text-xl font-bold mb-4">Sinking Funds (Fundos Reserva)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data as any).sinkingFunds?.map((fund: any, idx: number) => {
            const percent = Math.round((fund.atual / fund.alvo) * 100);
            return (
              <Card key={idx} className="bg-blue-50 border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-900">{fund.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-xs text-blue-800">
                    <span>{formatCurrency(fund.atual)} / {formatCurrency(fund.alvo)}</span>
                    <span className="font-bold">{percent}%</span>
                  </div>
                  <Progress value={percent} className="h-2 bg-blue-200" />
                  <div className="p-2 bg-white rounded border border-blue-100">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Aporte Mensal</p>
                    <p className="text-sm font-bold text-blue-700">{formatCurrency(fund.aporte)}</p>
                  </div>
                  <p className="text-[10px] text-blue-600">Disponível em: {fund.prazo}</p>
                </CardContent>
              </Card>
            );
          })}
          {(!(data as any).sinkingFunds || (data as any).sinkingFunds.length === 0) && (
            <Card className="col-span-full border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhum sinking fund configurado.</p>
            </Card>
          )}
        </div>
      </div>

      <div className="pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Planejamento de Grandes Eventos de Vida</h2>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Novo Evento
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            {LIFE_EVENTS.map(event => (
              <Card key={event.id} className="cursor-pointer hover:border-purple-500 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl", event.color)}>
                    {event.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">{event.name}</h4>
                    <p className="text-xs text-muted-foreground">{event.date} • {formatCurrency(event.estimatedCost)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-dashed flex items-center justify-center p-6 text-muted-foreground hover:text-purple-600 hover:border-purple-300 transition-colors cursor-pointer">
              <div className="text-center">
                <Plus className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Criar evento personalizado</span>
              </div>
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Simulação de Impacto no Patrimônio</CardTitle>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-full" /> Sem evento</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full" /> Com evento</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart data={[
                    { year: '2026', sem: 28400, com: 28400 },
                    { year: '2027', sem: 45000, com: 20000 },
                    { year: '2028', sem: 68000, com: -12000 },
                    { year: '2029', sem: 95000, com: 5000 },
                    { year: '2030', sem: 130000, com: 45000 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" />
                    <YAxis hide />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Area type="monotone" dataKey="sem" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="com" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  </RechartsAreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-3 bg-rose-50 rounded-xl">
                  <p className="text-[10px] text-rose-600 uppercase font-bold">Impacto 1º Ano</p>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                    <span className="font-bold text-rose-700">-R$ 58.400</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-[10px] text-blue-600 uppercase font-bold">Dica de Absorção</p>
                  <p className="text-xs font-bold text-blue-700 mt-1">Guardar +R$ 1.200/mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


