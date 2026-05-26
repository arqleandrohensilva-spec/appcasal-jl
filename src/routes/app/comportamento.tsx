import { createFileRoute } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { EMOTIONAL_TRIGGERS } from '@/lib/premiumData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Moon, Calendar, AlertTriangle, Bell, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const Route = createFileRoute('/app/comportamento')({
  component: Comportamento,
});

function Comportamento() {
  const { activeProfile } = useAppContext();
  const triggers = EMOTIONAL_TRIGGERS.filter(t => t.owner === activeProfile || activeProfile === 'casal');

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const times = ['Manhã', 'Tarde', 'Noite'];

  const getIntensity = (day: string, time: string) => {
    if (activeProfile === 'jonathan' && day === 'Sex' && time === 'Noite') return 'bg-emerald-900';
    if (activeProfile === 'leandro' && day === 'Dom' && time === 'Tarde') return 'bg-purple-900';
    if (day === 'Sáb') return activeProfile === 'leandro' ? 'bg-purple-300' : 'bg-emerald-300';
    return 'bg-gray-100';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Comportamento</h1>
        <p className="text-muted-foreground">Detector de gatilhos emocionais e padrões de consumo</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" /> Heatmap de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <div className="space-y-4 pt-8">
                {times.map(t => <div key={t} className="text-xs text-muted-foreground h-10 flex items-center">{t}</div>)}
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2">
                  {days.map(d => <div key={d} className="text-xs text-center text-muted-foreground">{d}</div>)}
                </div>
                <div className="space-y-2">
                  {times.map(t => (
                    <div key={t} className="grid grid-cols-7 gap-2">
                      {days.map(d => (
                        <TooltipProvider key={d}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn("h-10 rounded-md cursor-pointer transition-colors", getIntensity(d, t))} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{d} - {t}</p>
                              <p className="font-bold">Gasto médio: {formatCurrency(Math.random() * 200)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground justify-end">
              <span>Menos</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-gray-100 rounded" />
                <div className="w-3 h-3 bg-gray-300 rounded" />
                <div className={cn("w-3 h-3 rounded", activeProfile === 'leandro' ? 'bg-purple-500' : 'bg-emerald-500')} />
                <div className={cn("w-3 h-3 rounded", activeProfile === 'leandro' ? 'bg-purple-900' : 'bg-emerald-900')} />
              </div>
              <span>Mais</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" /> Gatilhos Detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {triggers.map(trigger => (
              <div key={trigger.id} className="p-4 border rounded-xl space-y-3 relative overflow-hidden group">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="text-2xl">{trigger.icon}</div>
                    <div>
                      <h4 className="font-bold">{trigger.title}</h4>
                      <p className="text-xs text-muted-foreground">{trigger.description}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Frequência</p>
                    <p className="text-sm">{trigger.frequency}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Custo Total</p>
                    <p className="text-sm font-bold text-rose-600">{formatCurrency(trigger.cost)}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2 group-hover:bg-gray-50">
                  <Bell className="h-4 w-4" /> Criar alerta para este gatilho
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-orange-50 border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-900 text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> Padrões do Casal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-800">
            Identificamos que <b>ambos</b> possuem picos de gastos nas sextas à noite. 
            Isso representa 14% do orçamento mensal do casal. Que tal uma "Noite do Cinema" em casa uma vez por mês?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
