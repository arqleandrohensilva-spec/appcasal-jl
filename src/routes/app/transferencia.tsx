import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftRight, ArrowRight, Wallet, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { useData } from '@/lib/store';
import { formatCurrency } from '@/lib/mockData';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/transferencia')({
  component: Transferencia,
});

function Transferencia() {
  const { activeProfile } = useAppContext();
  const { accounts, addTransaction, updateAccount } = useData();
  const navigate = useNavigate();

  const visibleAccounts = accounts.filter(a => activeProfile === 'casal' || a.owner === activeProfile);

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fromAccount = accounts.find(a => a.id === fromId);
  const toAccount = accounts.find(a => a.id === toId);
  const amountNum = parseFloat(amount.replace(',', '.')) || 0;

  const insufficientFunds = fromAccount ? fromAccount.balance < amountNum : false;
  const sameAccount = fromId && toId && fromId === toId;
  const canSubmit = fromId && toId && !sameAccount && amountNum > 0;

  const projectedFromBalance = useMemo(
    () => (fromAccount ? fromAccount.balance - amountNum : 0),
    [fromAccount, amountNum]
  );
  const projectedToBalance = useMemo(
    () => (toAccount ? toAccount.balance + amountNum : 0),
    [toAccount, amountNum]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !fromAccount || !toAccount) return;

    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    const desc = note.trim()
      ? `Transferência: ${note.trim()}`
      : `Transferência ${fromAccount.name} → ${toAccount.name}`;

    addTransaction({
      description: desc,
      amount: amountNum,
      date: today,
      category: 'Transferência',
      paymentMethod: 'Transferência',
      accountId: fromAccount.id,
      type: 'despesa',
      owner: fromAccount.owner,
    });
    addTransaction({
      description: desc,
      amount: amountNum,
      date: today,
      category: 'Transferência',
      paymentMethod: 'Transferência',
      accountId: toAccount.id,
      type: 'receita',
      owner: toAccount.owner,
    });




    toast.success(`${formatCurrency(amountNum)} transferido com sucesso!`);
    setSubmitting(false);
    navigate({ to: '/app/contas' });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <div className="flex items-center gap-2 text-orange-500 mb-1">
          <ArrowLeftRight className="h-5 w-5" />
          <span className="text-sm font-medium">Movimentação</span>
        </div>
        <h1 className="text-2xl font-bold">Transferir entre contas</h1>
        <p className="text-muted-foreground">Move dinheiro entre suas contas, registrando o histórico nas duas.</p>
      </header>

      {visibleAccounts.length < 2 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Você precisa de pelo menos 2 contas cadastradas para transferir.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da transferência</CardTitle>
            <CardDescription>Escolha a origem, o destino e o valor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                <div className="space-y-2">
                  <Label>De</Label>
                  <Select value={fromId} onValueChange={setFromId}>
                    <SelectTrigger><SelectValue placeholder="Conta de origem" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} · {formatCurrency(a.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ArrowRight className="hidden sm:block h-5 w-5 text-muted-foreground mb-2.5 mx-auto" />

                <div className="space-y-2">
                  <Label>Para</Label>
                  <Select value={toId} onValueChange={setToId}>
                    <SelectTrigger><SelectValue placeholder="Conta de destino" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id} disabled={a.id === fromId}>
                          {a.name} · {formatCurrency(a.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {sameAccount && (
                <p className="text-sm text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Escolha contas diferentes para origem e destino.
                </p>
              )}

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {insufficientFunds && (
                  <p className="text-sm text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Saldo insuficiente em {fromAccount?.name} — fica negativo em {formatCurrency(projectedFromBalance)}.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nota (opcional)</Label>
                <Textarea
                  placeholder="Ex: minha parte do aluguel, reembolso da viagem..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </div>

              {fromAccount && toAccount && amountNum > 0 && !sameAccount && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{fromAccount.name} ficará com</span>
                    <span className={projectedFromBalance < 0 ? 'text-rose-600 font-semibold' : 'font-semibold'}>
                      {formatCurrency(projectedFromBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{toAccount.name} ficará com</span>
                    <span className="text-emerald-600 font-semibold">{formatCurrency(projectedToBalance)}</span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={!canSubmit || submitting}>
                <ArrowLeftRight className="h-4 w-4" />
                {submitting ? 'Transferindo...' : 'Confirmar transferência'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
