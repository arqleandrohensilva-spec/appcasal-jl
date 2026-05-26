import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';

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
    </div>
  );
}
