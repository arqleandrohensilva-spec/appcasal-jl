import { createFileRoute } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { AGENT_RECOMMENDATIONS } from '@/lib/premiumData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, CheckCircle2, XCircle, Clock, ArrowRight, ShieldCheck, Target, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/agente')({
  component: Agente,
});

function Agente() {
  const { activeProfile } = useAppContext();
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'money_parked': return <Clock className="h-5 w-5" />;
      case 'goal_risk': return <Target className="h-5 w-5" />;
      case 'forgotten_sub': return <Receipt className="h-5 w-5" />;
      case 'savings_opp': return <ShieldCheck className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" /> Agente Autônomo
          </h1>
          <p className="text-muted-foreground">Análise semanal baseada em IA para otimizar suas finanças</p>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Última análise: Domingo, 24/05
        </Badge>
      </header>

      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-lg font-bold px-1">Recomendações Pendentes</h2>
        {AGENT_RECOMMENDATIONS.map((rec) => (
          <Card key={rec.id} className="overflow-hidden border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 h-fit">
                  {getIcon(rec.type)}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{rec.title}</h3>
                    <Badge className={cn(
                      rec.urgency === 'high' ? 'bg-rose-100 text-rose-700' : 
                      rec.urgency === 'medium' ? 'bg-orange-100 text-orange-700' : 
                      'bg-blue-100 text-blue-700'
                    )}>
                      Urgência {rec.urgency === 'high' ? 'Alta' : rec.urgency === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  <p className="text-gray-600">{rec.description}</p>
                  <div className="flex gap-2 pt-2">
                    <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                      {rec.primaryAction} <ArrowRight className="h-4 w-4" />
                    </Button>
                    {rec.secondaryAction && (
                      <Button variant="outline">{rec.secondaryAction}</Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="pt-8 space-y-4">
          <h2 className="text-lg font-bold px-1 text-muted-foreground">Histórico</h2>
          <Card className="opacity-60 bg-gray-50/50">
            <CardContent className="p-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Consolidação de dívidas aprovada</span>
              </div>
              <span className="text-xs text-muted-foreground">15/05/2026</span>
            </CardContent>
          </Card>
          <Card className="opacity-60 bg-gray-50/50">
            <CardContent className="p-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span>Troca de plano de celular ignorada</span>
              </div>
              <span className="text-xs text-muted-foreground">08/05/2026</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-3xl text-white text-center space-y-4">
        <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <h3 className="text-2xl font-bold">Inteligência a seu serviço</h3>
        <p className="max-w-md mx-auto opacity-90">O Agente Autônomo analisa mais de 50 variáveis para garantir que seu dinheiro trabalhe para você.</p>
      </div>
    </div>
  );
}
