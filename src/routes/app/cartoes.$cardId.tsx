import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { useData } from '@/lib/store';
import { CardInvoiceView } from '@/routes/app/transacoes';
import { ArrowLeft, Plus, CreditCard } from 'lucide-react';


export const Route = createFileRoute('/app/cartoes/$cardId')({
  component: CardDetail,
});

function CardDetail() {
  const { cardId } = Route.useParams();
  const router = useRouter();
  const { activeProfile } = useAppContext();
  const { cards, updateTransaction, removeTransaction } = useData();

  const card = cards.find(c => c.id === cardId);
  const cardOwner = card?.owner === 'jonathan' ? 'jonathan' : card?.owner === 'leandro' ? 'leandro' : undefined;
  const owner: 'leandro' | 'jonathan' = cardOwner
    ?? (activeProfile === 'jonathan' ? 'jonathan' : 'leandro');



  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2"
          onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: '/app/cartoes' }))}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Link to="/app/cartoes" className="text-xs text-muted-foreground hover:underline ml-auto">
          Todos os cartões
        </Link>
      </div>

      {!card ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Cartão não encontrado.</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/app/cartoes">Ver meus cartões</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full bg-${card.color}-500`} />

                {card.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                Fecha dia {card.closingDay} · Vence dia {card.dueDay} · Limite R$ {card.limit.toLocaleString('pt-BR')}
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/transacoes">
                <Plus className="h-4 w-4" /> Nova despesa
              </Link>
            </Button>
          </header>

          <CardInvoiceView
            owner={owner}
            cardId={card.id}
            hideCardChips
            onUpdate={updateTransaction}
            onRemove={removeTransaction}
          />
        </>
      )}
    </div>
  );
}
