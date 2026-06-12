import { createFileRoute } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight, ShieldCheck, Target, Receipt, AlertTriangle, TrendingUp, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/store';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { categoryAnomalies, openCardBills, subscriptions, pendingThisMonth } from '@/lib/insights';
import { monthlyStats, goalProgress } from '@/lib/finance';
import { formatCurrency } from '@/lib/mockData';

export const Route = createFileRoute('/app/agente')({
  component: Agente,
});

interface Rec {
  id: string;
  type: 'anomaly' | 'bill' | 'sub' | 'goal' | 'reserve';
  title: string;
  description: string;
  primary: string;
  to: string;
  urgency: 'high' | 'medium' | 'low';
}

function Agente() {
  const { activeProfile } = useAppContext();
  const { transactions, cards, accounts, goals, contributions } = useData();
  const navigate = useNavigate();

  const recommendations: Rec[] = useMemo(() => {
    const recs: Rec[] = [];
    const now = new Date();
    const stats = monthlyStats(transactions, activeProfile, now.getFullYear(), now.getMonth());
    const saldo = accounts.filter(a => activeProfile === 'casal' || a.owner === activeProfile).reduce((s, a) => s + a.balance, 0);
    const pendentes = pendingThisMonth(transactions, cards, activeProfile);

    // Anomalias
    for (const a of categoryAnomalies(transactions, activeProfile).slice(0, 2)) {
      recs.push({
        id: `anom-${a.category}`,
        type: 'anomaly',
        title: `${a.category} ${a.ratio.toFixed(1)}x acima da média`,
        description: `Este mês: ${formatCurrency(a.current)} — média dos últimos 3 meses: ${formatCurrency(a.avg3m)}. Vale revisar o que aconteceu.`,
        primary: 'Ver transações',
        to: '/app/transacoes',
        urgency: a.ratio > 2 ? 'high' : 'medium',
      });
    }

    // Faturas próximas (próximos 7 dias)
    const bills = openCardBills(transactions, cards, activeProfile);
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7ISO = in7.toISOString().slice(0, 10);
    for (const b of bills.filter(b => b.dueDate <= in7ISO).slice(0, 2)) {
      recs.push({
        id: `bill-${b.cardId}-${b.dueDate}`,
        type: 'bill',
        title: `Fatura ${b.cardName} vence em breve`,
        description: `${formatCurrency(b.total)} vence em ${b.dueDate}. Saldo atual em conta: ${formatCurrency(saldo)}.`,
        primary: 'Ver cartões',
        to: '/app/cartoes',
        urgency: saldo < b.total ? 'high' : 'medium',
      });
    }

    // Assinaturas
    const subs = subscriptions(transactions, activeProfile);
    if (subs.length >= 3) {
      const total = subs.reduce((s, x) => s + x.monthly, 0);
      recs.push({
        id: 'subs',
        type: 'sub',
        title: `Você tem ${subs.length} assinaturas ativas`,
        description: `${formatCurrency(total)}/mês em recorrências. Vale revisar quais ainda usa.`,
        primary: 'Ver transações',
        to: '/app/transacoes',
        urgency: 'low',
      });
    }

    // Reserva baixa
    if (saldo > 0 && stats.gastos > 0 && saldo < stats.gastos * 0.5) {
      recs.push({
        id: 'reserve',
        type: 'reserve',
        title: 'Reserva de emergência baixa',
        description: `Seu saldo (${formatCurrency(saldo)}) cobre menos de meio mês de gastos (${formatCurrency(stats.gastos)}). O ideal é 3 a 6 meses.`,
        primary: 'Criar meta',
        to: '/app/metas',
        urgency: 'high',
      });
    }

    // Metas em risco
    for (const g of goals.filter(g => activeProfile === 'casal' || g.owner === activeProfile)) {
      const atual = goalProgress(contributions, g.id);
      const restante = g.target - atual;
      if (restante <= 0) continue;
      const deadline = new Date(g.deadline);
      const meses = Math.max(1, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const aporteNecessario = restante / meses;
      const sobra = stats.receita - stats.gastos;
      if (aporteNecessario > sobra && sobra > 0) {
        recs.push({
          id: `goal-${g.id}`,
          type: 'goal',
          title: `Meta "${g.name}" em risco`,
          description: `Falta ${formatCurrency(restante)} em ${meses} mês(es) — precisaria poupar ${formatCurrency(aporteNecessario)}/mês, mas sua sobra é ${formatCurrency(sobra)}.`,
          primary: 'Ajustar meta',
          to: '/app/metas',
          urgency: 'medium',
        });
      }
    }

    // Compromissos do mês > sobra
    if (pendentes > 0 && stats.receita > 0 && pendentes > stats.receita - stats.gastos + saldo) {
      recs.push({
        id: 'commit',
        type: 'bill',
        title: 'Compromissos do mês acima da folga',
        description: `${formatCurrency(pendentes)} previstos a pagar ainda esse mês. Considere antecipar receitas ou rever gastos variáveis.`,
        primary: 'Ver projeção',
        to: '/app/projecao',
        urgency: 'high',
      });
    }

    return recs;
  }, [transactions, cards, accounts, goals, contributions, activeProfile]);

  const iconFor = (t: Rec['type']) => {
    switch (t) {
      case 'anomaly': return <TrendingUp className="h-5 w-5" />;
      case 'bill': return <CreditCard className="h-5 w-5" />;
      case 'sub': return <Receipt className="h-5 w-5" />;
      case 'goal': return <Target className="h-5 w-5" />;
      case 'reserve': return <ShieldCheck className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" /> Agente Autônomo
          </h1>
          <p className="text-muted-foreground">Análises geradas a partir dos seus dados em tempo real.</p>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          {recommendations.length} recomendação(ões)
        </Badge>
      </header>

      <div className="max-w-3xl mx-auto space-y-4">
        {recommendations.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-purple-400" />
              <p className="font-bold">Nada a sinalizar agora</p>
              <p className="text-sm text-muted-foreground">Seus gastos estão dentro do padrão, sem faturas críticas e metas no rumo certo.</p>
            </CardContent>
          </Card>
        )}
        {recommendations.map(rec => (
          <Card key={rec.id} className="overflow-hidden border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 h-fit">
                  {iconFor(rec.type)}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-lg">{rec.title}</h3>
                    <Badge className={cn(
                      rec.urgency === 'high' ? 'bg-rose-100 text-rose-700 hover:bg-rose-100' :
                        rec.urgency === 'medium' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                          'bg-blue-100 text-blue-700 hover:bg-blue-100')}>
                      Urgência {rec.urgency === 'high' ? 'Alta' : rec.urgency === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  <p className="text-gray-600">{rec.description}</p>
                  <Button className="bg-purple-600 hover:bg-purple-700 gap-2" onClick={() => navigate({ to: rec.to })}>
                    {rec.primary} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
