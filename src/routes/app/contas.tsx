import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useAppContext } from '@/lib/context';
import { useData, type UserAccount } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/mockData';
import { Plus, Trash2, Wallet, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AccountLedgerView } from '@/routes/app/transacoes';

export const Route = createFileRoute('/app/contas')({
  component: Contas,
});

const TYPES: { value: 'corrente' | 'poupanca' | 'dinheiro' | 'investimento'; label: string }[] = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'dinheiro', label: 'Dinheiro / Espécie' },
  { value: 'investimento', label: 'Investimento' },
];

function Contas() {
  const { activeProfile } = useAppContext();
  const { accounts, addAccount, updateAccount, removeAccount, transactions } = useData();
  const [open, setOpen] = useState(false);

  const myAccounts = accounts.filter(a => activeProfile === 'casal' || a.owner === activeProfile);
  const myTx = transactions.filter(t => activeProfile === 'casal' || t.owner === activeProfile);

  const today = new Date();
  const monthTx = myTx.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const aPagar = monthTx.filter(t => t.type === 'despesa').reduce((s, t) => s + Math.abs(t.amount), 0);
  const aReceber = monthTx.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
  const saldoTotal = myAccounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas</h1>
          <p className="text-muted-foreground">Suas contas bancárias e saldos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova conta</Button>
          </DialogTrigger>
          <AccountDialog onSave={(a) => {
            addAccount({ ...a, owner: activeProfile === 'casal' ? 'leandro' : activeProfile });
            toast.success('Conta criada!');
            setOpen(false);
          }} />
        </Dialog>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(saldoTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">A receber (mês)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{formatCurrency(aReceber)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">A pagar (mês)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-rose-600">{formatCurrency(aPagar)}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Minhas contas</TabsTrigger>
          <TabsTrigger value="extrato">Extrato do mês</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          {myAccounts.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma conta cadastrada. Crie uma para começar.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myAccounts.map(a => (
                <Card key={a.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{TYPES.find(t => t.value === a.type)?.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${a.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(a.balance)}
                      </span>
                      <EditAccountButton account={a} onSave={(p) => { updateAccount(a.id, p); toast.success('Conta atualizada'); }} />
                      <Button size="icon" variant="ghost" onClick={() => { removeAccount(a.id); toast.success('Conta removida'); }}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="extrato" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-2">
              {monthTx.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Sem movimentações neste mês.</p>
              )}
              {monthTx.slice(0, 20).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.date)} · {t.category} · {t.paymentMethod}
                    </p>
                  </div>
                  <span className={`font-bold ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'receita' ? '+' : ''}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditAccountButton({ account, onSave }: { account: UserAccount; onSave: (p: Partial<Omit<UserAccount, 'id'>>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <AccountDialog initial={account} editing onSave={(a) => { onSave(a); setOpen(false); }} />
    </Dialog>
  );
}

function AccountDialog({
  initial,
  editing,
  onSave,
}: {
  initial?: Partial<UserAccount>;
  editing?: boolean;
  onSave: (a: { name: string; type: 'corrente' | 'poupanca' | 'dinheiro' | 'investimento'; balance: number }) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<'corrente' | 'poupanca' | 'dinheiro' | 'investimento'>(initial?.type || 'corrente');
  const [balance, setBalance] = useState(initial ? String(initial.balance ?? '0') : '0');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({ name, type, balance: parseFloat(balance) || 0 });
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? 'Editar conta' : 'Nova conta'}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank, Inter, Carteira" required />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{editing ? 'Saldo atual (R$)' : 'Saldo inicial (R$)'}</Label>
          <Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} />
          {editing && (
            <p className="text-[10px] text-muted-foreground">
              Cuidado: alterar o saldo manualmente não cria transação histórica.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="submit">{editing ? 'Salvar' : 'Criar conta'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
