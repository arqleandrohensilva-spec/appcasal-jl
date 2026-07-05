import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
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


export const Route = createFileRoute('/app/cartoes')({
  component: Cartoes,
});

const COLORS = ['purple', 'emerald', 'blue', 'orange', 'rose', 'amber', 'cyan', 'slate'];

function Cartoes() {
  const { activeProfile } = useAppContext();
  const { cards, transactions, addCard, updateCard, removeCard } = useData();
  const [open, setOpen] = useState(false);

  const myCards = cards.filter(c => activeProfile === 'casal' || c.owner === activeProfile);


  const todayISO = new Date().toISOString().slice(0, 10);

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
            <p>Nenhum cartão cadastrado. Clique em "Novo cartão" pra começar.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myCards.map(card => {
              const cardTx = transactions.filter(t => t.cardId === card.id && t.type === 'despesa');
              // Usa o ciclo de fatura (mesmo cálculo da visão detalhada) para bater o total.
              const currentKey = invoiceMonthOf(todayISO, card.closingDay);
              const monthBills = cardTx.filter(t => invoiceMonthOf(t.date, card.closingDay) === currentKey);
              const billTotal = monthBills.reduce((s, t) => s + Math.abs(t.amount), 0);
              const pct = Math.min(100, (billTotal / card.limit) * 100);

              return (
                <Card key={card.id}>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full bg-${card.color}-500`} />
                        {card.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <EditCardButton card={card} onSave={(patch) => { updateCard(card.id, patch); toast.success('Cartão atualizado'); }} />
                      <Button size="icon" variant="ghost" onClick={() => { removeCard(card.id); toast.success('Cartão removido'); }}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Fatura atual</span>
                        <span className="font-bold">{formatCurrency(billTotal)}</span>
                      </div>
                      <Progress value={pct} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Limite</span>
                        <span>{formatCurrency(card.limit)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                      {monthBills.length} lançamento{monthBills.length !== 1 ? 's' : ''} na fatura
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Fatura detalhada com navegação mês a mês (movida da aba Transações) */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Fatura detalhada</h2>
            <CardInvoiceView owner={owner} onUpdate={updateTransaction} onRemove={removeTransaction} />
          </div>
        </>
      )}
    </div>
  );
}

function EditCardButton({ card, onSave }: { card: UserCard; onSave: (p: Partial<Omit<UserCard, 'id'>>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
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
