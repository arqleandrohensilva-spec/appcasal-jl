import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/lib/context';
import { useData, type UserAccount, type UserTransaction } from '@/lib/store';
import { CATEGORIES, formatCurrency } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { expandRecurring } from '@/lib/finance';
import { AlertTriangle, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import {
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  Receipt,
  Trash2,
} from 'lucide-react';
import { accentFor } from '@/lib/accent';
import { PdfImportButton } from './transacoes';


export const Route = createFileRoute('/app/extrato')({
  component: Extrato,
});

// Delta que uma transação aplica no saldo da conta (positivo = entra, negativo = sai).
function txDelta(t: UserTransaction): number {
  const amt = Math.abs(t.amount);
  return t.type === 'receita' ? amt : -amt;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function firstDayOfMonthISO(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 10);
}
function lastDayOfMonthISO(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}
function isoAddDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function labelDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

type PeriodPreset = 'mes' | 'anterior' | '30d' | '90d' | 'ano' | 'prox30' | 'prox60' | 'custom';

function accountIcon(type: UserAccount['type']) {
  switch (type) {
    case 'corrente': return Landmark;
    case 'poupanca': return Landmark;
    case 'dinheiro': return Wallet;
    case 'investimento': return TrendingUp;
    default: return Landmark;
  }
}

function Extrato() {
  const { activeProfile } = useAppContext();
  const { accounts, transactions, updateTransaction, removeTransaction } = useData();
  const a = accentFor(activeProfile);

  const visibleAccounts = useMemo(
    () => accounts.filter(acc => activeProfile === 'casal' || acc.owner === activeProfile),
    [accounts, activeProfile],
  );

  const [accountId, setAccountId] = useState<string>(visibleAccounts[0]?.id ?? '');
  const account = visibleAccounts.find(x => x.id === accountId) ?? visibleAccounts[0];

  const [preset, setPreset] = useState<PeriodPreset>('mes');
  const [customStart, setCustomStart] = useState<string>(firstDayOfMonthISO());
  const [customEnd, setCustomEnd] = useState<string>(todayISO());
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingTx = editingId ? transactions.find(t => t.id === editingId) ?? null : null;


  const { start, end } = useMemo(() => {
    switch (preset) {
      case 'mes': return { start: firstDayOfMonthISO(), end: lastDayOfMonthISO() };
      case 'anterior': return { start: firstDayOfMonthISO(-1), end: lastDayOfMonthISO(-1) };
      case '30d': return { start: isoAddDays(todayISO(), -29), end: todayISO() };
      case '90d': return { start: isoAddDays(todayISO(), -89), end: todayISO() };
      case 'prox30': return { start: todayISO(), end: isoAddDays(todayISO(), 30) };
      case 'prox60': return { start: todayISO(), end: isoAddDays(todayISO(), 60) };
      case 'ano': {
        const y = new Date().getFullYear();
        return { start: `${y}-01-01`, end: `${y}-12-31` };
      }
      case 'custom': return { start: customStart, end: customEnd };
      default: return { start: firstDayOfMonthISO(), end: lastDayOfMonthISO() };
    }
  }, [preset, customStart, customEnd]);

  // Movimentos que afetam esta conta, incluindo expansão de recorrências no range visível.
  const accountMoves = useMemo(() => {
    if (!account) return [] as UserTransaction[];
    // range amplo para cobrir período (com folga) mesmo se end > hoje
    const rangeStart = isoAddDays(start, -31);
    const rangeEnd = isoAddDays(end, 31);
    const expanded = expandRecurring(transactions, rangeStart, rangeEnd);
    return expanded
      .filter(t => t.accountId === account.id)
      .slice()
      .sort((x, y) => x.date.localeCompare(y.date) || x.createdAt.localeCompare(y.createdAt));
  }, [transactions, account, start, end]);

  // Reconstrói saldo do zero.
  // IMPORTANTE: account.balance reflete apenas movimentos JÁ REALIZADOS (data <= hoje),
  // pois é isso que o store atualiza ao criar/editar transações. Portanto o saldo
  // inicial "antes de tudo" = balance - soma(deltas realizados). Lançamentos futuros
  // continuam aparecendo no extrato, mas não deslocam o saldo atual.
  const runningRows = useMemo(() => {
    if (!account) return [] as { tx: UserTransaction; running: number; delta: number }[];
    const todayISO = new Date().toISOString().slice(0, 10);
    const realizedDelta = accountMoves
      .filter(t => t.date <= todayISO)
      .reduce((s, t) => s + txDelta(t), 0);
    let running = account.balance - realizedDelta; // saldo antes do primeiro movimento
    return accountMoves.map(tx => {
      const delta = txDelta(tx);
      running += delta;
      return { tx, running, delta };
    });
  }, [accountMoves, account]);

  // Filtra pelo período (inclusivo).
  const periodRows = useMemo(
    () => runningRows.filter(r => r.tx.date >= start && r.tx.date <= end),
    [runningRows, start, end],
  );

  // Saldo inicial do período = saldo anterior à primeira linha do período.
  const openingBalance = useMemo(() => {
    if (!account) return 0;
    const before = runningRows.filter(r => r.tx.date < start);
    if (before.length === 0) {
      const todayISO = new Date().toISOString().slice(0, 10);
      const realizedDelta = accountMoves
        .filter(t => t.date <= todayISO)
        .reduce((s, t) => s + txDelta(t), 0);
      return account.balance - realizedDelta;
    }
    return before[before.length - 1].running;
  }, [runningRows, accountMoves, account, start]);


  // Filtro busca (apenas exibição — saldo corrente permanece o real).
  const q = search.trim().toLowerCase();
  const displayRows = q
    ? periodRows.filter(r =>
        r.tx.description.toLowerCase().includes(q) ||
        r.tx.category.toLowerCase().includes(q),
      )
    : periodRows;

  const entradas = periodRows.filter(r => r.delta > 0).reduce((s, r) => s + r.delta, 0);
  const saidas = periodRows.filter(r => r.delta < 0).reduce((s, r) => s + Math.abs(r.delta), 0);
  const closingBalance = openingBalance + (entradas - saidas);

  // Agrupa por dia (mais recente primeiro), mantendo saldo corrente correto.
  const byDay = useMemo(() => {
    const map = new Map<string, typeof displayRows>();
    for (const r of displayRows) {
      const arr = map.get(r.tx.date) ?? [];
      arr.push(r);
      map.set(r.tx.date, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, rows]) => ({
        date,
        rows: rows.slice().sort((x, y) => y.tx.createdAt.localeCompare(x.tx.createdAt)),
        dayIn: rows.filter(r => r.delta > 0).reduce((s, r) => s + r.delta, 0),
        dayOut: rows.filter(r => r.delta < 0).reduce((s, r) => s + Math.abs(r.delta), 0),
        // saldo no fim do dia = maior running do dia (ordem cronológica).
        endBalance: rows[rows.length - 1]?.running ?? 0,
      }));
  }, [displayRows]);

  const exportCSV = () => {
    if (!account) return;
    const header = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Saldo'];
    const lines = periodRows.map(r => [
      r.tx.date,
      r.tx.description.replace(/[";\n]/g, ' '),
      r.tx.category,
      r.delta > 0 ? 'Entrada' : 'Saída',
      r.delta.toFixed(2).replace('.', ','),
      r.running.toFixed(2).replace('.', ','),
    ]);
    const csv = [header, ...lines].map(row => row.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrato-${account.name}-${start}_a_${end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!account) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 40;
    const brFmt = (n: number) => formatCurrency(n);
    const dFmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Extrato', marginX, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(`${account.name} · ${account.type}`, marginX, 66);
    doc.text(`Período: ${dFmt(start)} — ${dFmt(end)}`, marginX, 80);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageW - marginX, 80, { align: 'right' });

    // Resumo
    doc.setDrawColor(230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, 96, pageW - marginX * 2, 60, 6, 6, 'FD');
    const boxW = (pageW - marginX * 2) / 4;
    const rows = [
      ['Saldo inicial', brFmt(openingBalance), [17, 24, 39]],
      ['Entradas', brFmt(entradas), [5, 150, 105]],
      ['Saídas', brFmt(saidas), [225, 29, 72]],
      ['Saldo final', brFmt(closingBalance), [17, 24, 39]],
    ] as const;
    rows.forEach((r, i) => {
      const x = marginX + boxW * i + 12;
      doc.setTextColor(110);
      doc.setFontSize(9);
      doc.text(r[0], x, 116);
      doc.setTextColor(r[2][0], r[2][1], r[2][2]);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(r[1], x, 138);
      doc.setFont('helvetica', 'normal');
    });

    // Tabela
    const body = periodRows.map(r => [
      dFmt(r.tx.date),
      r.tx.description,
      r.tx.category,
      r.delta > 0 ? 'Entrada' : 'Saída',
      { content: (r.delta > 0 ? '+ ' : '− ') + brFmt(Math.abs(r.delta)), styles: { halign: 'right', textColor: r.delta > 0 ? [5, 150, 105] : [225, 29, 72] } },
      { content: brFmt(r.running), styles: { halign: 'right' } },
    ]);

    autoTable(doc, {
      startY: 176,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Saldo']],
      body: body as never,
      styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 62 },
        2: { cellWidth: 82 },
        3: { cellWidth: 50 },
        4: { cellWidth: 78, halign: 'right' },
        5: { cellWidth: 78, halign: 'right' },
      },
      margin: { left: marginX, right: marginX },
      didDrawPage: () => {
        const pageH = doc.internal.pageSize.getHeight();
        const pageNo = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${pageNo}`, pageW - marginX, pageH - 20, { align: 'right' });
        doc.text('Gerado pelo seu app financeiro', marginX, pageH - 20);
      },
    });

    doc.save(`extrato-${account.name}-${start}_a_${end}.pdf`);
  };

  if (visibleAccounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <Landmark className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
        <h1 className="text-2xl font-bold">Extrato</h1>
        <p className="text-muted-foreground">Cadastre uma conta em <strong>Contas</strong> para começar a ver seu extrato.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={cn('flex items-center gap-2 text-sm font-medium mb-1', a.text)}>
            <Receipt className="h-4 w-4" /> Extrato
          </div>
          <h1 className="text-2xl font-bold">Movimentações da conta</h1>
          <p className="text-muted-foreground text-sm">
            Como no seu banco: cada entrada, saída e transferência com o saldo evoluindo linha por linha.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {account && (
            <PdfImportButton
              owner={account.owner === 'jonathan' ? 'jonathan' : 'leandro'}
              defaultDestination={`account:${account.id}`}
              triggerLabel="Importar extrato do banco"
              triggerClassName="gap-2 h-9"
            />
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportPDF}>
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </header>

      {/* Seletor de conta */}
      <div className="flex flex-wrap gap-2">
        {visibleAccounts.map(acc => {
          const Icon = accountIcon(acc.type);
          const active = acc.id === accountId;
          return (
            <button
              key={acc.id}
              onClick={() => setAccountId(acc.id)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition',
                active
                  ? cn(a.border, a.bgSoft, 'ring-2', a.ring ?? 'ring-primary/30')
                  : 'border-border bg-card hover:bg-muted/40',
              )}
            >
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', active ? a.bg : 'bg-muted')}>
                <Icon className={cn('h-4 w-4', active ? 'text-white' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{acc.name}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {acc.type} · {formatCurrency(acc.balance)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtro período */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          ['mes', 'Este mês'],
          ['anterior', 'Mês passado'],
          ['30d', 'Últimos 30d'],
          ['90d', 'Últimos 90d'],
          ['prox30', 'Próximos 30d'],
          ['prox60', 'Próximos 60d'],
          ['ano', 'Este ano'],
          ['custom', 'Personalizado'],
        ] as const).map(([k, label]) => (
          <Button
            key={k}
            size="sm"
            variant={preset === k ? 'default' : 'outline'}
            className={cn('h-8 text-xs', preset === k && cn(a.bg, a.bgHover))}
            onClick={() => setPreset(k)}
          >
            {label}
          </Button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 w-[140px]" />
            <span className="text-muted-foreground">até</span>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 w-[140px]" />
          </div>
        )}
        <div className="ml-auto relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar descrição ou categoria"
            className="h-8 pl-8 w-[240px] text-xs"
          />
        </div>
      </div>

      {/* Resumo do período */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Saldo atual"
          value={account?.balance ?? 0}
          icon={Landmark}
          hint="hoje, igual ao banco"
          bold
        />

        <SummaryCard label="Entradas" value={entradas} icon={ArrowDownLeft} tone="pos" />
        <SummaryCard label="Saídas" value={saidas} icon={ArrowUpRight} tone="neg" />
        <SummaryCard
          label="Saldo previsto no fim"
          value={closingBalance}
          icon={TrendingUp}
          hint={`inclui futuros até ${new Date(end + 'T00:00:00').toLocaleDateString('pt-BR')}`}
          bold
        />

      </div>

      {/* Alerta de saldo negativo */}
      {(() => {
        const todayStr = todayISO();
        const negFuture = byDay.filter(d => d.date >= todayStr && d.endBalance < 0);
        if (negFuture.length === 0) return null;
        const first = negFuture[negFuture.length - 1]; // byDay é ordenado desc; o "primeiro no tempo" é o último aqui
        return (
          <div className="flex items-start gap-2 rounded-lg border border-rose-300/60 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/60 px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="text-rose-800 dark:text-rose-200">
              Atenção: com os lançamentos previstos, o saldo dessa conta fica <strong>negativo em {negFuture.length} {negFuture.length === 1 ? 'dia' : 'dias'}</strong>.
              A partir de <strong>{labelDate(first.date)}</strong> — saldo previsto <strong className="tabular-nums">{formatCurrency(first.endBalance)}</strong>.
            </div>
          </div>
        );
      })()}

      {/* Extrato */}
      {byDay.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">
              Nenhuma movimentação nessa conta neste período.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {byDay.map(day => {
            const isFuture = day.date > todayISO();
            const negative = day.endBalance < 0;
            return (
            <div key={day.date}>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mb-1.5">
                <span className="font-semibold uppercase tracking-wide flex items-center gap-2">
                  {labelDate(day.date)}
                  {isFuture && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground normal-case tracking-normal">
                      previsto
                    </span>
                  )}
                </span>
                <span>
                  Saldo do dia: <strong className={cn('tabular-nums', negative ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>{formatCurrency(day.endBalance)}</strong>
                </span>
              </div>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {day.rows.map(({ tx, running, delta }) => {
                    const isTransfer = tx.category === 'Transferência' || tx.paymentMethod === 'Transferência';
                    const positive = delta > 0;
                    const Icon = isTransfer ? ArrowLeftRight : positive ? ArrowDownLeft : ArrowUpRight;
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setEditingId(tx.id)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none transition-colors"
                      >
                        <div className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                          isTransfer
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                            : positive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                              {tx.category}
                            </Badge>
                            {isTransfer && (
                              <span className="text-[10px] text-sky-600 dark:text-sky-400">Transferência entre contas</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            'text-sm font-semibold tabular-nums',
                            positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                          )}>
                            {positive ? '+' : '−'} {formatCurrency(Math.abs(delta))}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            saldo {formatCurrency(running)}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                </CardContent>
              </Card>
              <div className="flex items-center justify-end gap-4 text-[11px] text-muted-foreground mt-1 px-1">
                {day.dayIn > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" /> {formatCurrency(day.dayIn)}
                  </span>
                )}
                {day.dayOut > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-rose-500" /> {formatCurrency(day.dayOut)}
                  </span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <EditTxInlineDialog
        tx={editingTx}
        accounts={visibleAccounts}
        onClose={() => setEditingId(null)}
        onSave={(patch) => {
          if (!editingTx) return;
          updateTransaction(editingTx.id, patch);
          toast.success('Transação atualizada');
          setEditingId(null);
        }}
        onDelete={(removeGroup) => {
          if (!editingTx) return;
          removeTransaction(editingTx.id, removeGroup);
          toast.success(removeGroup ? 'Grupo removido' : 'Transação removida');
          setEditingId(null);
        }}
      />
    </div>
  );
}

function EditTxInlineDialog({
  tx, accounts, onClose, onSave, onDelete,
}: {
  tx: UserTransaction | null;
  accounts: UserAccount[];
  onClose: () => void;
  onSave: (patch: Partial<UserTransaction>) => void;
  onDelete: (removeGroup?: boolean) => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [accountId, setAccountId] = useState<string>('');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setDescription(tx.description);
    setAmount(String(Math.abs(tx.amount)));
    setDate(tx.date);
    setCategory(tx.category);
    setType(tx.type);
    setAccountId(tx.accountId ?? '');
    setConfirmDel(false);
  }, [tx]);

  if (!tx) return null;
  const isInstallment = !!tx.groupId;

  const save = () => {
    const v = parseFloat(amount);
    if (!description.trim() || !v || v <= 0) {
      toast.error('Descrição e valor são obrigatórios');
      return;
    }
    onSave({
      description: description.trim(),
      amount: v,
      date,
      category,
      type,
      accountId: accountId || undefined,
    });
  };

  return (
    <Dialog open={!!tx} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
          {isInstallment && (
            <DialogDescription>
              Parcela {tx.installmentInfo?.current}/{tx.installmentInfo?.total} — a alteração afeta somente esta parcela.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={type === 'despesa' ? 'default' : 'outline'}
              className={type === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : ''}
              onClick={() => setType('despesa')}>Saída</Button>
            <Button type="button" variant={type === 'receita' ? 'default' : 'outline'}
              className={type === 'receita' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setType('receita')}>Entrada</Button>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          {confirmDel ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancelar</Button>
              {isInstallment && (
                <Button variant="destructive" size="sm" onClick={() => onDelete(true)}>
                  Excluir todas as parcelas
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => onDelete(false)}>
                {isInstallment ? 'Só esta parcela' : 'Confirmar exclusão'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 gap-2"
              onClick={() => setConfirmDel(true)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SummaryCard({
  label, value, icon: Icon, hint, tone, bold,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: 'pos' | 'neg';
  bold?: boolean;
}) {
  const color =
    tone === 'pos' ? 'text-emerald-600 dark:text-emerald-400' :
    tone === 'neg' ? 'text-rose-600 dark:text-rose-400' :
    'text-foreground';
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className={cn('mt-1 tabular-nums', bold ? 'text-xl font-bold' : 'text-lg font-semibold', color)}>
          {formatCurrency(value)}
        </p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}
