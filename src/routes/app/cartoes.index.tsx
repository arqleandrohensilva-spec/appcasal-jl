import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAppContext } from '@/lib/context';
import { useData, type UserCard } from '@/lib/store';
import { formatCurrency } from '@/lib/mockData';
import { invoiceMonthOf } from '@/lib/finance';
import { CreditCard, Plus, Trash2, Pencil, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/cartoes/')({
  component: Cartoes,
});

const COLORS = ['purple', 'emerald', 'blue', 'orange', 'rose', 'amber', 'cyan', 'slate'];

function Cartoes() {
  const { activeProfile } = useAppContext();
  const { cards, transactions, addCard, updateCard, removeCard } = useData();
  const [open, setOpen] = useState(false);

  const myCards = cards.filter(c => activeProfile === 'casal' || c.owner === activeProfile);
  const todayISO = new Date().toISOString().slice(0, 10);

  const cardUsage = useMemo(() => {
    const totals = new Map<string, { current: number; committed: number; currentCount: number }>();
    for (const card of myCards) {
      const currentKey = invoiceMonthOf(todayISO, card.closingDay);
      const cardTx = transactions.filter(t => t.cardId === card.id && t.type === 'despesa');
      let current = 0;
      let committed = 0;
      let currentCount = 0;

      for (const tx of cardTx) {
        const value = Math.abs(tx.amount);
        const txInvoiceKey = invoiceMonthOf(tx.date, card.closingDay);
        committed += value;
        if (txInvoiceKey === currentKey) {
          current += value;
          currentCount += 1;
        }
      }

      totals.set(card.id, { current, committed, currentCount });
    }
    return totals;
  }, [myCards, todayISO, transactions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Cadastre seus cartões e acompanhe a fatura</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo cartão</Button>
          </DialogTrigger>
          <CardDialog onSave={(c) => { addCard({ ...c, owner: activeProfile === 'casal' ? 'leandro' : activeProfile }); toast.success('Cartão cadastrado!'); setOpen(false); }} />
        </Dialog>
      </header>

      {myCards.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum cartão cadastrado. Clique em &quot;Novo cartão&quot; pra começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCards.map(card => {
            const usage = cardUsage.get(card.id) ?? { current: 0, committed: 0, currentCount: 0 };
            const pct = card.limit > 0 ? Math.min(100, (usage.committed / card.limit) * 100) : 0;
            const available = Math.max(0, card.limit - usage.committed);

            return (
              <Card key={card.id} className="group hover:border-primary/50 hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-start justify-between">
                  <Link
                    to="/app/cartoes/$cardId"
                    params={{ cardId: card.id }}
                    className="min-w-0 flex-1 space-y-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Abrir fatura detalhada do cartão ${card.name}`}
                  >
                    <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                      <span className={`w-3 h-3 rounded-full bg-${card.color}-500`} />
                      <span className="truncate">{card.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                    </p>
                  </Link>
                  <div className="flex gap-1">
                    <EditCardButton card={card} onSave={(patch) => { updateCard(card.id, patch); toast.success('Cartão atualizado'); }} />
                    <Button size="icon" variant="ghost" onClick={() => { removeCard(card.id); toast.success('Cartão removido'); }} aria-label={`Remover cartão ${card.name}`}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    to="/app/cartoes/$cardId"
                    params={{ cardId: card.id }}
                    className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Ver detalhes da fatura do cartão ${card.name}`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Fatura atual</span>
                        <span className="font-bold">{formatCurrency(usage.current)}</span>
                      </div>
                      <Progress value={pct} />
                      <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                        <div>
                          <div className="text-muted-foreground">Limite atual</div>
                          <div className="font-medium tabular-nums">{formatCurrency(card.limit)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Em uso</div>
                          <div className="font-medium tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(usage.committed)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Disponível</div>
                          <div className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(available)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border flex items-center justify-between mt-3">
                      <span>{usage.currentCount} lançamento{usage.currentCount !== 1 ? 's' : ''} na fatura</span>
                      <span className="text-primary font-medium">Ver detalhes →</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditCardButton({ card, onSave }: { card: UserCard; onSave: (p: Partial<Omit<UserCard, 'id'>>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={`Editar cartão ${card.name}`}><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <CardDialog initial={card} onSave={(c) => { onSave(c); setOpen(false); }} editing />
    </Dialog>
  );
}

function CardDialog({
  initial,
  onSave,
  editing,
}: {
  initial?: Partial<UserCard>;
  onSave: (c: { name: string; limit: number; closingDay: number; dueDay: number; color: string }) => void;
  editing?: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [limit, setLimit] = useState(initial ? String(initial.limit ?? '5000') : '5000');
  const [closingDay, setClosingDay] = useState(initial ? String(initial.closingDay ?? '3') : '3');
  const [dueDay, setDueDay] = useState(initial ? String(initial.dueDay ?? '10') : '10');
  const [color, setColor] = useState(initial?.color || 'purple');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({
      name,
      limit: parseFloat(limit) || 0,
      closingDay: parseInt(closingDay) || 1,
      dueDay: parseInt(dueDay) || 1,
      color,
    });
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? 'Editar cartão' : 'Novo cartão de crédito'}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do cartão</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank, Itaú Visa" required />
        </div>
        <div className="space-y-2">
          <Label>Limite total (R$)</Label>
          <Input type="number" step="0.01" value={limit} onChange={e => setLimit(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Dia de fechamento</Label>
            <Input type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Dia de vencimento</Label>
            <Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cor</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLORS.map(c => (
                <SelectItem key={c} value={c}>
                  <span className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full bg-${c}-500`} /> {c}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit">{editing ? 'Salvar alterações' : 'Salvar cartão'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}