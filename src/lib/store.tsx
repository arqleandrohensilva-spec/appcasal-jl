import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth';
import type { UserProfile } from './context';

export interface PaidInvoiceInfo {
  paidAt: string;
  accountId: string;
  amount: number;
  txId?: string;
}

export interface UserCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  owner: UserProfile;
  paidInvoices?: Record<string, PaidInvoiceInfo>;
}

export interface UserAccount {
  id: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'dinheiro' | 'investimento';
  balance: number;
  owner: UserProfile;
}

export type Recurrence = 'none' | 'weekly' | 'monthly';

export interface UserTransaction {
  id: string;
  groupId?: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: string;
  cardId?: string;
  accountId?: string;
  installmentInfo?: { current: number; total: number };
  type: 'receita' | 'despesa';
  owner: UserProfile;
  createdAt: string;
  recurrence?: Recurrence;
  recurrenceEndDate?: string;
  /** Dias da semana em que repete (0=Dom … 6=Sáb). Só usado quando recurrence === 'weekly'. */
  recurrenceWeekdays?: number[];
  /** Intervalo em dias entre ocorrências. Só usado quando recurrence === 'weekly'. */
  recurrenceIntervalDays?: number;
  tags?: string[];
}

export interface UserGoal {
  id: string;
  name: string;
  target: number;
  deadline: string;
  owner: UserProfile;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  owner: UserProfile;
  note?: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  owner: UserProfile;
}

interface DataContextType {
  cards: UserCard[];
  accounts: UserAccount[];
  transactions: UserTransaction[];
  goals: UserGoal[];
  contributions: GoalContribution[];
  budgets: Budget[];
  ready: boolean;
  addCard: (c: Omit<UserCard, 'id'>) => void;
  updateCard: (id: string, patch: Partial<Omit<UserCard, 'id'>>) => void;
  removeCard: (id: string) => void;
  addAccount: (a: Omit<UserAccount, 'id'>) => void;
  updateAccount: (id: string, patch: Partial<Omit<UserAccount, 'id'>>) => void;
  removeAccount: (id: string) => void;
  addTransaction: (input: {
    groupId?: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    paymentMethod: string;
    cardId?: string;
    accountId?: string;
    installmentInfo?: { current: number; total: number };
    installments?: number;
    type: 'receita' | 'despesa';
    owner: UserProfile;
    recurrence?: Recurrence;
    recurrenceEndDate?: string;
    recurrenceWeekdays?: number[];
    recurrenceIntervalDays?: number;
    tags?: string[];
  }) => number;
  updateTransaction: (id: string, patch: Partial<{
    description: string;
    amount: number;
    date: string;
    category: string;
    paymentMethod: string;
    cardId?: string;
    accountId?: string;
    type: 'receita' | 'despesa';
    recurrence: Recurrence;
    recurrenceEndDate?: string;
    recurrenceWeekdays?: number[];
    recurrenceIntervalDays?: number;
    tags: string[];
  }>) => void;
  markInvoicePaid: (cardId: string, monthKey: string, accountId: string, amount: number, dateISO: string) => void;
  unmarkInvoicePaid: (cardId: string, monthKey: string) => void;
  removeTransaction: (id: string, removeGroup?: boolean) => void;
  addGoal: (g: Omit<UserGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<Omit<UserGoal, 'id' | 'createdAt'>>) => void;
  removeGoal: (id: string) => void;
  contributeGoal: (input: Omit<GoalContribution, 'id'>) => void;
  removeContribution: (id: string) => void;
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, patch: Partial<Omit<Budget, 'id'>>) => void;
  removeBudget: (id: string) => void;
  resetAll: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
  ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ============ Row mappers ============
type DbCard = { id: string; name: string; card_limit: number | string; closing_day: number; due_day: number; color: string; owner: UserProfile; paid_invoices: Record<string, PaidInvoiceInfo> | null };
type DbAccount = { id: string; name: string; type: UserAccount['type']; balance: number | string; owner: UserProfile };
type DbTransaction = {
  id: string; group_id: string | null; description: string; amount: number | string; date: string;
  category: string; payment_method: string; card_id: string | null; account_id: string | null;
  installment_current: number | null; installment_total: number | null; type: 'receita' | 'despesa';
  owner: UserProfile; recurrence: Recurrence | null; recurrence_end_date: string | null; created_at: string;
  tags: string[] | null;
  recurrence_weekdays: number[] | null;
  recurrence_interval_days: number | null;
};
type DbGoal = { id: string; name: string; target: number | string; deadline: string | null; owner: UserProfile; created_at: string };
type DbContrib = { id: string; goal_id: string; amount: number | string; date: string; owner: UserProfile; note: string | null };
type DbBudget = { id: string; category: string; monthly_limit: number | string; owner: UserProfile };

const num = (v: number | string) => typeof v === 'string' ? parseFloat(v) : v;

const mapCard = (r: DbCard): UserCard => ({ id: r.id, name: r.name, limit: num(r.card_limit), closingDay: r.closing_day, dueDay: r.due_day, color: r.color, owner: r.owner, paidInvoices: r.paid_invoices ?? undefined });
const mapAccount = (r: DbAccount): UserAccount => ({ id: r.id, name: r.name, type: r.type, balance: num(r.balance), owner: r.owner });
const mapTx = (r: DbTransaction): UserTransaction => ({
  id: r.id, groupId: r.group_id ?? undefined, description: r.description, amount: num(r.amount),
  date: r.date, category: r.category, paymentMethod: r.payment_method,
  cardId: r.card_id ?? undefined, accountId: r.account_id ?? undefined,
  installmentInfo: r.installment_current && r.installment_total ? { current: r.installment_current, total: r.installment_total } : undefined,
  type: r.type, owner: r.owner, createdAt: r.created_at,
  recurrence: r.recurrence ?? undefined, recurrenceEndDate: r.recurrence_end_date ?? undefined,
  recurrenceWeekdays: r.recurrence_weekdays ?? undefined,
  recurrenceIntervalDays: r.recurrence_interval_days ?? undefined,
  tags: r.tags ?? undefined,
});
const mapGoal = (r: DbGoal): UserGoal => ({ id: r.id, name: r.name, target: num(r.target), deadline: r.deadline ?? '', owner: r.owner, createdAt: r.created_at });
const mapContrib = (r: DbContrib): GoalContribution => ({ id: r.id, goalId: r.goal_id, amount: num(r.amount), date: r.date, owner: r.owner, note: r.note ?? undefined });
const mapBudget = (r: DbBudget): Budget => ({ id: r.id, category: r.category, monthlyLimit: num(r.monthly_limit), owner: r.owner });

const LEGACY_KEYS = ['financasduo:data:v3', 'financasduo:data:v2'];

export function DataProvider({ children }: { children: ReactNode }) {
  const { workspace, user } = useAuth();
  const wsId = workspace?.id ?? null;

  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const migrationOfferedRef = useRef(false);

  const refetchAll = useCallback(async (id: string) => {
    const [c, a, t, g, ct, b] = await Promise.all([
      supabase.from('cards').select('*').eq('workspace_id', id),
      supabase.from('accounts').select('*').eq('workspace_id', id),
      supabase.from('transactions').select('*').eq('workspace_id', id).order('date', { ascending: false }),
      supabase.from('goals').select('*').eq('workspace_id', id),
      supabase.from('goal_contributions').select('*').eq('workspace_id', id),
      supabase.from('budgets').select('*').eq('workspace_id', id),
    ]);
    if (c.data) setCards(c.data.map(mapCard as any));
    if (a.data) setAccounts(a.data.map(mapAccount as any));
    if (t.data) setTransactions(t.data.map(mapTx as any));
    if (g.data) setGoals(g.data.map(mapGoal as any));
    if (ct.data) setContributions(ct.data.map(mapContrib as any));
    if (b.data) setBudgets(b.data.map(mapBudget as any));
  }, []);

  // Initial load + realtime subscription per workspace
  useEffect(() => {
    if (!wsId) {
      setCards([]); setAccounts([]); setTransactions([]); setGoals([]); setContributions([]); setBudgets([]);
      setReady(!user); return;
    }
    setReady(false);
    refetchAll(wsId).then(() => setReady(true));

    const tables = ['cards', 'accounts', 'transactions', 'goals', 'goal_contributions', 'budgets'];
    const channel = supabase.channel(`ws-${wsId}`);
    tables.forEach(tbl => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl, filter: `workspace_id=eq.${wsId}` }, () => {
        refetchAll(wsId);
      });
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wsId, refetchAll, user]);

  // Offer one-time migration of legacy localStorage data
  useEffect(() => {
    if (!ready || !wsId || migrationOfferedRef.current) return;
    if (typeof window === 'undefined') return;
    migrationOfferedRef.current = true;
    let raw: string | null = null;
    for (const k of LEGACY_KEYS) {
      try { const v = localStorage.getItem(k); if (v) { raw = v; break; } } catch {}
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const hasContent = (parsed.transactions?.length || parsed.cards?.length || parsed.accounts?.length || parsed.goals?.length);
      if (!hasContent) return;
      // Skip if cloud already has data
      if (transactions.length + cards.length + accounts.length + goals.length > 0) {
        try { LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); } catch {}
        return;
      }
      toast('Encontramos dados salvos neste dispositivo', {
        description: 'Quer migrá-los para a nuvem? Eles ficam acessíveis nos dois usuários.',
        duration: 15000,
        action: {
          label: 'Migrar',
          onClick: async () => {
            await migrateLegacy(wsId, parsed);
            try { LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); } catch {}
            await refetchAll(wsId);
            toast.success('Dados migrados para a nuvem!');
          },
        },
        cancel: { label: 'Descartar', onClick: () => { try { LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); } catch {} } },
      });
    } catch {}
  }, [ready, wsId, transactions.length, cards.length, accounts.length, goals.length, refetchAll]);

  const guard = () => {
    if (!wsId) { toast.error('Workspace não carregado'); return false; }
    return true;
  };

  // ============ CARDS ============
  const addCard: DataContextType['addCard'] = (c) => {
    if (!guard()) return;
    const id = uid();
    setCards(prev => [...prev, { ...c, id }]);
    supabase.from('cards').insert({ id, workspace_id: wsId!, name: c.name, card_limit: c.limit, closing_day: c.closingDay, due_day: c.dueDay, color: c.color, owner: c.owner })
      .then(({ error }) => { if (error) { toast.error('Erro ao salvar cartão'); refetchAll(wsId!); } });
  };
  const updateCard: DataContextType['updateCard'] = (id, patch) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.limit !== undefined) dbPatch.card_limit = patch.limit;
    if (patch.closingDay !== undefined) dbPatch.closing_day = patch.closingDay;
    if (patch.dueDay !== undefined) dbPatch.due_day = patch.dueDay;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.owner !== undefined) dbPatch.owner = patch.owner;
    supabase.from('cards').update(dbPatch).eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const removeCard: DataContextType['removeCard'] = (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
    supabase.from('cards').delete().eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };

  // ============ ACCOUNTS ============
  const addAccount: DataContextType['addAccount'] = (a) => {
    if (!guard()) return;
    const id = uid();
    setAccounts(prev => [...prev, { ...a, id }]);
    supabase.from('accounts').insert({ id, workspace_id: wsId!, name: a.name, type: a.type, balance: a.balance, owner: a.owner })
      .then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const updateAccount: DataContextType['updateAccount'] = (id, patch) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
    supabase.from('accounts').update(patch as any).eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const removeAccount: DataContextType['removeAccount'] = (id) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    supabase.from('accounts').delete().eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };

  // ============ TRANSACTIONS ============
  const addTransaction: DataContextType['addTransaction'] = (input) => {
    if (!guard()) return 0;
    const n = Math.max(1, Math.min(input.installments || 1, 60));
    const groupId = input.groupId ?? (n > 1 ? uid() : null);
    const valuePerInstallment = input.amount / n;
    const sign = input.type === 'receita' ? 1 : -1;
    const todayISO = new Date().toISOString().slice(0, 10);
    const recurrence = input.recurrence && input.recurrence !== 'none' ? input.recurrence : undefined;
    const createdAt = new Date().toISOString();

    const created: UserTransaction[] = Array.from({ length: n }, (_, i) => ({
      id: uid(),
      groupId: groupId ?? undefined,
      description: input.installmentInfo ? input.description : (n > 1 ? `${input.description} (${i + 1}/${n})` : input.description),
      amount: sign * Math.abs(valuePerInstallment),
      date: addMonths(input.date, i),
      category: input.category,
      paymentMethod: input.paymentMethod,
      cardId: input.cardId,
      accountId: input.accountId,
      installmentInfo: input.installmentInfo ?? (n > 1 ? { current: i + 1, total: n } : undefined),
      type: input.type,
      owner: input.owner,
      createdAt,
      recurrence: n === 1 ? recurrence : undefined,
      recurrenceEndDate: n === 1 ? input.recurrenceEndDate : undefined,
      recurrenceWeekdays: n === 1 && recurrence === 'weekly' && input.recurrenceWeekdays && input.recurrenceWeekdays.length
        ? input.recurrenceWeekdays : undefined,
      recurrenceIntervalDays: n === 1 && recurrence === 'weekly' && input.recurrenceIntervalDays && input.recurrenceIntervalDays > 0
        ? input.recurrenceIntervalDays : undefined,
      tags: input.tags && input.tags.length ? input.tags : undefined,
    }));

    setTransactions(prev => [...created, ...prev]);

    const rows = created.map(t => ({
      id: t.id, workspace_id: wsId!, group_id: t.groupId ?? null,
      description: t.description, amount: t.amount, date: t.date,
      category: t.category, payment_method: t.paymentMethod,
      card_id: t.cardId ?? null, account_id: t.accountId ?? null,
      installment_current: t.installmentInfo?.current ?? null,
      installment_total: t.installmentInfo?.total ?? null,
      type: t.type, owner: t.owner, pessoa: t.owner,
      recurrence: t.recurrence ?? null,
      recurrence_end_date: t.recurrenceEndDate ?? null,
      tags: t.tags ?? [],
    }));
    supabase.from('transactions').insert(rows).then(({ error }) => {
      if (error) { toast.error('Erro ao salvar transação'); refetchAll(wsId!); }
    });

    if (input.accountId) {
      const realizedDelta = created
        .filter(t => !t.cardId && t.date <= todayISO)
        .reduce((s, t) => s + t.amount, 0);
      if (realizedDelta !== 0) {
        const acc = accounts.find(a => a.id === input.accountId);
        if (acc) {
          const newBal = acc.balance + realizedDelta;
          setAccounts(prev => prev.map(a => a.id === input.accountId ? { ...a, balance: newBal } : a));
          supabase.from('accounts').update({ balance: newBal }).eq('id', input.accountId);
        }
      }
    }
    return n;
  };

  const updateTransaction: DataContextType['updateTransaction'] = (id, patch) => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    const nextType = patch.type ?? target.type;
    const sign = nextType === 'receita' ? 1 : -1;
    const nextAmountAbs = patch.amount !== undefined ? Math.abs(patch.amount) : Math.abs(target.amount);
    const next: UserTransaction = { ...target, ...patch, amount: sign * nextAmountAbs, type: nextType };
    setTransactions(prev => prev.map(t => t.id === id ? next : t));

    const wasRealized = !target.cardId && target.accountId && target.date <= todayISO;
    const willBeRealized = !next.cardId && next.accountId && next.date <= todayISO;
    if (wasRealized || willBeRealized) {
      const updates = new Map<string, number>();
      if (wasRealized && target.accountId) updates.set(target.accountId, (updates.get(target.accountId) || 0) - target.amount);
      if (willBeRealized && next.accountId) updates.set(next.accountId, (updates.get(next.accountId) || 0) + next.amount);
      setAccounts(prev => prev.map(a => {
        const d = updates.get(a.id);
        if (!d) return a;
        const newBal = a.balance + d;
        supabase.from('accounts').update({ balance: newBal }).eq('id', a.id);
        return { ...a, balance: newBal };
      }));
    }

    const dbPatch: any = {
      description: next.description, amount: next.amount, date: next.date,
      category: next.category, payment_method: next.paymentMethod,
      card_id: next.cardId ?? null, account_id: next.accountId ?? null,
      type: next.type, owner: next.owner, pessoa: next.owner,
      recurrence: next.recurrence ?? null, recurrence_end_date: next.recurrenceEndDate ?? null,
    };
    if (patch.tags !== undefined) dbPatch.tags = next.tags ?? [];
    supabase.from('transactions').update(dbPatch).eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };

  // ============ INVOICE PAYMENT ============
  const markInvoicePaid: DataContextType['markInvoicePaid'] = (cardId, monthKey, accountId, amount, dateISO) => {
    if (!guard()) return;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const acc = accounts.find(a => a.id === accountId);
    // Cria transação de pagamento de fatura na conta
    const txId = uid();
    const desc = `Pagamento fatura ${card.name} — ${monthKey}`;
    const method = acc?.name || 'Conta';
    const tx: UserTransaction = {
      id: txId,
      description: desc,
      amount: -Math.abs(amount),
      date: dateISO,
      category: 'Pagamento de fatura',
      paymentMethod: method,
      accountId,
      type: 'despesa',
      owner: card.owner,
      createdAt: new Date().toISOString(),
      tags: ['fatura', card.name.toLowerCase()],
    };
    setTransactions(prev => [tx, ...prev]);
    supabase.from('transactions').insert({
      id: txId, workspace_id: wsId!, group_id: null,
      description: tx.description, amount: tx.amount, date: tx.date,
      category: tx.category, payment_method: tx.paymentMethod,
      card_id: null, account_id: accountId,
      installment_current: null, installment_total: null,
      type: tx.type, owner: tx.owner, pessoa: tx.owner,
      recurrence: null, recurrence_end_date: null,
      tags: tx.tags ?? [],
    }).then(({ error }) => { if (error) { toast.error('Erro ao registrar pagamento'); refetchAll(wsId!); } });

    // Atualiza saldo da conta se data <= hoje
    const todayISO = new Date().toISOString().slice(0, 10);
    if (acc && dateISO <= todayISO) {
      const newBal = acc.balance - Math.abs(amount);
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: newBal } : a));
      supabase.from('accounts').update({ balance: newBal }).eq('id', accountId);
    }

    // Marca paid_invoices no cartão
    const nextPaid: Record<string, PaidInvoiceInfo> = {
      ...(card.paidInvoices || {}),
      [monthKey]: { paidAt: dateISO, accountId, amount: Math.abs(amount), txId },
    };
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, paidInvoices: nextPaid } : c));
    supabase.from('cards').update({ paid_invoices: nextPaid } as any).eq('id', cardId)
      .then(({ error }) => { if (error) refetchAll(wsId!); });
    toast.success('Fatura marcada como paga!');
  };

  const unmarkInvoicePaid: DataContextType['unmarkInvoicePaid'] = (cardId, monthKey) => {
    if (!guard()) return;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const info = card.paidInvoices?.[monthKey];
    if (!info) return;
    // Remove transação vinculada, se houver
    if (info.txId) {
      removeTransaction(info.txId);
    }
    const nextPaid = { ...(card.paidInvoices || {}) };
    delete nextPaid[monthKey];
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, paidInvoices: nextPaid } : c));
    supabase.from('cards').update({ paid_invoices: nextPaid } as any).eq('id', cardId)
      .then(({ error }) => { if (error) refetchAll(wsId!); });
    toast.success('Pagamento estornado.');
  };

  const removeTransaction: DataContextType['removeTransaction'] = (id, removeGroup) => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    const toRemove = removeGroup && target.groupId
      ? transactions.filter(t => t.groupId === target.groupId)
      : [target];

    const revertByAccount = new Map<string, number>();
    for (const t of toRemove) {
      if (t.accountId && !t.cardId && t.date <= todayISO) {
        revertByAccount.set(t.accountId, (revertByAccount.get(t.accountId) || 0) - t.amount);
      }
    }
    const ids = new Set(toRemove.map(t => t.id));
    setTransactions(prev => prev.filter(t => !ids.has(t.id)));

    if (revertByAccount.size > 0) {
      setAccounts(prev => prev.map(a => {
        const d = revertByAccount.get(a.id);
        if (!d) return a;
        const newBal = a.balance + d;
        supabase.from('accounts').update({ balance: newBal }).eq('id', a.id);
        return { ...a, balance: newBal };
      }));
    }

    supabase.from('transactions').delete().in('id', Array.from(ids)).then(({ error }) => { if (error) refetchAll(wsId!); });
  };

  // ============ GOALS ============
  const addGoal: DataContextType['addGoal'] = (g) => {
    if (!guard()) return;
    const id = uid();
    const created = { ...g, id, createdAt: new Date().toISOString() };
    setGoals(prev => [...prev, created]);
    supabase.from('goals').insert({ id, workspace_id: wsId!, name: g.name, target: g.target, deadline: g.deadline || null, owner: g.owner })
      .then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const updateGoal: DataContextType['updateGoal'] = (id, patch) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.target !== undefined) dbPatch.target = patch.target;
    if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline || null;
    if (patch.owner !== undefined) dbPatch.owner = patch.owner;
    supabase.from('goals').update(dbPatch).eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const removeGoal: DataContextType['removeGoal'] = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    setContributions(prev => prev.filter(c => c.goalId !== id));
    supabase.from('goals').delete().eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const contributeGoal: DataContextType['contributeGoal'] = (input) => {
    if (!guard()) return;
    const id = uid();
    setContributions(prev => [...prev, { ...input, id }]);
    supabase.from('goal_contributions').insert({ id, workspace_id: wsId!, goal_id: input.goalId, amount: input.amount, date: input.date, owner: input.owner, note: input.note ?? null })
      .then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const removeContribution: DataContextType['removeContribution'] = (id) => {
    setContributions(prev => prev.filter(c => c.id !== id));
    supabase.from('goal_contributions').delete().eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };

  // ============ BUDGETS ============
  const addBudget: DataContextType['addBudget'] = (b) => {
    if (!guard()) return;
    const id = uid();
    setBudgets(prev => [...prev, { ...b, id }]);
    supabase.from('budgets').insert({ id, workspace_id: wsId!, category: b.category, monthly_limit: b.monthlyLimit, owner: b.owner })
      .then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const updateBudget: DataContextType['updateBudget'] = (id, patch) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    const dbPatch: any = {};
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.monthlyLimit !== undefined) dbPatch.monthly_limit = patch.monthlyLimit;
    if (patch.owner !== undefined) dbPatch.owner = patch.owner;
    supabase.from('budgets').update(dbPatch).eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };
  const removeBudget: DataContextType['removeBudget'] = (id) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    supabase.from('budgets').delete().eq('id', id).then(({ error }) => { if (error) refetchAll(wsId!); });
  };

  const resetAll = async () => {
    if (!wsId) return;
    await Promise.all([
      supabase.from('transactions').delete().eq('workspace_id', wsId),
      supabase.from('goal_contributions').delete().eq('workspace_id', wsId),
      supabase.from('goals').delete().eq('workspace_id', wsId),
      supabase.from('budgets').delete().eq('workspace_id', wsId),
      supabase.from('cards').delete().eq('workspace_id', wsId),
      supabase.from('accounts').delete().eq('workspace_id', wsId),
    ]);
    await refetchAll(wsId);
  };

  return (
    <DataContext.Provider value={{
      cards, accounts, transactions, goals, contributions, budgets, ready,
      addCard, updateCard, removeCard,
      addAccount, updateAccount, removeAccount,
      addTransaction, updateTransaction, removeTransaction,
      markInvoicePaid, unmarkInvoicePaid,
      addGoal, updateGoal, removeGoal, contributeGoal, removeContribution,
      addBudget, updateBudget, removeBudget,
      resetAll,
    }}>
      {children}
    </DataContext.Provider>
  );
}

async function migrateLegacy(wsId: string, parsed: any) {
  const cardIdMap = new Map<string, string>();
  const accountIdMap = new Map<string, string>();
  const goalIdMap = new Map<string, string>();

  if (Array.isArray(parsed.cards)) {
    const rows = parsed.cards.map((c: any) => {
      const id = uid(); cardIdMap.set(c.id, id);
      return { id, workspace_id: wsId, name: c.name, card_limit: c.limit, closing_day: c.closingDay, due_day: c.dueDay, color: c.color, owner: c.owner };
    });
    if (rows.length) await supabase.from('cards').insert(rows);
  }
  if (Array.isArray(parsed.accounts)) {
    const rows = parsed.accounts.map((a: any) => {
      const id = uid(); accountIdMap.set(a.id, id);
      return { id, workspace_id: wsId, name: a.name, type: a.type, balance: a.balance, owner: a.owner };
    });
    if (rows.length) await supabase.from('accounts').insert(rows);
  }
  if (Array.isArray(parsed.goals)) {
    const rows = parsed.goals.map((g: any) => {
      const id = uid(); goalIdMap.set(g.id, id);
      return { id, workspace_id: wsId, name: g.name, target: g.target, deadline: g.deadline || null, owner: g.owner };
    });
    if (rows.length) await supabase.from('goals').insert(rows);
  }
  if (Array.isArray(parsed.transactions)) {
    const groupMap = new Map<string, string>();
    const rows = parsed.transactions.map((t: any) => ({
      id: uid(), workspace_id: wsId,
      group_id: t.groupId ? (groupMap.get(t.groupId) ?? (() => { const g = uid(); groupMap.set(t.groupId, g); return g; })()) : null,
      description: t.description, amount: t.amount, date: t.date,
      category: t.category, payment_method: t.paymentMethod,
      card_id: t.cardId ? cardIdMap.get(t.cardId) ?? null : null,
      account_id: t.accountId ? accountIdMap.get(t.accountId) ?? null : null,
      installment_current: t.installmentInfo?.current ?? null,
      installment_total: t.installmentInfo?.total ?? null,
      type: t.type, owner: t.owner, pessoa: t.owner,
      recurrence: t.recurrence ?? null, recurrence_end_date: t.recurrenceEndDate ?? null,
    }));
    if (rows.length) await supabase.from('transactions').insert(rows);
  }
  if (Array.isArray(parsed.contributions)) {
    const rows = parsed.contributions
      .filter((c: any) => goalIdMap.has(c.goalId))
      .map((c: any) => ({
        id: uid(), workspace_id: wsId,
        goal_id: goalIdMap.get(c.goalId)!,
        amount: c.amount, date: c.date, owner: c.owner, note: c.note ?? null,
      }));
    if (rows.length) await supabase.from('goal_contributions').insert(rows);
  }
  if (Array.isArray(parsed.budgets)) {
    const rows = parsed.budgets.map((b: any) => ({
      id: uid(), workspace_id: wsId, category: b.category, monthly_limit: b.monthlyLimit, owner: b.owner,
    }));
    if (rows.length) await supabase.from('budgets').insert(rows);
  }
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
