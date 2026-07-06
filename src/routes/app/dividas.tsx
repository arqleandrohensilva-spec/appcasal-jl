import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownCircle, Info, TrendingDown, Zap, CreditCard, Receipt, Plus, HandCoins, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useData } from '@/lib/store';
import { openCardBills, openInstallments } from '@/lib/insights';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/dividas')({
  component: Dividas,
});

function Dividas() {
  const [method, setMethod] = useState<'snowball' | 'avalanche'>('avalanche');
  const [isMounted, setIsMounted] = useState(false);
  const { activeProfile } = useAppContext();
  const { transactions, cards, accounts, addTransaction, removeTransaction } = useData();
  const [loanOpen, setLoanOpen] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const bills = useMemo(() => openCardBills(transactions, cards, activeProfile), [transactions, cards, activeProfile]);
  const installments = useMemo(() => openInstallments(transactions, activeProfile), [transactions, activeProfile]);

  const totalBills = bills.reduce((s, b) => s + b.total, 0);
  const totalInstallments = installments.reduce((s, i) => s + i.totalRemaining, 0);
  const totalDivida = totalBills + totalInstallments;

  // Lista única ordenada por método
  const ordered = useMemo(() => {
    const items = [
      ...bills.map(b => ({
        kind: 'bill' as const, id: `bill-${b.cardId}-${b.dueDate}`,
        nome: `Fatura ${b.cardName}`, valor: b.total,
        juros: 12, // estimativa rotativo se atrasar
        minima: b.total * 0.15, when: b.dueDate,
      })),
      ...installments.map(i => ({
        kind: 'install' as const, id: i.groupId,
        nome: i.description, valor: i.totalRemaining,
        juros: 0, minima: i.monthlyValue, when: i.nextDueDate,
      })),
    ];
    return items.sort((a, b) => method === 'snowball' ? a.valor - b.valor : b.juros - a.juros);
  }, [bills, installments, method]);

  // Projeção saldo devedor (linear pelas próximas N meses)
  const chartData = useMemo(() => {
    const months = 8;
    const decay = totalDivida / months;
    return Array.from({ length: months + 1 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      return {
        mes: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`,
        saldo: Math.max(0, totalDivida - decay * i),
      };
    });
  }, [totalDivida]);

  if (!isMounted) return null;

  const loanButton = (
    <Button onClick={() => setLoanOpen(true)} className="gap-2">
      <HandCoins className="h-4 w-4" /> Cadastrar empréstimo
    </Button>
  );

  if (totalDivida === 0) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Plano de Quitação de Dívidas</h1>
            <p className="text-muted-foreground">Estratégias inteligentes para zerar suas pendências.</p>
          </div>
          {loanButton}
        </header>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-4xl">🎉</p>
            <p className="font-bold text-emerald-900">Você não tem dívidas pendentes!</p>
            <p className="text-sm text-emerald-700">
              Nenhuma fatura em aberto nem parcelamento ativo. Cadastrou um empréstimo?
              Ele passa a impactar o saldo da conta escolhida — o valor recebido entra hoje e cada
              parcela mensal sai automaticamente na data prevista.
            </p>
          </CardContent>
        </Card>
        <LoanDialog
          open={loanOpen}
          onOpenChange={setLoanOpen}
          accounts={accounts.filter(a => activeProfile === 'casal' || a.owner === activeProfile)}
          owner={activeProfile === 'casal' ? 'jonathan' : activeProfile}
          onCreate={(payload) => {
            const { accountId, name, principal, installmentsN, monthlyValue, firstDueDate, creditNow, creditDate } = payload;
            const acc = accounts.find(a => a.id === accountId);
            if (!acc) return;
            const ownerForTx = acc.owner;
            if (creditNow) {
              addTransaction({
                description: `Empréstimo ${name} — valor recebido`,
                amount: principal,
                date: creditDate,
                category: 'Empréstimo',
                paymentMethod: acc.name,
                accountId,
                installments: 1,
                type: 'receita',
                owner: ownerForTx,
                tags: ['emprestimo', name.toLowerCase()],
              });
            }
            addTransaction({
              description: `Empréstimo ${name}`,
              amount: monthlyValue * installmentsN,
              date: firstDueDate,
              category: 'Empréstimo',
              paymentMethod: acc.name,
              accountId,
              installments: installmentsN,
              type: 'despesa',
              owner: ownerForTx,
              tags: ['emprestimo', name.toLowerCase()],
            });
            toast.success('Empréstimo cadastrado e lançado nas movimentações!');
            setLoanOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Plano de Quitação</h1>
          <p className="text-muted-foreground">Faturas em aberto + parcelamentos e empréstimos a vencer.</p>
        </div>
        <div className="flex items-center gap-2">
          {loanButton}
          <Tabs value={method} onValueChange={(v: any) => setMethod(v)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="snowball">Snowball</TabsTrigger>
              <TabsTrigger value="avalanche">Avalanche</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Total devido</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalDivida)}</p>
            <p className="text-xs text-muted-foreground mt-1">{bills.length} fatura(s) + {installments.length} parcelamento(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Faturas em aberto</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalBills)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Cartões</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Parcelamentos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalInstallments)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Receipt className="h-3 w-3" /> A vencer</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Ordem recomendada</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordered.map((d, idx) => (
                  <div key={d.id} className="flex items-center gap-4 p-4 border rounded-lg bg-white">
                    <div className="bg-emerald-100 text-emerald-700 h-8 w-8 rounded-full flex items-center justify-center font-bold">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="font-bold flex items-center gap-2">
                        {d.kind === 'bill' ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <Receipt className="h-4 w-4 text-muted-foreground" />}
                        {d.nome}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Info className="h-3 w-3" /> {d.kind === 'bill' ? `Vence ${d.when}` : `Próx. parc. ${d.when}`}</span>
                        <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Mín: {formatCurrency(d.minima)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(d.valor)}</p>
                      {idx === 0 && <Badge className="bg-emerald-500">FOCO</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Projeção de saldo devedor</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="saldo" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saldo devedor" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200 h-fit">
          <CardHeader><CardTitle className="text-blue-900 flex items-center gap-2"><Zap className="h-5 w-5" /> Método {method === 'snowball' ? 'Snowball' : 'Avalanche'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-blue-800">
              {method === 'snowball'
                ? 'Quita primeiro as dívidas menores para gerar motivação rápida.'
                : 'Quita primeiro as dívidas com maior juros, economizando dinheiro no longo prazo.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <LoanDialog
        open={loanOpen}
        onOpenChange={setLoanOpen}
        accounts={accounts.filter(a => activeProfile === 'casal' || a.owner === activeProfile)}
        owner={activeProfile === 'casal' ? 'jonathan' : activeProfile}
        onCreate={(payload) => {
          const { accountId, name, principal, installmentsN, monthlyValue, firstDueDate, creditNow, creditDate } = payload;
          const acc = accounts.find(a => a.id === accountId);
          if (!acc) return;
          const ownerForTx = acc.owner;
          if (creditNow) {
            addTransaction({
              description: `Empréstimo ${name} — valor recebido`,
              amount: principal,
              date: creditDate,
              category: 'Empréstimo',
              paymentMethod: acc.name,
              accountId,
              installments: 1,
              type: 'receita',
              owner: ownerForTx,
              tags: ['emprestimo', name.toLowerCase()],
            });
          }
          addTransaction({
            description: `Empréstimo ${name}`,
            amount: monthlyValue * installmentsN,
            date: firstDueDate,
            category: 'Empréstimo',
            paymentMethod: acc.name,
            accountId,
            installments: installmentsN,
            type: 'despesa',
            owner: ownerForTx,
            tags: ['emprestimo', name.toLowerCase()],
          });
          toast.success('Empréstimo cadastrado e lançado nas movimentações!');
          setLoanOpen(false);
        }}
      />
    </div>
  );
}

// ============================================================
// LoanDialog
// ============================================================
interface LoanPayload {
  name: string;
  accountId: string;
  principal: number;
  installmentsN: number;
  monthlyValue: number;
  firstDueDate: string;
  creditNow: boolean;
  creditDate: string;
}

function LoanDialog({
  open, onOpenChange, accounts, owner, onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: { id: string; name: string; owner: string }[];
  owner: string;
  onCreate: (p: LoanPayload) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [principal, setPrincipal] = useState('');
  const [contracted, setContracted] = useState('');
  const [installmentsN, setInstallmentsN] = useState('12');
  const [monthlyValue, setMonthlyValue] = useState('');
  const [monthlyTouched, setMonthlyTouched] = useState(false);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [creditNow, setCreditNow] = useState(true);
  const [creditDate, setCreditDate] = useState(today);

  const nParcelas = Math.max(1, Math.min(parseInt(installmentsN) || 1, 240));
  const principalNum = parseFloat(principal) || 0;
  const contractedNum = parseFloat(contracted) || 0;
  const monthlyNum = parseFloat(monthlyValue) || 0;
  const effectiveMonthly = monthlyTouched && monthlyNum > 0
    ? monthlyNum
    : (contractedNum > 0 ? contractedNum / nParcelas : 0);
  const totalPago = monthlyTouched && monthlyNum > 0 ? monthlyNum * nParcelas : contractedNum;
  const juros = totalPago - principalNum;

  // Auto-preenche parcela a partir do valor contratado (se usuário não editou manualmente)
  useEffect(() => {
    if (!monthlyTouched && contractedNum > 0 && nParcelas > 0) {
      setMonthlyValue((contractedNum / nParcelas).toFixed(2));
    }
  }, [contractedNum, nParcelas, monthlyTouched]);

  useEffect(() => {
    if (!open) {
      setName(''); setPrincipal(''); setContracted(''); setInstallmentsN('12'); setMonthlyValue('');
      setMonthlyTouched(false);
      setCreditNow(true); setCreditDate(new Date().toISOString().slice(0, 10));
      const d = new Date(); d.setMonth(d.getMonth() + 1);
      setFirstDueDate(d.toISOString().slice(0, 10));
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) { toast.error('Dê um nome ao empréstimo.'); return; }
    if (!accountId) { toast.error('Escolha uma conta.'); return; }
    if (principalNum <= 0) { toast.error('Informe o valor escolhido (recebido).'); return; }
    if (contractedNum <= 0) { toast.error('Informe o valor contratado (com juros/IOF).'); return; }
    if (effectiveMonthly <= 0) { toast.error('Informe o valor da parcela.'); return; }
    if (nParcelas < 1) { toast.error('Número de parcelas inválido.'); return; }
    onCreate({
      name: name.trim(), accountId,
      principal: principalNum,
      installmentsN: nParcelas,
      monthlyValue: effectiveMonthly,
      firstDueDate,
      creditNow,
      creditDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" /> Novo empréstimo
          </DialogTitle>
          <DialogDescription>
            Cadastre um empréstimo. O valor entra na sua conta (se marcar "creditar agora") e
            cada parcela é criada como despesa mensal na conta escolhida — igual às outras movimentações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome / instituição</Label>
            <Input placeholder="Ex.: Empréstimo Nubank" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor total contratado</Label>
              <Input type="number" step="0.01" placeholder="10000,00" value={principal} onChange={e => setPrincipal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nº de parcelas</Label>
              <Input type="number" min={1} max={240} value={installmentsN} onChange={e => setInstallmentsN(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor da parcela</Label>
              <Input type="number" step="0.01" placeholder="450,00" value={monthlyValue} onChange={e => setMonthlyValue(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Data da 1ª parcela</Label>
            <Input type="date" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
          </div>

          <div className="rounded-lg border bg-muted/40 px-3 py-2 space-y-1 text-xs">
            <div className="flex justify-between"><span>Total pago ({nParcelas}x)</span><strong className="tabular-nums">{formatCurrency(totalPago)}</strong></div>
            <div className="flex justify-between"><span>Juros/CET estimado</span><strong className={juros > 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(juros)}</strong></div>
          </div>

          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={creditNow} onChange={e => setCreditNow(e.target.checked)} className="h-4 w-4" />
              <span className="font-medium">Creditar valor recebido na conta</span>
            </label>
            {creditNow && (
              <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 pl-6">
                <span>Data do crédito:</span>
                <Input type="date" value={creditDate} onChange={e => setCreditDate(e.target.value)} className="h-7 w-[150px]" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="gap-2">
            <Plus className="h-4 w-4" /> Lançar empréstimo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
