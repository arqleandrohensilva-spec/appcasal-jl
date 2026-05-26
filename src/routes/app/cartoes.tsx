import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CREDIT_CARDS, formatCurrency } from '@/lib/mockData';
import { useAppContext } from '@/lib/context';
import { Progress } from '@/components/ui/progress';

export const Route = createFileRoute('/app/cartoes')({
  component: Cartoes,
});

function Cartoes() {
  const { activeProfile } = useAppContext();
  const myCards = CREDIT_CARDS.filter(c => c.owner === activeProfile);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myCards.map(card => (
          <Card key={card.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{card.name}</CardTitle>
              <div className={`w-3 h-3 rounded-full bg-${card.color}-500`} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Fatura Atual</span>
                  <span className="font-bold">R$ 2.340,00</span>
                </div>
                <Progress value={60} />
              </div>
              <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                <p>Fecha em 8 dias</p>
                <p>Vence em 15 dias</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}