import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, formatCurrency, formatDate } from '@/lib/mockData';
import { useData } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { toast } from 'sonner';
import { AlertCircle, Trash2, Receipt, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/app/transacoes')({
  component: Transacoes,
});

function Transacoes() {
  const { activeProfile } = useAppContext();
  const { cards, accounts, transactions, addTransaction, removeTransaction } = useData();

  const owner = activeProfile === 'casal' ? 'leandro' : activeProfile;
  const myCards = cards.filter(c => c.owner === owner);
  const myAccounts = accounts.filter(a => a.owner === owner);
  const myTx = transactions.filter(t => activeProfile === 'casal' || t.owner === activeProfile);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [paymentId, setPaymentId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly'>('none');

  const valorNum = parseFloat(amount) || 0;
  const parcelasNum = isInstallment ? Math.max(2, Math.min(parseInt(installments) || 2, 60)) : 1;
  const valorParcela = valorNum / parcelasNum;

  const isCardSelected = paymentId.startsWith('card:');
  const canRecur = !isInstallment;

  const reset = () => {
    setDescription(''); setAmount(''); setCategory('');
    setPaymentId(''); setIsInstallment(false); setInstallments('2');
    setRecurrence('none');
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category || !paymentId) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    const [kind, id] = paymentId.split(':');
    const method = kind === 'card'
      ? cards.find(c => c.id === id)?.name || 'Cartão'
      : accounts.find(a => a.id === id)?.name || 'Conta';

    const count = addTransaction({
      description,
      amount: valorNum,
      date,
      category,
      paymentMethod: method,
      cardId: kind === 'card' ? id : undefined,
      accountId: kind === 'account' ? id : undefined,
      installments: parcelasNum,
      type,
      owner,
      recurrence: canRecur ? recurrence : 'none',
    });

    if (count > 1) {
      toast.success(`${count} parcelas lançadas no calendário!`);
    } else {
      toast.success('Transação salva!');
    }
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Transações</h1>
        <p className="text-muted-foreground">Lance receitas e despesas — parcele em até 60x se for no cartão</p>
      </header>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Nova transação</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant={type === 'despesa' ? 'default' : 'outline'}
                  className={type === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : ''}
                  onClick={() => setType('despesa')}>Despesa</Button>
                <Button type="button" variant={type === 'receita' ? 'default' : 'outline'}
                  className={type === 'receita' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  onClick={() => setType('receita')}>Receita</Button>
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Supermercado, Salário" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor total (R$) *</Label>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pago com *</Label>
                  <Select value={paymentId} onValueChange={setPaymentId}>
                    <SelectTrigger><SelectValue placeholder="Cartão ou conta" /></SelectTrigger>
                    <SelectContent>
                      {myCards.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Cartões</div>
                          {myCards.map(c => <SelectItem key={c.id} value={`card:${c.id}`}>💳 {c.name}</SelectItem>)}
                        </>
                      )}
                      {myAccounts.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Contas</div>
                          {myAccounts.map(a => <SelectItem key={a.id} value={`account:${a.id}`}>🏦 {a.name}</SelectItem>)}
                        </>
                      )}
                      {myCards.length === 0 && myAccounts.length === 0 && (
                        <div className="px-2 py-2 text-xs text-muted-foreground">Cadastre um cartão ou conta primeiro.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isCardSelected && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Compra parcelada?</Label>
                    <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
                  </div>

                  {isInstallment && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Número de parcelas</Label>
                        <Select value={installments} onValueChange={setInstallments}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {Array.from({ length: 59 }, (_, i) => i + 2).map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {valorNum > 0 && (
                        <div className="flex gap-2 items-start text-xs text-orange-800">
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold">{parcelasNum}x de {formatCurrency(valorParcela)}</p>
                            <p>As {parcelasNum} parcelas serão criadas automaticamente nos próximos meses.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full">
                {isInstallment && parcelasNum > 1
                  ? `Lançar ${parcelasNum} parcelas`
                  : 'Salvar transação'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Últimas transações ({myTx.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {myTx.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma transação ainda.
              </div>
            )}
            {myTx.slice(0, 30).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{t.description}</p>
                    {t.installmentInfo && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {t.installmentInfo.current}/{t.installmentInfo.total}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatDate(t.date)} · {t.category} · {t.paymentMethod}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`font-bold text-sm ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'receita' ? '+' : ''}{formatCurrency(t.amount)}
                  </span>
                  <Button
                    size="icon" variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-7 w-7"
                    onClick={() => {
                      removeTransaction(t.id, !!t.groupId);
                      toast.success(t.groupId ? 'Parcelamento removido' : 'Transação removida');
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-rose-500" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
