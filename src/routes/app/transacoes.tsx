import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { AlertCircle, Trash2, Receipt, Pencil, Search, Download, Upload, X, FileText, Loader2, Sparkles, CheckCircle2, CreditCard as CardIcon, Landmark, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { downloadCSV, transactionsToCSV, parseCSV, dedupeAgainstExisting, type ParsedRow } from '@/lib/csv';
import { nextPayday, toISODate } from '@/lib/payday';
import { useServerFn } from '@tanstack/react-start';
import { parseBankStatement, type StatementEntry, type ParsedStatement } from '@/lib/pdf-import.functions';
import { invoiceMonthOf, addMonthsToKey, labelMonthKey, invoiceDueDateISO, invoiceClosingDateISO } from '@/lib/finance';

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
  const [tags, setTags] = useState<string[]>([]);

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

  // Painel direito agora mostra apenas o histórico "Tudo".
  // As visões por cartão e por conta foram movidas para /app/cartoes e /app/contas.

  // Filtros (usados na aba "Tudo")
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all'); // 'all' | 'YYYY-MM'
  const [filterTag, setFilterTag] = useState<string>('all');


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
    setTags([]);
  };

  // Todas as tags já existentes (para autocomplete e filtro)
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of myTx) for (const g of (t.tags || [])) s.add(g);
    return Array.from(s).sort();
  }, [myTx]);

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
      tags: tags.length ? tags : undefined,
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
      if (q && !t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q) && !(t.tags || []).some(tg => tg.toLowerCase().includes(q))) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterMonth !== 'all' && !t.date.startsWith(filterMonth)) return false;
      if (filterTag !== 'all' && !(t.tags || []).includes(filterTag)) return false;
      return true;
    });
  }, [myTx, search, filterCategory, filterType, filterMonth, filterTag]);

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

              {!isSalary && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Tags (opcional)</Label>
                  <TagsInput value={tags} onChange={setTags} suggestions={allTags} />
                </div>
              )}

              <Button type="submit" className="w-full">
                {isSalary ? 'Cadastrar salário (2 recorrências)' : (isInstallment && parcelasNum > 1 ? `Lançar ${parcelasNum} parcelas` : 'Salvar transação')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          {/* Visões de Cartões e Contas foram movidas para as abas dedicadas. */}
          {true && (
            <Card>
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
                  {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterTag('all')}
                        className={cn(
                          'h-6 px-2 rounded-full text-[10px] font-medium border transition',
                          filterTag === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted',
                        )}
                      >Todas tags</button>
                      {allTags.map(tg => (
                        <button
                          key={tg}
                          type="button"
                          onClick={() => setFilterTag(tg)}
                          className={cn(
                            'h-6 px-2 rounded-full text-[10px] font-medium border transition',
                            filterTag === tg ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted',
                          )}
                        >#{tg}</button>
                      ))}
                    </div>
                  )}
                  {(search || filterCategory !== 'all' || filterType !== 'all' || filterMonth !== 'all' || filterTag !== 'all') && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => {
                      setSearch(''); setFilterCategory('all'); setFilterType('all'); setFilterMonth('all'); setFilterTag('all');
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
          )}
        </div>

      </div>
    </div>
  );
}

// ============ VISTA POR CARTÃO (fatura mês a mês) ============
export function CardInvoiceView({
  owner, onUpdate, onRemove, cardId, hideCardChips,
}: {
  owner: 'leandro' | 'jonathan';
  onUpdate: ReturnType<typeof useData>['updateTransaction'];
  onRemove: ReturnType<typeof useData>['removeTransaction'];
  cardId?: string;       // força um cartão específico
  hideCardChips?: boolean; // esconde a lista de chips
}) {
  const { cards, transactions, accounts, markInvoicePaid, unmarkInvoicePaid } = useData();
  const myCards = cards.filter(c => c.owner === owner);
  const myAccounts = accounts.filter(a => a.owner === owner);
  const [internalCardId, setInternalCardId] = useState<string>(cardId || myCards[0]?.id || '');
  const selectedCardId = cardId || internalCardId;
  const setSelectedCardId = cardId ? () => {} : setInternalCardId;
  const [offset, setOffset] = useState(0); // 0 = fatura atual, -1 = anterior, +1 = próxima…
  const [payOpen, setPayOpen] = useState(false);

  const card = myCards.find(c => c.id === selectedCardId);


  // Fatura atual = fatura cujo vencimento é este mês (ou próximo se hoje já passou do fechamento).
  const currentInvoiceKey = useMemo(() => {
    if (!card) return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const today = new Date().toISOString().slice(0, 10);
    return invoiceMonthOf(today, card.closingDay);
  }, [card]);

  const invoiceKey = card ? addMonthsToKey(currentInvoiceKey, offset) : currentInvoiceKey;

  const cardTx = useMemo(
    () => transactions.filter(t => t.cardId === selectedCardId),
    [transactions, selectedCardId],
  );

  const invoiceTx = useMemo(() => {
    if (!card) return [];
    return cardTx
      .filter(t => invoiceMonthOf(t.date, card.closingDay) === invoiceKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [cardTx, card, invoiceKey]);

  const total = invoiceTx.reduce((s, t) => s + (t.type === 'despesa' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
  const futureParcelas = useMemo(() => {
    if (!card) return 0;
    return cardTx.filter(t => {
      const k = invoiceMonthOf(t.date, card.closingDay);
      return k > invoiceKey && t.installmentInfo;
    }).length;
  }, [cardTx, card, invoiceKey]);

  if (myCards.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum cartão cadastrado. Adicione um cartão em Configurações → Cartões.
        </CardContent>
      </Card>
    );
  }

  const closingISO = card ? invoiceClosingDateISO(invoiceKey, card.closingDay) : '';
  const dueISO = card ? invoiceDueDateISO(invoiceKey, card.dueDay) : '';
  const todayISO = new Date().toISOString().slice(0, 10);
  const paidInfo = card?.paidInvoices?.[invoiceKey];
  const status = paidInfo ? 'paga' : closingISO > todayISO ? 'aberta' : dueISO >= todayISO ? 'fechada' : 'vencida';
  const daysToDue = card ? Math.round((new Date(dueISO).getTime() - new Date(todayISO).getTime()) / 86400000) : 0;
  const daysToClose = card ? Math.round((new Date(closingISO).getTime() - new Date(todayISO).getTime()) / 86400000) : 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        {/* Chips de cartões */}
        {!hideCardChips && (
          <div className="flex flex-wrap gap-1.5">
            {myCards.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setSelectedCardId(c.id); setOffset(0); }}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition',
                  selectedCardId === c.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', `bg-${c.color}-500`)} style={{ backgroundColor: cssColor(c.color) }} />
                {c.name}
              </button>
            ))}
          </div>
        )}


        {card && (
          <>
            {/* Cabeçalho da fatura */}
            <div className="rounded-lg border p-3 space-y-2 bg-gradient-to-br from-muted/40 to-transparent">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fatura de {labelMonthKey(invoiceKey)}</p>
                  <p className={cn('text-2xl font-bold tabular-nums', paidInfo && 'line-through text-muted-foreground')}>{formatCurrency(Math.max(0, total))}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] uppercase',
                    status === 'aberta' && 'border-emerald-500 text-emerald-700 dark:text-emerald-400',
                    status === 'fechada' && 'border-amber-500 text-amber-700 dark:text-amber-400',
                    status === 'vencida' && 'border-rose-500 text-rose-700 dark:text-rose-400',
                    status === 'paga' && 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                  )}
                >
                  {status === 'paga' ? '✓ paga' : status}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                <span>Fecha <strong className="text-foreground">{formatDate(closingISO)}</strong></span>
                <span>Vence <strong className="text-foreground">{formatDate(dueISO)}</strong></span>
                <span>Limite <strong className="text-foreground">{formatCurrency(card.limit)}</strong></span>
                {futureParcelas > 0 && <span>· {futureParcelas} parcela{futureParcelas > 1 ? 's' : ''} futura{futureParcelas > 1 ? 's' : ''}</span>}
              </div>
              {!paidInfo && status !== 'paga' && offset === 0 && (
                <div className="text-[11px] rounded-md bg-muted/50 border border-border/60 px-2 py-1 flex items-center gap-1">
                  {daysToClose > 0 && daysToClose <= 7 && <span>⏰ Fecha em <strong>{daysToClose}d</strong></span>}
                  {daysToClose <= 0 && daysToDue > 0 && daysToDue <= 10 && <span>💰 Vence em <strong>{daysToDue}d</strong></span>}
                  {daysToDue < 0 && <span className="text-rose-600 font-semibold">⚠ Fatura vencida há {Math.abs(daysToDue)}d</span>}
                </div>
              )}
              {paidInfo && (
                <div className="text-[11px] rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-2 py-1 text-emerald-800 dark:text-emerald-300">
                  Paga em {formatDate(paidInfo.paidAt)} · {formatCurrency(paidInfo.amount)} · {accounts.find(a => a.id === paidInfo.accountId)?.name || 'conta'}
                </div>
              )}
              {total > 0 && (
                <div className="flex gap-2 pt-1">
                  {!paidInfo ? (
                    <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => setPayOpen(true)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marcar fatura como paga
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1" onClick={() => unmarkInvoicePaid(card.id, invoiceKey)}>
                      Estornar pagamento
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Navegador de mês (-12 a +12) */}
            <MonthStrip
              baseKey={currentInvoiceKey}
              offset={offset}
              onChange={setOffset}
              range={12}
              getMonthMeta={(k) => {
                let value = 0;
                for (const tx of cardTx) {
                  if (!card) continue;
                  if (invoiceMonthOf(tx.date, card.closingDay) !== k) continue;
                  value += tx.type === 'despesa' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
                }
                const paid = !!card?.paidInvoices?.[k];
                const status: 'paid' | 'current' | 'past' | 'future' =
                  paid ? 'paid' : k === currentInvoiceKey ? 'current' : k < currentInvoiceKey ? 'past' : 'future';
                return { total: value, status };
              }}
            />

            {card && (
              <PayInvoiceDialog
                open={payOpen}
                onOpenChange={setPayOpen}
                cardName={card.name}
                monthKey={invoiceKey}
                total={Math.max(0, total)}
                accounts={myAccounts}
                onConfirm={(accId, amt, dt) => {
                  markInvoicePaid(card.id, invoiceKey, accId, amt, dt);
                  setPayOpen(false);
                }}
              />
            )}
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
        {invoiceTx.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Sem lançamentos nesta fatura.
          </div>
        ) : (
          invoiceTx.map(t => <TxRow key={t.id} tx={t} onUpdate={onUpdate} onRemove={onRemove} />)
        )}
      </CardContent>
    </Card>
  );
}

// ============ VISTA POR CONTA (extrato entradas x saídas) ============
export function AccountLedgerView({
  owner, onUpdate, onRemove,
}: {
  owner: 'leandro' | 'jonathan';
  onUpdate: ReturnType<typeof useData>['updateTransaction'];
  onRemove: ReturnType<typeof useData>['removeTransaction'];
}) {
  const { accounts, transactions } = useData();
  const myAccounts = accounts.filter(a => a.owner === owner);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(myAccounts[0]?.id || '');
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<'all' | 'receita' | 'despesa'>('all');

  const account = myAccounts.find(a => a.id === selectedAccountId);
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthKey = addMonthsToKey(currentKey, offset);

  const accountTx = useMemo(
    () => transactions.filter(t => t.accountId === selectedAccountId && t.date.startsWith(monthKey)),
    [transactions, selectedAccountId, monthKey],
  );

  const entradas = accountTx.filter(t => t.type === 'receita').reduce((s, t) => s + Math.abs(t.amount), 0);
  const saidas = accountTx.filter(t => t.type === 'despesa').reduce((s, t) => s + Math.abs(t.amount), 0);
  const saldo = entradas - saidas;

  const visible = useMemo(() => {
    const list = filter === 'all' ? accountTx : accountTx.filter(t => t.type === filter);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [accountTx, filter]);

  if (myAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma conta cadastrada. Adicione uma conta em Configurações → Contas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {myAccounts.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => { setSelectedAccountId(a.id); setOffset(0); setFilter('all'); }}
              className={cn(
                'flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition',
                selectedAccountId === a.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted',
              )}
            >
              🏦 {a.name}
            </button>
          ))}
        </div>

        {account && (
          <>
            <div className="rounded-lg border p-3 space-y-3 bg-gradient-to-br from-muted/40 to-transparent">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{account.name} — {labelMonthKey(monthKey)}</p>
                  <p className={cn('text-2xl font-bold tabular-nums', saldo >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Saldo do mês</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[11px] text-muted-foreground">Saldo atual</p>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(account.balance)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-2">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                    <TrendingUp className="h-3 w-3" /> Entradas
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(entradas)}</p>
                </div>
                <div className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-2">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400">
                    <TrendingDown className="h-3 w-3" /> Saídas
                  </div>
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(saidas)}</p>
                </div>
              </div>
            </div>

            {/* Navegador de mês (-12 a +12) */}
            <MonthStrip baseKey={currentKey} offset={offset} onChange={setOffset} range={12} />


            <div className="flex gap-1 p-0.5 bg-muted rounded-md">
              {([
                { id: 'all', label: 'Todas' },
                { id: 'receita', label: 'Entradas' },
                { id: 'despesa', label: 'Saídas' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={cn(
                    'flex-1 h-7 text-[11px] font-medium rounded',
                    filter === id ? 'bg-background shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
        {visible.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Sem lançamentos neste mês.
          </div>
        ) : (
          visible.map(t => <TxRow key={t.id} tx={t} onUpdate={onUpdate} onRemove={onRemove} />)
        )}
      </CardContent>
    </Card>
  );
}

// Navegador horizontal de meses: -12 a +12, com auto-scroll para o mês ativo.
// Quando `getMonthMeta` é passado, renderiza o layout de timeline com cards e valores.
function MonthStrip({
  baseKey, offset, onChange, range = 12, getMonthMeta,
}: {
  baseKey: string;                 // YYYY-MM que representa offset 0
  offset: number;                  // -range..+range
  onChange: (offset: number) => void;
  range?: number;
  getMonthMeta?: (monthKey: string) => { total: number; status: 'paid' | 'current' | 'past' | 'future' };
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const didInitialScroll = useRef(false);
  useEffect(() => {
    const container = scrollRef.current;
    const btn = activeRef.current;
    if (!container || !btn) return;
    const doScroll = () => {
      const target = btn.offsetLeft - (container.clientWidth - btn.clientWidth) / 2;
      const max = container.scrollWidth - container.clientWidth;
      const left = Math.max(0, Math.min(max, target));
      container.scrollTo({ left, behavior: didInitialScroll.current ? 'smooth' : 'auto' });
      didInitialScroll.current = true;
    };
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(doScroll);
    });
    return () => cancelAnimationFrame(raf1);
  }, [offset, baseKey, range]);

  const offsets = Array.from({ length: range * 2 + 1 }, (_, i) => i - range);
  const yearsSet = new Set<number>();
  offsets.forEach(o => yearsSet.add(Number(addMonthsToKey(baseKey, o).slice(0, 4))));
  const years = Array.from(yearsSet).sort();

  const jumpToYear = (year: number) => {
    const [by] = baseKey.split('-').map(Number);
    const monthsDiff = (year - by) * 12;
    const clamped = Math.max(-range, Math.min(range, monthsDiff));
    onChange(clamped);
  };

  const activeYear = Number(addMonthsToKey(baseKey, offset).slice(0, 4));

  const isTimeline = !!getMonthMeta;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Button
          size="icon" variant="ghost" className="h-8 w-8 shrink-0"
          onClick={() => onChange(Math.max(-range, offset - 1))}
          disabled={offset <= -range}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {isTimeline ? (
          <div
            ref={scrollRef}
            className="flex-1 flex items-stretch gap-2 overflow-x-auto scroll-smooth snap-x py-3 px-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {offsets.map(o => {
              const k = addMonthsToKey(baseKey, o);
              const meta = getMonthMeta!(k);
              const active = o === offset;
              const [, mm] = k.split('-');
              const monthLabel = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Number(mm) - 1];
              const yearShort = k.slice(2, 4);

              // Cores por status
              const isPaid = meta.status === 'paid';
              const isCurrent = meta.status === 'current';
              const isFuture = meta.status === 'future';

              const dotClass = active
                ? 'bg-white border-primary'
                : isPaid
                  ? 'bg-emerald-600 border-emerald-600'
                  : isCurrent
                    ? 'bg-primary border-primary'
                    : isFuture
                      ? 'bg-background border-muted-foreground/40'
                      : 'bg-muted-foreground/60 border-muted-foreground/60';

              const leftLineClass = o === -range
                ? 'opacity-0'
                : isFuture || meta.status === 'current'
                  ? 'border-t-2 border-dashed border-muted-foreground/30'
                  : 'bg-emerald-600/70 h-[2px]';

              const rightLineClass = o === range
                ? 'opacity-0'
                : isFuture || isCurrent
                  ? 'border-t-2 border-dashed border-muted-foreground/30'
                  : 'bg-emerald-600/70 h-[2px]';

              const cardBase = active
                ? 'w-24 h-40 bg-primary/5 border-2 border-primary shadow-lg shadow-primary/10 -mt-1'
                : 'w-20 h-36 bg-muted/40 border border-transparent';

              const monthTextClass = active
                ? 'text-primary font-bold'
                : isFuture
                  ? 'text-muted-foreground/70'
                  : 'text-foreground/80 font-semibold';

              const valueTextClass = active
                ? 'text-primary font-bold'
                : isPaid
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : isFuture
                    ? 'text-muted-foreground/70'
                    : 'text-foreground';

              return (
                <button
                  key={o}
                  ref={active ? activeRef : undefined}
                  type="button"
                  onClick={() => onChange(o)}
                  className={cn(
                    'relative flex-shrink-0 rounded-2xl flex flex-col items-center justify-between py-4 snap-center transition-all',
                    cardBase,
                  )}
                  aria-current={active ? 'true' : undefined}
                >
                  <div className="flex flex-col items-center leading-tight">
                    <span className={cn('text-xs', monthTextClass)}>{monthLabel}</span>
                    <span className="text-[9px] text-muted-foreground/70">/{yearShort}</span>
                  </div>

                  {/* Timeline: linhas + ponto */}
                  <div className="relative w-full flex items-center justify-center px-0">
                    <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[2px]', leftLineClass)} />
                    <div className={cn('absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[2px]', rightLineClass)} />
                    <div className={cn(
                      'relative z-10 rounded-full border-2 flex items-center justify-center',
                      active ? 'w-4 h-4' : 'w-3 h-3',
                      dotClass,
                    )}>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                  </div>

                  <div className="text-center px-1">
                    <span className={cn('text-[10px] tabular-nums whitespace-nowrap', valueTextClass)}>
                      {meta.total >= 0
                        ? `R$ ${meta.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                    {isPaid && (
                      <div className="text-[8px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">Paga</div>
                    )}
                    {isCurrent && !active && (
                      <div className="text-[8px] uppercase tracking-wide text-primary font-semibold mt-0.5">Atual</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 flex items-center gap-1 overflow-x-auto scroll-smooth snap-x">
            {offsets.map(o => {
              const k = addMonthsToKey(baseKey, o);
              const active = o === offset;
              const isToday = o === 0;
              return (
                <button
                  key={o}
                  ref={active ? activeRef : undefined}
                  type="button"
                  onClick={() => onChange(o)}
                  className={cn(
                    'relative text-[11px] px-2.5 h-8 rounded-md font-medium whitespace-nowrap snap-center shrink-0 border transition-all',
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/40 ring-offset-1 ring-offset-background scale-105 font-semibold'
                      : isToday
                        ? 'border-primary/40 text-primary hover:bg-primary/5'
                        : 'text-muted-foreground border-transparent hover:bg-muted',
                  )}
                  aria-current={active ? 'true' : undefined}
                >
                  {labelMonthKey(k)}{isToday ? ' •' : ''}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <Button
          size="icon" variant="ghost" className="h-8 w-8 shrink-0"
          onClick={() => onChange(Math.min(range, offset + 1))}
          disabled={offset >= range}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Linha 2: atalhos de ano + botão "hoje" */}
      <div className="flex items-center gap-1 flex-wrap">
        {years.map(y => (
          <button
            key={y}
            type="button"
            onClick={() => jumpToYear(y)}
            className={cn(
              'text-[10px] font-semibold h-6 px-2 rounded',
              activeYear === y ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {y}
          </button>
        ))}
        {offset !== 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-[10px] font-semibold h-6 px-2 rounded ml-auto text-primary hover:bg-primary/10"
          >
            Hoje
          </button>
        )}
      </div>
    </div>
  );
}

function cssColor(name: string): string {
  const map: Record<string, string> = {
    purple: '#a855f7', blue: '#3b82f6', gray: '#6b7280', orange: '#f97316',
    green: '#22c55e', red: '#ef4444', pink: '#ec4899', yellow: '#eab308',
    black: '#111827', teal: '#14b8a6', emerald: '#10b981', rose: '#f43f5e',
    amber: '#f59e0b', cyan: '#06b6d4', slate: '#64748b',
  };
  return map[name] || '#6b7280';
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
        {tx.tags && tx.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tx.tags.map(tg => (
              <span key={tg} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">#{tg}</span>
            ))}
          </div>
        )}
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
  const { transactions, cards } = useData();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(String(Math.abs(tx.amount)));
  const [date, setDate] = useState(tx.date);
  const [category, setCategory] = useState(tx.category);
  const [type, setType] = useState<'receita' | 'despesa'>(tx.type);
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly'>(tx.recurrence || 'none');
  const [lastInvoiceMonth, setLastInvoiceMonth] = useState('');

  const card = tx.cardId ? cards.find(c => c.id === tx.cardId) : undefined;
  const parsedInstallment = tx.installmentInfo ?? parseInstallmentLabel(tx.description);
  const canAdjustInstallments = !!card && !!parsedInstallment && parsedInstallment.total > 1;

  const installmentSiblings = useMemo(() => {
    if (!parsedInstallment) return [];
    if (tx.groupId) return transactions.filter(t => t.groupId === tx.groupId);
    const base = parseInstallmentLabel(tx.description)?.base ?? tx.description;
    const amountAbs = Math.abs(tx.amount);
    return transactions.filter(t => {
      const p = parseInstallmentLabel(t.description);
      return t.cardId === tx.cardId
        && p?.total === parsedInstallment.total
        && descOverlap(p.base, base) >= 0.6
        && Math.abs(Math.abs(t.amount) - amountAbs) < 0.01;
    });
  }, [parsedInstallment, transactions, tx]);

  const installmentPreview = useMemo(() => {
    if (!canAdjustInstallments || !card || !parsedInstallment || !lastInvoiceMonth) return [];
    return installmentSiblings
      .map(sibling => {
        const meta = sibling.installmentInfo ?? parseInstallmentLabel(sibling.description);
        if (!meta) return null;
        const monthKey = addMonthsToKey(lastInvoiceMonth, meta.current - parsedInstallment.total);
        return { id: sibling.id, current: meta.current, date: invoiceAnchorDateISO(monthKey, card.closingDay), monthKey };
      })
      .filter(Boolean) as { id: string; current: number; date: string; monthKey: string }[];
  }, [canAdjustInstallments, card, parsedInstallment, lastInvoiceMonth, installmentSiblings]);

  const reopen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setDescription(tx.description);
      setAmount(String(Math.abs(tx.amount)));
      setDate(tx.date);
      setCategory(tx.category);
      setType(tx.type);
      setRecurrence(tx.recurrence || 'none');
      const meta = tx.installmentInfo ?? parseInstallmentLabel(tx.description);
      const txCard = tx.cardId ? cards.find(c => c.id === tx.cardId) : undefined;
      if (meta && txCard) {
        setLastInvoiceMonth(addMonthsToKey(invoiceMonthOf(tx.date, txCard.closingDay), meta.total - meta.current));
      } else {
        setLastInvoiceMonth('');
      }
    }
  };

  const applyInstallmentRealignment = () => {
    if (!canAdjustInstallments || !lastInvoiceMonth || installmentPreview.length === 0) return;
    installmentPreview.forEach(item => onUpdate(item.id, { date: item.date }));
    toast.success(`${installmentPreview.length} parcela${installmentPreview.length === 1 ? '' : 's'} ajustada${installmentPreview.length === 1 ? '' : 's'}`);
    setOpen(false);
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
          {canAdjustInstallments && (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
              <div className="space-y-1.5">
                <Label>Última parcela deve cair na fatura</Label>
                <Input type="month" value={lastInvoiceMonth} onChange={e => setLastInvoiceMonth(e.target.value)} />
              </div>
              {installmentPreview.length > 0 && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Vai ajustar {installmentPreview.length} parcela{installmentPreview.length === 1 ? '' : 's'}: {labelMonthKey(installmentPreview[0].monthKey)} → {labelMonthKey(installmentPreview[installmentPreview.length - 1].monthKey)}.
                </p>
              )}
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={applyInstallmentRealignment} disabled={!lastInvoiceMonth || installmentPreview.length === 0}>
                Ajustar parcelamento inteiro
              </Button>
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

function isMonthKey(value?: string | null): value is string {
  return !!value && /^\d{4}-\d{2}$/.test(value);
}

function newUuid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseInstallmentLabel(description: string) {
  const match = description.match(/\(([0-9]{1,2})\/([0-9]{1,2})\)\s*$/);
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!current || !total || current > total) return null;
  return {
    current,
    total,
    base: description.replace(/\s*\([0-9]{1,2}\/[0-9]{1,2}\)\s*$/, '').trim(),
  };
}

// Retorna uma data-âncora que, segundo invoiceMonthOf, cai NA fatura de `monthKey`.
// Usamos o próprio dia de fechamento (dia <= closingDay => mesma fatura). Isso garante
// que a parcela criada seja atribuída à fatura correta, sem deslocamento de mês.
function invoiceAnchorDateISO(monthKey: string, closingDay: number) {
  return invoiceClosingDateISO(monthKey, closingDay);
}

function statementInvoiceMonth(statement: ParsedStatement | null, card: { closingDay: number }, override?: string) {
  if (isMonthKey(override)) return override;
  if (isMonthKey(statement?.invoiceMonth)) return statement.invoiceMonth;
  const anchorDate = statement?.periodEnd || statement?.periodStart;
  if (!anchorDate) return '';
  return invoiceMonthOf(anchorDate, card.closingDay);
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
  const [invoiceMonthOverride, setInvoiceMonthOverride] = useState<string>('');
  const [setupConfirmed, setSetupConfirmed] = useState(false);

  const myCards = cards.filter(c => c.owner === owner);
  const myAccounts = accounts.filter(a => a.owner === owner);

  const isCard = destination.startsWith('card:');
  const isAccount = destination.startsWith('account:');
  const importCard = isCard ? cards.find(c => c.id === destination.slice('card:'.length)) : undefined;

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
    setInvoiceMonthOverride('');
    setSetupConfirmed(false);
    setDestination('');
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
    let invoiceMonth: string | null = null;

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
        if (isMonthKey(result.invoiceMonth) && !invoiceMonth) invoiceMonth = result.invoiceMonth;

        (result.entries ?? []).forEach(e => allEntries.push({ ...e, _sourceFile: file.name }));

        // Progresso proporcional aos arquivos processados
        setProgress(Math.min(90, 10 + Math.round(((idx + 1) / files.length) * 80)));
      }

      // Statement combinado
      const combinedStatement: ParsedStatement = {
        ...(firstStatement as ParsedStatement),
        bank: banks.size > 0 ? Array.from(banks).join(' + ') : (firstStatement?.bank ?? ''),
        statementType: statementTypeAcc ?? firstStatement?.statementType ?? 'unknown',
        invoiceMonth: invoiceMonth ?? firstStatement?.invoiceMonth ?? null,
        periodStart: periodStart ?? firstStatement?.periodStart ?? '',
        periodEnd: periodEnd ?? firstStatement?.periodEnd ?? '',
        entries: allEntries,
      };
      setStatement(combinedStatement);
      if (isMonthKey(combinedStatement.invoiceMonth)) setInvoiceMonthOverride(combinedStatement.invoiceMonth);
      setStatus('Organizando transações e detectando duplicatas…');
      setProgress(95);

      // Dedup contra existentes + entre os próprios arquivos (mesmo owner)
      const ownerTx = transactions.filter(t => t.owner === owner);
      // Também consideramos transações do outro cônjuge (fatura compartilhada / cartão do parceiro)
      const otherTx = transactions.filter(t => t.owner !== owner);
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
            const found = [...ownerTx, ...otherTx].find(t =>
              Math.abs(Math.abs(t.amount) - amt) < 0.01
              && daysBetween(t.date, expected) <= 10
              && (descOverlap(t.description, e.description) >= 0.4 || daysBetween(t.date, expected) <= 2),
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
          const pool = [...ownerTx, ...otherTx];
          const sameAmount = pool.filter(t => Math.abs(Math.abs(t.amount) - amt) < 0.01);
          for (const t of sameAmount) {
            const overlap = descOverlap(t.description, e.description);
            const days = daysBetween(t.date, e.date);
            // 1) Mesmo dia + mesmo valor => duplicata (mesmo sem sobreposição de nome).
            //    É o caso típico de reimportar a mesma fatura.
            if (days === 0) {
              match = { description: t.description, date: t.date, amount: t.amount, matchType: 'exata' };
              break;
            }
            // 2) Nome + valor (até 40 dias)
            if (overlap >= 0.5 && days <= 40) {
              match = { description: t.description, date: t.date, amount: t.amount, matchType: 'nome+valor' };
              break;
            }
            // 3) Mesmo valor e datas próximas (até 7 dias) — reimport com pequena diferença de dia
            if (days <= 7 && !match) {
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
          _sourceFile: e._sourceFile,
        };
      });

      // --- Conflitos fuzzy entre leituras (mesmo gasto extraído com pequenas divergências) ---
      // Agrupa linhas que provavelmente representam o mesmo lançamento mas divergem em
      // nome/valor/data (ex.: R$45,90 vs R$45,89, "UBER *TRIP" vs "Uber Trip"). Ignora
      // linhas já marcadas como duplicata do app (essas já têm tratamento próprio).
      const candidates = parsed.filter(r => !r._duplicate && r.type !== 'transferencia');
      for (let a = 0; a < candidates.length; a++) {
        const ra = candidates[a];
        if (ra._conflictGroup) continue;
        for (let b = a + 1; b < candidates.length; b++) {
          const rb = candidates[b];
          if (rb._conflictGroup) continue;
          if (ra._sourceFile && rb._sourceFile && ra._sourceFile === rb._sourceFile) continue; // só entre arquivos diferentes
          const amtA = Math.abs(ra.amount), amtB = Math.abs(rb.amount);
          const amtDiff = Math.abs(amtA - amtB);
          const amtPct = amtDiff / Math.max(amtA, amtB, 0.01);
          const overlap = descOverlap(ra.description, rb.description);
          const days = daysBetween(ra.date, rb.date);
          // Match "fuzzy": valor até 5% ou R$1 de diferença, sobreposição de nome ≥40%, mesmo mês
          const looksLikeSame = (amtDiff <= 1 || amtPct <= 0.05) && overlap >= 0.4 && days <= 5;
          if (looksLikeSame && !(amtDiff < 0.01 && overlap >= 0.9 && days === 0)) {
            const gid = ra._conflictGroup ?? `cf-${a}`;
            ra._conflictGroup = gid;
            rb._conflictGroup = gid;
            // Deixa apenas o primeiro marcado para importar; o outro fica pulado até o usuário escolher
            rb._import = false;
          }
        }
      }
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

  // Recomputa o plano de parcelas de uma linha, ancorando na fatura de destino.
  const computeRowPlan = (r: PdfRow): PdfRow => {
    const isTransfer = r.type === 'transferencia';
    const isParcelado = !isTransfer && r.installmentTotal && r.installmentTotal > 1 && r.installmentCurrent && r.installmentCurrent >= 1;
    if (!isParcelado) return { ...r, _installmentPlan: undefined };
    if (!statement || !destination.startsWith('card:')) return r;
    const cardId = destination.slice('card:'.length);
    const card = cards.find(c => c.id === cardId);
    if (!card) return r;
    const targetInvoiceKey = statementInvoiceMonth(statement, card, invoiceMonthOverride);
    if (!targetInvoiceKey) return r;

    const total = r.installmentTotal!;
    const current = Math.min(r.installmentCurrent!, total);
    const amt = Math.abs(r.amount);

    const plan: InstallmentSlot[] = Array.from({ length: total }, (_, k) => {
      const slotIndex = k + 1;
      const monthKey = addMonthsToKey(targetInvoiceKey, slotIndex - current);
      const expected = invoiceAnchorDateISO(monthKey, card.closingDay);
      const found = transactions.find(t =>
        Math.abs(Math.abs(t.amount) - amt) < 0.01
        && t.cardId === card.id
        && invoiceMonthOf(t.date, card.closingDay) === monthKey
        && descOverlap(t.description, r.description) >= 0.4,
      );
      return {
        index: slotIndex,
        date: expected,
        exists: !!found,
        existing: found ? { description: found.description, date: found.date, amount: found.amount } : undefined,
      };
    });
    const allExist = plan.every(s => s.exists);
    return {
      ...r,
      installmentCurrent: current,
      _installmentPlan: plan,
      _duplicate: allExist ? true : r._duplicate,
      _import: allExist ? false : r._import,
    };
  };

  const updateRow = (id: string, patch: Partial<PdfRow>) => {
    setRows(prev => {
      const target = prev.find(r => r._id === id);
      const group = target?._conflictGroup;
      // Se o usuário marcou "Importar" numa linha em conflito, desmarca as irmãs.
      const isPickingWinner = group && patch._import === true;
      const touchesInstall = 'installmentTotal' in patch || 'installmentCurrent' in patch;
      return prev.map(r => {
        if (r._id === id) {
          const merged = { ...r, ...patch };
          return touchesInstall ? computeRowPlan(merged) : merged;
        }
        if (isPickingWinner && r._conflictGroup === group) return { ...r, _import: false };
        return r;
      });
    });
  };

  // Reancorar plano de parcelas quando destino/extrato/cartões/transações mudarem.
  useEffect(() => {
    setRows(prev => prev.map(r => computeRowPlan(r)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, statement, invoiceMonthOverride, cards, transactions, owner]);



  const toImport = rows.filter(r => r._import);
  const totalImport = toImport.reduce((s, r) => s + (r.type === 'despesa' ? r.amount : 0), 0);
  const transferCount = rows.filter(r => r.type === 'transferencia').length;
  const conflictGroups = new Map<string, PdfRow[]>();
  rows.forEach(r => {
    if (!r._conflictGroup) return;
    const arr = conflictGroups.get(r._conflictGroup) ?? [];
    arr.push(r);
    conflictGroups.set(r._conflictGroup, arr);
  });

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
        const importGroupId = newUuid();
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
            groupId: importGroupId,
            installmentInfo: { current: slot.index, total },
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

          {!loading && statement && !setupConfirmed && (
            <div className="flex-1 overflow-auto space-y-4 py-2">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
                <p className="text-xs uppercase tracking-wide text-primary font-semibold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Leitura concluída
                </p>
                <p className="text-sm">
                  A IA identificou <strong>{rows.length}</strong> lançamento{rows.length === 1 ? '' : 's'}
                  {statement.bank ? <> · <strong>{statement.bank}</strong></> : null}
                  {statement.statementType === 'card' ? ' · fatura de cartão' : statement.statementType === 'account' ? ' · extrato de conta' : ''}.
                </p>
                <p className="text-xs text-muted-foreground">
                  Antes de revisar, confirme onde essas transações devem entrar. É obrigatório escolher.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <CardIcon className="h-4 w-4" /> Em qual {statement.statementType === 'account' ? 'conta' : 'cartão / conta'} devo lançar? <span className="text-rose-500">*</span>
                </Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
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
                {statement.statementType === 'card' && destination && !destination.startsWith('card:') && (
                  <p className="text-[11px] text-orange-600">A IA detectou fatura de cartão — o ideal é escolher um cartão.</p>
                )}
                {statement.statementType === 'account' && destination && !destination.startsWith('account:') && (
                  <p className="text-[11px] text-orange-600">A IA detectou extrato de conta — o ideal é escolher uma conta.</p>
                )}
              </div>

              {destination.startsWith('card:') && importCard && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    📅 Para qual fatura? <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="month"
                    className="h-11"
                    value={statementInvoiceMonth(statement, importCard, invoiceMonthOverride)}
                    onChange={e => setInvoiceMonthOverride(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ex.: fatura de julho/2026. As parcelas serão distribuídas a partir dessa fatura.
                  </p>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  disabled={
                    !destination ||
                    (destination.startsWith('card:') && !isMonthKey(statementInvoiceMonth(statement, importCard!, invoiceMonthOverride)))
                  }
                  onClick={() => setSetupConfirmed(true)}
                >
                  Continuar para revisão
                </Button>
              </DialogFooter>
            </div>
          )}

          {!loading && statement && setupConfirmed && (
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
                    {conflictGroups.size > 0 && <> · <span className="text-violet-600 dark:text-violet-400 font-medium">🔀 {conflictGroups.size} conflito{conflictGroups.size > 1 ? 's' : ''} entre leituras</span></>}
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
                  {isCard && importCard && (
                    <div className="space-y-1 pt-1">
                      <Label className="text-xs">Fatura alvo</Label>
                      <Input
                        type="month"
                        className="h-8 text-xs"
                        value={statementInvoiceMonth(statement, importCard, invoiceMonthOverride)}
                        onChange={e => setInvoiceMonthOverride(e.target.value)}
                      />
                    </div>
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

              {conflictGroups.size > 0 && (
                <div className="rounded-md border border-violet-300 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 p-2 text-[11px] leading-snug text-violet-900 dark:text-violet-200">
                  <strong>🔀 {conflictGroups.size} conflito{conflictGroups.size > 1 ? 's' : ''} entre leituras.</strong> Encontramos gastos parecidos vindos de arquivos diferentes com pequenas divergências (nome, valor ou data). Cada grupo já tem uma leitura marcada como <em>Importar</em> — clique em "Importar" na linha que preferir manter e as outras são puladas automaticamente.
                </div>
              )}

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
                      const siblings = r._conflictGroup
                        ? (conflictGroups.get(r._conflictGroup) ?? []).filter(x => x._id !== r._id)
                        : [];
                      const hasConflict = siblings.length > 0;
                      return (
                      <tr key={r._id} className={cn(
                        'border-t border-border',
                        r._duplicate && 'bg-amber-50 dark:bg-amber-950/20',
                        hasConflict && !r._duplicate && 'bg-violet-50 dark:bg-violet-950/20',
                        isTransfer && !r._duplicate && !hasConflict && 'bg-sky-50/60 dark:bg-sky-950/20',
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
                            {hasConflict && siblings.map(sib => {
                              const diffs: string[] = [];
                              if (normDesc(sib.description) !== normDesc(r.description)) diffs.push(`nome: "${sib.description}"`);
                              if (Math.abs(Math.abs(sib.amount) - Math.abs(r.amount)) >= 0.01) diffs.push(`valor: ${formatCurrency(Math.abs(sib.amount))}`);
                              if (sib.date !== r.date) diffs.push(`data: ${formatDate(sib.date)}`);
                              return (
                                <span
                                  key={sib._id}
                                  className="text-[9px] px-1 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 font-medium"
                                  title={`Divergência com "${sib._sourceFile ?? 'outra leitura'}"`}
                                >
                                  🔀 conflito com outra leitura{sib._sourceFile ? ` (${sib._sourceFile})` : ''}{diffs.length ? ` — ${diffs.join(' · ')}` : ''}
                                </span>
                              );
                            })}
                            {r._sourceFile && (
                              <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground">
                                📄 {r._sourceFile}
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
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={1}
                                  max={r.installmentTotal || 60}
                                  value={r.installmentCurrent ?? 1}
                                  onChange={e => {
                                    const v = Math.max(1, parseInt(e.target.value) || 1);
                                    updateRow(r._id, { installmentCurrent: Math.min(v, r.installmentTotal || 60) });
                                  }}
                                  className="h-6 w-10 px-1 text-[10px] text-center tabular-nums"
                                  title="Parcela atual"
                                />
                                <span className="text-[10px] text-muted-foreground">/</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={60}
                                  value={r.installmentTotal ?? 1}
                                  onChange={e => {
                                    const v = Math.max(1, Math.min(parseInt(e.target.value) || 1, 60));
                                    updateRow(r._id, { installmentTotal: v });
                                  }}
                                  className="h-6 w-10 px-1 text-[10px] text-center tabular-nums"
                                  title="Total de parcelas"
                                />
                              </div>
                              {r._installmentPlan && (() => {
                                const destCard = destination.startsWith('card:')
                                  ? cards.find(c => c.id === destination.slice('card:'.length))
                                  : undefined;
                                const monthKeyOf = (iso: string) =>
                                  destCard ? labelMonthKey(invoiceMonthOf(iso, destCard.closingDay)) : '';
                                const current = r._installmentPlan.find(s => s.index === r.installmentCurrent);
                                const exists = r._installmentPlan.filter(s => s.exists).length;
                                const missing = r._installmentPlan.length - exists;
                                return (
                                  <>
                                    {destCard && current && (
                                      <span className="text-[9px] leading-tight text-primary font-medium">
                                        Fatura {monthKeyOf(current.date)}
                                      </span>
                                    )}
                                    <span
                                      className="text-[9px] leading-tight text-muted-foreground"
                                      title={r._installmentPlan.map(s =>
                                        `${s.index}/${r.installmentTotal} ${destCard ? monthKeyOf(s.date) + ' · ' : ''}${formatDate(s.date)} ${s.exists ? '✓ já no app' : '＋ criar'}`,
                                      ).join('\n')}
                                    >
                                      {destCard && r._installmentPlan.length > 0 && (
                                        <span>
                                          {monthKeyOf(r._installmentPlan[0].date)} → {monthKeyOf(r._installmentPlan[r._installmentPlan.length - 1].date)}
                                        </span>
                                      )}
                                      {destCard && (exists > 0 || missing > 0) && <br />}
                                      {exists > 0 && (
                                        <span className="text-amber-700 dark:text-amber-400">✓{exists} já</span>
                                      )}
                                      {exists > 0 && missing > 0 && ' · '}
                                      {missing > 0 && (
                                        <span className="text-emerald-700 dark:text-emerald-400">＋{missing} criar</span>
                                      )}
                                    </span>
                                  </>
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


// ============ TagsInput: chips com autocomplete ============
function TagsInput({
  value, onChange, suggestions,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
}) {
  const [text, setText] = useState('');
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24);

  const commit = (raw: string) => {
    const t = norm(raw);
    if (!t) return;
    if (value.includes(t)) { setText(''); return; }
    onChange([...value, t]);
    setText('');
  };

  const remove = (tg: string) => onChange(value.filter(v => v !== tg));

  const hints = suggestions
    .filter(s => !value.includes(s) && (text ? s.includes(norm(text)) : true))
    .slice(0, 6);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 min-h-[24px]">
        {value.map(tg => (
          <span key={tg} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
            #{tg}
            <button type="button" onClick={() => remove(tg)} className="hover:text-rose-500">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(text); }
          else if (e.key === 'Backspace' && !text && value.length) { remove(value[value.length - 1]); }
        }}
        onBlur={() => text && commit(text)}
        placeholder="Ex.: viagem, reforma, presente (Enter para adicionar)"
        className="h-8 text-xs"
      />
      {hints.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {hints.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => commit(h)}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted hover:bg-muted-foreground/10 text-muted-foreground"
            >
              +#{h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ PayInvoiceDialog: modal de pagamento da fatura ============
function PayInvoiceDialog({
  open, onOpenChange, cardName, monthKey, total, accounts, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cardName: string;
  monthKey: string;
  total: number;
  accounts: { id: string; name: string; balance: number }[];
  onConfirm: (accountId: string, amount: number, dateISO: string) => void;
}) {
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [amount, setAmount] = useState<string>(String(total.toFixed(2)));
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setAmount(String(total.toFixed(2)));
      setDate(new Date().toISOString().slice(0, 10));
      if (!accountId && accounts[0]) setAccountId(accounts[0].id);
    }
  }, [open, total, accounts, accountId]);

  const acc = accounts.find(a => a.id === accountId);
  const amountNum = parseFloat(amount) || 0;
  const insufficient = acc && amountNum > acc.balance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Pagar fatura
          </DialogTitle>
          <DialogDescription>
            {cardName} — {labelMonthKey(monthKey)}. Vamos criar uma saída na conta escolhida.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Conta de origem</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Escolha uma conta" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    🏦 {a.name} · saldo {formatCurrency(a.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor pago</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          {insufficient && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              Saldo da conta pode ficar negativo após o pagamento.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!accountId || amountNum <= 0}
            onClick={() => onConfirm(accountId, amountNum, date)}
          >
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
