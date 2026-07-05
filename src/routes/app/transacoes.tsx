import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CATEGORIES, formatCurrency, formatDate } from '@/lib/mockData';
import { useData, type UserTransaction } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { toast } from 'sonner';
import { AlertCircle, Trash2, Receipt, Pencil, Search, Download, Upload, X, FileText, Loader2, Sparkles, CheckCircle2, CreditCard as CardIcon, Landmark } from 'lucide-react';
import { downloadCSV, transactionsToCSV, parseCSV, dedupeAgainstExisting, type ParsedRow } from '@/lib/csv';
import { nextPayday, toISODate } from '@/lib/payday';
import { useServerFn } from '@tanstack/react-start';
import { parseBankStatement, type StatementEntry, type ParsedStatement } from '@/lib/pdf-import.functions';

import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/transacoes')({
  component: Transacoes,
});

function Transacoes() {
  const { activeProfile } = useAppContext();
  const { cards, accounts, transactions, addTransaction, updateTransaction, removeTransaction } = useData();

  const owner = activeProfile === 'casal' ? 'leandro' : activeProfile;
  const myCards = cards.filter(c => c.owner === owner);
  const myAccounts = accounts.filter(a => a.owner === owner);
  const myTx = useMemo(
    () => transactions.filter(t => activeProfile === 'casal' || t.owner === activeProfile),
    [transactions, activeProfile],
  );

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [paymentId, setPaymentId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly'>('none');

  // Modo salário (2x no mês: dia fixo + toda quinta útil)
  const [salaryMode, setSalaryMode] = useState(false);
  const [salaryFixedDay, setSalaryFixedDay] = useState('5');
  const [salaryFixedAmount, setSalaryFixedAmount] = useState('');
  const [salaryThursdayDate, setSalaryThursdayDate] = useState(() => {
    const d = new Date();
    const diff = (4 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  });
  const [salaryThursdayAmount, setSalaryThursdayAmount] = useState('');

  // Filtros
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all'); // 'all' | 'YYYY-MM'

  const valorNum = parseFloat(amount) || 0;
  const parcelasNum = isInstallment ? Math.max(2, Math.min(parseInt(installments) || 2, 60)) : 1;
  const valorParcela = valorNum / parcelasNum;

  const isCardSelected = paymentId.startsWith('card:');
  const canRecur = !isInstallment;
  const isSalary = type === 'receita' && salaryMode;

  const reset = () => {
    setDescription(''); setAmount(''); setCategory('');
    setPaymentId(''); setIsInstallment(false); setInstallments('2');
    setRecurrence('none');
    setDate(new Date().toISOString().slice(0, 10));
    setSalaryMode(false); setSalaryFixedAmount(''); setSalaryThursdayAmount('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !category || !paymentId) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    const [kind, id] = paymentId.split(':');
    const method = kind === 'card'
      ? cards.find(c => c.id === id)?.name || 'Cartão'
      : accounts.find(a => a.id === id)?.name || 'Conta';

    if (isSalary) {
      const v1 = parseFloat(salaryFixedAmount) || 0;
      const v2 = parseFloat(salaryThursdayAmount) || 0;
      if (v1 <= 0 || v2 <= 0) {
        toast.error('Informe os dois valores do salário.');
        return;
      }
      const diaRaw = parseInt(salaryFixedDay) || 1;
      if (diaRaw < 1 || diaRaw > 31) {
        toast.error('Dia do mês deve estar entre 1 e 31.');
        return;
      }
      const dia = Math.max(1, Math.min(diaRaw, 31));
      const payDate = nextPayday(dia, new Date());
      const fixedISO = toISODate(payDate);

      addTransaction({
        description: `${description} (dia ${dia})`,
        amount: v1, date: fixedISO, category, paymentMethod: method,
        cardId: kind === 'card' ? id : undefined,
        accountId: kind === 'account' ? id : undefined,
        installments: 1, type: 'receita', owner,
        recurrence: 'monthly',
      });
      addTransaction({
        description: `${description} (quinta)`,
        amount: v2, date: salaryThursdayDate, category, paymentMethod: method,
        cardId: kind === 'card' ? id : undefined,
        accountId: kind === 'account' ? id : undefined,
        installments: 1, type: 'receita', owner,
        recurrence: 'weekly',
      });
      toast.success('Salário cadastrado: dia fixo + toda quinta-feira!');
      reset();
      return;
    }

    if (!amount) {
      toast.error('Informe o valor.');
      return;
    }
    const count = addTransaction({
      description, amount: valorNum, date, category, paymentMethod: method,
      cardId: kind === 'card' ? id : undefined,
      accountId: kind === 'account' ? id : undefined,
      installments: parcelasNum, type, owner,
      recurrence: canRecur ? recurrence : 'none',
    });
    if (count > 1) toast.success(`${count} parcelas lançadas no calendário!`);
    else toast.success('Transação salva!');
    reset();
  };

  // Meses disponíveis para o filtro
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const t of myTx) set.add(t.date.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [myTx]);

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myTx.filter(t => {
      if (q && !t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterMonth !== 'all' && !t.date.startsWith(filterMonth)) return false;
      return true;
    });
  }, [myTx, search, filterCategory, filterType, filterMonth]);

  const handleExport = () => {
    if (filteredTx.length === 0) { toast.error('Nada para exportar'); return; }
    downloadCSV(`transacoes-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCSV(filteredTx));
    toast.success(`${filteredTx.length} transações exportadas`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="text-muted-foreground">Lance receitas e despesas — parcele em até 60x se for no cartão</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PdfImportButton owner={owner} />
          <ImportButton owner={owner} />
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
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

              {type === 'receita' && (
                <div className="flex items-center justify-between p-3 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                  <div>
                    <Label className="text-sm">É salário (2x no mês)</Label>
                    <p className="text-[11px] text-muted-foreground">Dia fixo do mês + toda quinta-feira</p>
                  </div>
                  <Switch checked={salaryMode} onCheckedChange={setSalaryMode} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={isSalary ? 'Ex: Salário Empresa X' : 'Ex: Supermercado, Salário'} required />
              </div>

              {!isSalary && (
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
              )}

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
                  <Label>{isSalary ? 'Conta de recebimento *' : 'Pago com *'}</Label>
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

              {isSalary && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg space-y-4 animate-in slide-in-from-top-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mb-2">1) Pagamento fixo do mês</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Dia do mês (1-31)</Label>
                        <Input type="number" min={1} max={31} value={salaryFixedDay} onChange={e => setSalaryFixedDay(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input type="number" step="0.01" value={salaryFixedAmount} onChange={e => setSalaryFixedAmount(e.target.value)} />
                      </div>
                    </div>
                    {(() => {
                      const d = parseInt(salaryFixedDay) || 0;
                      if (d < 1 || d > 31) return null;
                      const ajustada = nextPayday(d, new Date());
                      const original = new Date(ajustada.getFullYear(), ajustada.getMonth(), Math.min(d, new Date(ajustada.getFullYear(), ajustada.getMonth() + 1, 0).getDate()));
                      const foiAntecipada = ajustada.getDate() !== original.getDate() || ajustada.getMonth() !== original.getMonth();
                      const lastDay = new Date(ajustada.getFullYear(), ajustada.getMonth() + 1, 0).getDate();
                      const clamped = d > lastDay;
                      return (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                          Próximo pagamento: <strong>{ajustada.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                          {clamped && ' (mês não tem dia ' + d + ' → usa o último)'}
                          {!clamped && foiAntecipada && ' (antecipado: caía em fim de semana/feriado)'}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mb-2">2) Toda quinta-feira</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Próxima quinta</Label>
                        <Input type="date" value={salaryThursdayDate} onChange={e => setSalaryThursdayDate(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input type="number" step="0.01" value={salaryThursdayAmount} onChange={e => setSalaryThursdayAmount(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    ✓ Serão criadas 2 receitas recorrentes: uma mensal no dia escolhido e outra semanal toda quinta-feira.
                  </p>
                </div>
              )}

              {!isSalary && isCardSelected && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg space-y-3 animate-in slide-in-from-top-2">
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
                        <div className="flex gap-2 items-start text-xs text-orange-800 dark:text-orange-200">
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
              {!isSalary && canRecur && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg space-y-2">
                  <Label className="text-sm">Repete automaticamente?</Label>
                  <Select value={recurrence} onValueChange={(v) => setRecurrence(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não repete (lançamento único)</SelectItem>
                      <SelectItem value="weekly">Toda semana</SelectItem>
                      <SelectItem value="monthly">Todo mês</SelectItem>
                    </SelectContent>
                  </Select>
                  {recurrence !== 'none' && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      ✓ Vai aparecer automaticamente {recurrence === 'weekly' ? 'toda semana' : 'todo mês'} na projeção e nos relatórios.
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full">
                {isSalary ? 'Cadastrar salário (2 recorrências)' : (isInstallment && parcelasNum > 1 ? `Lançar ${parcelasNum} parcelas` : 'Salvar transação')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Histórico ({filteredTx.length})
            </CardTitle>
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Buscar descrição ou categoria"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Categorias</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mês</SelectItem>
                    {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(search || filterCategory !== 'all' || filterType !== 'all' || filterMonth !== 'all') && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => {
                  setSearch(''); setFilterCategory('all'); setFilterType('all'); setFilterMonth('all');
                }}>
                  <X className="h-3 w-3" /> Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredTx.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {myTx.length === 0 ? 'Nenhuma transação ainda.' : 'Nada encontrado com esses filtros.'}
              </div>
            )}
            {filteredTx.slice(0, 100).map(t => (
              <TxRow key={t.id} tx={t} onUpdate={updateTransaction} onRemove={removeTransaction} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TxRow({
  tx, onUpdate, onRemove,
}: {
  tx: UserTransaction;
  onUpdate: ReturnType<typeof useData>['updateTransaction'];
  onRemove: ReturnType<typeof useData>['removeTransaction'];
}) {
  return (
    <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/40 group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{tx.description}</p>
          {tx.installmentInfo && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {tx.installmentInfo.current}/{tx.installmentInfo.total}
            </Badge>
          )}
          {tx.recurrence && tx.recurrence !== 'none' && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">🔁</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {formatDate(tx.date)} · {tx.category} · {tx.paymentMethod}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`font-bold text-sm ${tx.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {tx.type === 'receita' ? '+' : ''}{formatCurrency(tx.amount)}
        </span>
        <EditTxDialog tx={tx} onUpdate={onUpdate} />
        <Button
          size="icon" variant="ghost"
          className="opacity-0 group-hover:opacity-100 h-7 w-7"
          onClick={() => {
            onRemove(tx.id, !!tx.groupId);
            toast.success(tx.groupId ? 'Parcelamento removido' : 'Transação removida');
          }}
        >
          <Trash2 className="h-3 w-3 text-rose-500" />
        </Button>
      </div>
    </div>
  );
}

function EditTxDialog({ tx, onUpdate }: { tx: UserTransaction; onUpdate: ReturnType<typeof useData>['updateTransaction'] }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(String(Math.abs(tx.amount)));
  const [date, setDate] = useState(tx.date);
  const [category, setCategory] = useState(tx.category);
  const [type, setType] = useState<'receita' | 'despesa'>(tx.type);
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly'>(tx.recurrence || 'none');

  const reopen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setDescription(tx.description);
      setAmount(String(Math.abs(tx.amount)));
      setDate(tx.date);
      setCategory(tx.category);
      setType(tx.type);
      setRecurrence(tx.recurrence || 'none');
    }
  };

  return (
    <Dialog open={open} onOpenChange={reopen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
          {tx.groupId && (
            <DialogDescription>
              Esta é uma parcela ({tx.installmentInfo?.current}/{tx.installmentInfo?.total}). As alterações afetam apenas esta parcela.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={type === 'despesa' ? 'default' : 'outline'}
              className={type === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : ''}
              onClick={() => setType('despesa')}>Despesa</Button>
            <Button type="button" variant={type === 'receita' ? 'default' : 'outline'}
              className={type === 'receita' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setType('receita')}>Receita</Button>
          </div>
          <div className="space-y-2"><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!tx.groupId && (
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não repete</SelectItem>
                  <SelectItem value="weekly">Toda semana</SelectItem>
                  <SelectItem value="monthly">Todo mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => {
            const v = parseFloat(amount);
            if (!description || !v || v <= 0) { toast.error('Valor/descrição inválidos'); return; }
            onUpdate(tx.id, {
              description, amount: v, date, category, type,
              recurrence: tx.groupId ? undefined : recurrence,
            });
            toast.success('Transação atualizada');
            setOpen(false);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportButton({ owner }: { owner: 'leandro' | 'jonathan' }) {
  const { transactions, addTransaction, cards, accounts } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [duplicates, setDuplicates] = useState<ParsedRow[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');
  const [defaultCategory, setDefaultCategory] = useState<string>('Outros');

  const myAccounts = accounts.filter(a => a.owner === owner);

  const onFile = async (file: File) => {
    const text = await file.text();
    const { rows: parsed, errors } = parseCSV(text);
    if (errors.length) { toast.error(errors[0]); return; }
    if (parsed.length === 0) { toast.error('Nenhuma linha válida no arquivo'); return; }
    const { toImport, duplicates: dups } = dedupeAgainstExisting(parsed, transactions, owner);
    setRows(toImport);
    setDuplicates(dups);
    setDefaultAccountId(myAccounts[0]?.id || '');
    setOpen(true);
  };

  const confirm = () => {
    if (!defaultAccountId) { toast.error('Escolha uma conta'); return; }
    const account = accounts.find(a => a.id === defaultAccountId)!;
    let n = 0;
    for (const r of rows) {
      addTransaction({
        description: r.description,
        amount: r.amount,
        date: r.date,
        category: r.category || defaultCategory,
        paymentMethod: account.name,
        accountId: account.id,
        type: r.type,
        owner,
      });
      n++;
    }
    toast.success(`${n} transações importadas`);
    setOpen(false);
    setRows([]); setDuplicates([]);
  };

  return (
    <>
      <input
        ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }}
      />
      <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" /> Importar CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {rows.length} novas transações detectadas
              {duplicates.length > 0 && ` · ${duplicates.length} duplicatas ignoradas`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Conta de destino</Label>
              <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {myAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria padrão</Label>
              <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="max-h-72 overflow-auto border border-border rounded text-xs">
            <table className="w-full min-w-[480px]">

              <thead className="bg-muted sticky top-0">
                <tr><th className="text-left p-2">Data</th><th className="text-left p-2">Descrição</th><th className="text-left p-2">Cat.</th><th className="text-right p-2">Valor</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 truncate max-w-[200px]">{r.description}</td>
                    <td className="p-2 text-muted-foreground">{r.category || defaultCategory}</td>
                    <td className={`p-2 text-right ${r.type === 'despesa' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {r.type === 'despesa' ? '-' : '+'}{formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && (
              <p className="p-2 text-center text-muted-foreground">…e mais {rows.length - 200}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirm} disabled={rows.length === 0}>Importar {rows.length}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ IMPORTAR PDF (extrato / fatura) ============
interface InstallmentSlot {
  index: number;           // 1..total
  date: string;            // ISO YYYY-MM-DD
  exists: boolean;
  existing?: { description: string; date: string; amount: number };
}
interface PdfRow extends StatementEntry {
  _id: string;
  _import: boolean;
  _duplicate: boolean;
  _duplicateOf?: { description: string; date: string; amount: number; matchType: 'exata' | 'nome+valor' | 'valor+data' };
  _installmentPlan?: InstallmentSlot[]; // preenchido quando é parcelado
  _conflictGroup?: string;               // id do grupo de conflito entre leituras
  _sourceFile?: string;                  // arquivo de origem (útil quando importou vários)
}

// Normaliza texto para comparação
function normDesc(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sobreposição de palavras significativas (>=3 chars)
function descOverlap(a: string, b: string): number {
  const wa = new Set(normDesc(a).split(' ').filter(w => w.length >= 3));
  const wb = new Set(normDesc(b).split(' ').filter(w => w.length >= 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let hits = 0;
  wa.forEach(w => { if (wb.has(w)) hits++; });
  return hits / Math.min(wa.size, wb.size);
}

function daysBetween(a: string, b: string) {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(Math.round((da - db) / 86400000));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

function addMonthsISO(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function PdfImportButton({ owner }: { owner: 'leandro' | 'jonathan' }) {
  const { cards, accounts, transactions, addTransaction } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const parseFn = useServerFn(parseBankStatement);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [rows, setRows] = useState<PdfRow[]>([]);
  const [destination, setDestination] = useState<string>('');

  const myCards = cards.filter(c => c.owner === owner);
  const myAccounts = accounts.filter(a => a.owner === owner);

  const isCard = destination.startsWith('card:');
  const isAccount = destination.startsWith('account:');

  const onFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Valida cada arquivo antes de começar
    for (const file of files) {
      const name = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
      const isImage = file.type.startsWith('image/')
        || /\.(png|jpe?g|webp|heic|heif)$/i.test(name);
      if (!isPdf && !isImage) {
        toast.error(`"${file.name}": envie um PDF do banco ou um print (PNG/JPG).`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`"${file.name}" acima de 15MB. Envie um arquivo menor.`);
        return;
      }
    }

    setLoading(true);
    setOpen(true);
    setStatement(null);
    setRows([]);
    setProgress(3);
    setStatus(files.length > 1 ? `Preparando ${files.length} arquivos…` : 'Preparando o arquivo…');

    // Progresso simulado enquanto a IA processa (sobe devagar até 90% e trava)
    let simTarget = 90;
    const tick = setInterval(() => {
      setProgress(p => (p < simTarget ? p + Math.max(1, Math.round((simTarget - p) * 0.06)) : p));
    }, 400);

    // Acumuladores entre arquivos
    const allEntries: Array<StatementEntry & { _sourceFile: string }> = [];
    let firstStatement: ParsedStatement | null = null;
    const banks = new Set<string>();
    let statementTypeAcc: ParsedStatement['statementType'] | null = null;
    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    try {
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const name = file.name.toLowerCase();
        const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
        const isImage = !isPdf;
        const kindLabel = isImage ? 'print' : 'PDF';
        const stepPrefix = files.length > 1 ? `[${idx + 1}/${files.length}] ` : '';

        setStatus(`${stepPrefix}Enviando ${kindLabel} "${file.name}" para a IA…`);
        const dataUrl = await fileToDataUrl(file);
        setTimeout(() => setStatus(`${stepPrefix}IA lendo "${file.name}"…`), 400);

        const mediaType = file.type || (isImage ? 'image/png' : 'application/pdf');
        const result = await parseFn({ data: { pdfDataUrl: dataUrl, filename: file.name, mediaType } });

        if (!firstStatement) firstStatement = result;
        if (result.bank) banks.add(result.bank);
        if (result.statementType && result.statementType !== 'unknown') {
          if (!statementTypeAcc) statementTypeAcc = result.statementType;
        }
        if (result.periodStart && (!periodStart || result.periodStart < periodStart)) periodStart = result.periodStart;
        if (result.periodEnd && (!periodEnd || result.periodEnd > periodEnd)) periodEnd = result.periodEnd;

        (result.entries ?? []).forEach(e => allEntries.push({ ...e, _sourceFile: file.name }));

        // Progresso proporcional aos arquivos processados
        setProgress(Math.min(90, 10 + Math.round(((idx + 1) / files.length) * 80)));
      }

      // Statement combinado
      const combinedStatement: ParsedStatement = {
        ...(firstStatement as ParsedStatement),
        bank: banks.size > 0 ? Array.from(banks).join(' + ') : (firstStatement?.bank ?? ''),
        statementType: statementTypeAcc ?? firstStatement?.statementType ?? 'unknown',
        periodStart: periodStart ?? firstStatement?.periodStart ?? '',
        periodEnd: periodEnd ?? firstStatement?.periodEnd ?? '',
        entries: allEntries,
      };
      setStatement(combinedStatement);
      setStatus('Organizando transações e detectando duplicatas…');
      setProgress(95);

      // Dedup contra existentes + entre os próprios arquivos (mesmo owner)
      const ownerTx = transactions.filter(t => t.owner === owner);
      const seenIntra = new Set<string>();

      const parsed: PdfRow[] = allEntries.map((e, i) => {
        const amt = Math.abs(e.amount);
        const isTransfer = e.type === 'transferencia';
        const isParcelado = !isTransfer && e.installmentTotal && e.installmentTotal > 1 && e.installmentCurrent && e.installmentCurrent >= 1;

        // --- Plano de parcelas (quando parcelado) ---
        let plan: InstallmentSlot[] | undefined;
        if (isParcelado) {
          const total = e.installmentTotal!;
          const current = e.installmentCurrent!;
          const startDate = addMonthsISO(e.date, -(current - 1));
          plan = Array.from({ length: total }, (_, k) => {
            const expected = addMonthsISO(startDate, k);
            const found = ownerTx.find(t =>
              Math.abs(Math.abs(t.amount) - amt) < 0.01
              && descOverlap(t.description, e.description) >= 0.4
              && daysBetween(t.date, expected) <= 10,
            );
            return {
              index: k + 1,
              date: expected,
              exists: !!found,
              existing: found ? { description: found.description, date: found.date, amount: found.amount } : undefined,
            };
          });
        }

        // --- Dedup para gastos à vista ---
        let match: PdfRow['_duplicateOf'] | undefined;
        if (!isParcelado) {
          const sameAmount = ownerTx.filter(t => Math.abs(Math.abs(t.amount) - amt) < 0.01);
          for (const t of sameAmount) {
            const overlap = descOverlap(t.description, e.description);
            const days = daysBetween(t.date, e.date);
            if (t.date === e.date && overlap >= 0.8) {
              match = { description: t.description, date: t.date, amount: t.amount, matchType: 'exata' };
              break;
            }
            if (overlap >= 0.5 && days <= 40) {
              match = { description: t.description, date: t.date, amount: t.amount, matchType: 'nome+valor' };
              break;
            }
            if (days <= 3 && !match) {
              match = { description: t.description, date: t.date, amount: t.amount, matchType: 'valor+data' };
            }
          }
        }

        // Dedup entre arquivos do mesmo lote (mesmo valor + descrição normalizada + data)
        const intraKey = `${e.date}::${amt.toFixed(2)}::${normDesc(e.description).slice(0, 24)}`;
        const intraDup = seenIntra.has(intraKey);
        if (!intraDup) seenIntra.add(intraKey);

        const allExist = plan ? plan.every(s => s.exists) : false;
        const dup = isParcelado ? allExist : (!!match || intraDup);

        return {
          ...e,
          _id: `${i}`,
          _import: !dup && !isTransfer,
          _duplicate: dup,
          _duplicateOf: match ?? (intraDup ? { description: e.description, date: e.date, amount: e.amount, matchType: 'exata' as const } : undefined),
          _installmentPlan: plan,
        };
      });
      setRows(parsed);

      // Sugere destino
      const st = combinedStatement.statementType;
      if (st === 'card' && myCards.length > 0) setDestination(`card:${myCards[0].id}`);
      else if (st === 'account' && myAccounts.length > 0) setDestination(`account:${myAccounts[0].id}`);
      else if (myCards.length > 0) setDestination(`card:${myCards[0].id}`);
      else if (myAccounts.length > 0) setDestination(`account:${myAccounts[0].id}`);

      setProgress(100);
      setStatus(`Pronto! ${parsed.length} lançamentos encontrados${files.length > 1 ? ` em ${files.length} arquivos` : ''}.`);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível ler um dos arquivos. Envie o PDF original do banco ou prints nítidos da fatura.');
      setOpen(false);
    } finally {
      clearInterval(tick);
      setLoading(false);
    }
  };

  const updateRow = (id: string, patch: Partial<PdfRow>) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));
  };

  const toImport = rows.filter(r => r._import);
  const totalImport = toImport.reduce((s, r) => s + (r.type === 'despesa' ? r.amount : 0), 0);
  const transferCount = rows.filter(r => r.type === 'transferencia').length;

  const confirm = () => {
    if (!destination) { toast.error('Escolha um cartão ou conta de destino.'); return; }
    const [kind, id] = destination.split(':');
    const card = kind === 'card' ? cards.find(c => c.id === id) : undefined;
    const account = kind === 'account' ? accounts.find(a => a.id === id) : undefined;
    const method = card?.name || account?.name || '—';

    let count = 0;         // parcelas/lançamentos realmente criados
    let skipped = 0;       // parcelas puladas por já existirem
    let groups = 0;        // parcelamentos importados (com pelo menos 1 parcela nova)

    for (const r of toImport) {
      const isTransfer = r.type === 'transferencia';
      const effectiveType: 'despesa' | 'receita' = isTransfer
        ? 'despesa'
        : (r.type as 'despesa' | 'receita');
      const effectiveCategory = isTransfer ? 'Transferência' : (r.category || 'Outros');

      const isParcelado = !isTransfer && r.installmentTotal && r.installmentTotal > 1 && r._installmentPlan && r._installmentPlan.length > 0;
      if (isParcelado) {
        const total = r.installmentTotal!;
        const plan = r._installmentPlan!;
        const missing = plan.filter(s => !s.exists);
        skipped += plan.length - missing.length;
        if (missing.length === 0) continue;
        // Cria cada parcela faltante individualmente (installments:1) para não recriar as que já existem.
        for (const slot of missing) {
          addTransaction({
            description: `${r.description} (${slot.index}/${total})`,
            amount: r.amount, // valor por parcela
            date: slot.date,
            category: effectiveCategory,
            paymentMethod: method,
            cardId: card?.id,
            accountId: account?.id,
            type: effectiveType,
            owner,
          });
          count += 1;
        }
        groups += 1;
      } else {
        addTransaction({
          description: r.description,
          amount: r.amount,
          date: r.date,
          category: effectiveCategory,
          paymentMethod: method,
          cardId: card?.id,
          accountId: account?.id,
          type: effectiveType,
          owner,
        });
        count += 1;
      }
    }
    const parts = [`${count} lançamento${count === 1 ? '' : 's'} importado${count === 1 ? '' : 's'}`];
    if (groups > 0) parts.push(`${groups} parcelamento${groups === 1 ? '' : 's'}`);
    if (skipped > 0) parts.push(`${skipped} parcela${skipped === 1 ? '' : 's'} já existia${skipped === 1 ? '' : 'm'} e foi${skipped === 1 ? '' : 'ram'} pulada${skipped === 1 ? '' : 's'}`);
    toast.success(parts.join(' · '));
    setOpen(false);
    setStatement(null);
    setRows([]);
  };

  return (
    <>
      <input
        ref={fileRef} type="file" multiple
        accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={e => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length > 0) onFiles(fs);
          e.currentTarget.value = '';
        }}
      />
      <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
        <FileText className="h-4 w-4" /> Importar PDF ou prints
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!loading) setOpen(o); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Importar extrato / fatura
            </DialogTitle>
            <DialogDescription>
              Envie o PDF do banco ou um print da fatura. A IA identifica cada lançamento, categoriza e detecta parcelamentos. Revise antes de salvar.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4 px-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="w-full max-w-md space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{status || 'Processando…'}</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Pode levar 20-40 segundos em faturas longas.</p>
            </div>
          )}

          {!loading && statement && (
            <>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-[10px] uppercase text-muted-foreground">Tipo detectado</p>
                  <p className="font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                    {statement.statementType === 'card' ? (
                      <><CardIcon className="h-3.5 w-3.5" /> Fatura de cartão</>
                    ) : statement.statementType === 'account' ? (
                      <><Landmark className="h-3.5 w-3.5" /> Extrato de conta</>
                    ) : (
                      <>Desconhecido</>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{statement.bank}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-[10px] uppercase text-muted-foreground">Período</p>
                  <p className="font-semibold text-sm mt-0.5">
                    {statement.periodStart || '—'} → {statement.periodEnd || '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {rows.length} lançamentos · {rows.filter(r => r._duplicate).length} duplicatas
                    {transferCount > 0 && <> · <span className="text-sky-600 dark:text-sky-400 font-medium">{transferCount} transferências</span></>}
                  </p>
                </div>
                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs">Lançar em *</Label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Cartão ou conta" /></SelectTrigger>
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
                    </SelectContent>
                  </Select>
                  {statement.statementType === 'card' && !isCard && (
                    <p className="text-[10px] text-orange-600">Detectamos fatura — o ideal é lançar em um cartão.</p>
                  )}
                  {statement.statementType === 'account' && !isAccount && (
                    <p className="text-[10px] text-orange-600">Detectamos extrato de conta — o ideal é lançar em uma conta.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Button size="sm" variant="outline" className="h-7"
                  onClick={() => setRows(prev => prev.map(r => ({ ...r, _import: !r._duplicate && r.type !== 'transferencia' })))}>
                  Só receitas/despesas reais
                </Button>
                <Button size="sm" variant="outline" className="h-7"
                  onClick={() => setRows(prev => prev.map(r => ({ ...r, _import: true })))}>
                  Selecionar todas
                </Button>
                <Button size="sm" variant="ghost" className="h-7"
                  onClick={() => setRows(prev => prev.map(r => ({ ...r, _import: false })))}>
                  Nenhuma
                </Button>
                {transferCount > 0 && (
                  <span className="text-[10px] text-sky-700 dark:text-sky-400 ml-auto">
                    ↔ {transferCount} transferência{transferCount > 1 ? 's' : ''} detectada{transferCount > 1 ? 's' : ''} e desmarcada{transferCount > 1 ? 's' : ''} — não entram em receitas/despesas
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg">
                <table className="w-full min-w-[640px] text-xs">

                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="p-2 w-8"></th>
                      <th className="p-2 text-left w-24">Data</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-left w-36">Categoria</th>
                      <th className="p-2 text-left w-20">Parcela</th>
                      <th className="p-2 text-right w-24">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const isTransfer = r.type === 'transferencia';
                      return (
                      <tr key={r._id} className={cn(
                        'border-t border-border',
                        r._duplicate && 'bg-amber-50 dark:bg-amber-950/20',
                        isTransfer && !r._duplicate && 'bg-sky-50/60 dark:bg-sky-950/20',
                        !r._import && 'opacity-40',
                      )}>
                        <td className="p-1.5 text-center align-top">
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateRow(r._id, { _import: true })}
                              className={cn(
                                'text-[9px] font-semibold rounded px-1.5 py-0.5 border transition',
                                r._import
                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
                              )}
                            >
                              Importar
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRow(r._id, { _import: false })}
                              className={cn(
                                'text-[9px] font-semibold rounded px-1.5 py-0.5 border transition',
                                !r._import
                                  ? 'bg-muted-foreground/80 text-white border-muted-foreground/80'
                                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted',
                              )}
                            >
                              Pular
                            </button>
                          </div>
                        </td>
                        <td className="p-1.5">
                          <Input type="date" className="h-7 text-xs px-1" value={r.date}
                            onChange={e => updateRow(r._id, { date: e.target.value })} />
                        </td>
                        <td className="p-1.5">
                          <Input className="h-7 text-xs px-1" value={r.description}
                            onChange={e => updateRow(r._id, { description: e.target.value })} />
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {isTransfer && (
                              <span className="text-[9px] px-1 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
                                ↔ transferência{r.transferReason ? ` — ${r.transferReason}` : ''}
                              </span>
                            )}
                            {r._duplicate && r._duplicateOf && (
                              <span
                                className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium"
                                title={`Match ${r._duplicateOf.matchType}`}
                              >
                                ⚠ já existe: "{r._duplicateOf.description}" · {formatDate(r._duplicateOf.date)} · {formatCurrency(Math.abs(r._duplicateOf.amount))}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5">
                          <Select value={r.category} onValueChange={v => updateRow(r._id, { category: v })}>
                            <SelectTrigger className="h-7 text-xs px-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 align-top">
                          {isTransfer ? (
                            <span className="text-[10px] text-sky-600 dark:text-sky-400">—</span>
                          ) : r.installmentTotal && r.installmentTotal > 1 ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="outline" className="text-[9px] h-5 px-1.5 w-fit">
                                {r.installmentCurrent}/{r.installmentTotal}
                              </Badge>
                              {r._installmentPlan && (() => {
                                const exists = r._installmentPlan.filter(s => s.exists).length;
                                const missing = r._installmentPlan.length - exists;
                                return (
                                  <span
                                    className="text-[9px] leading-tight text-muted-foreground"
                                    title={r._installmentPlan.map(s =>
                                      `${s.index}/${r.installmentTotal} ${formatDate(s.date)} ${s.exists ? '✓ já no app' : '＋ criar'}`,
                                    ).join('\n')}
                                  >
                                    {exists > 0 && (
                                      <span className="text-amber-700 dark:text-amber-400">✓{exists} já</span>
                                    )}
                                    {exists > 0 && missing > 0 && ' · '}
                                    {missing > 0 && (
                                      <span className="text-emerald-700 dark:text-emerald-400">＋{missing} criar</span>
                                    )}
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">à vista</span>
                          )}
                        </td>
                        <td className={cn(
                          'p-1.5 text-right font-semibold tabular-nums',
                          isTransfer ? 'text-sky-600 dark:text-sky-400'
                            : r.type === 'despesa' ? 'text-rose-600' : 'text-emerald-600',
                        )}>
                          {isTransfer ? '↔ ' : r.type === 'despesa' ? '-' : '+'}{formatCurrency(r.amount)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {toImport.length} selecionados</span>
                <span>Total despesas selecionadas: <strong className="text-rose-600">{formatCurrency(totalImport)}</strong></span>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={confirm} disabled={loading || !statement || toImport.length === 0 || !destination}>
              Importar {toImport.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

