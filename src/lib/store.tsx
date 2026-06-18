import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { UserProfile } from './context';

export interface UserCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  owner: UserProfile;
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
  amount: number; // positivo = receita, negativo = despesa
  date: string; // ISO yyyy-mm-dd
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
  addCard: (c: Omit<UserCard, 'id'>) => void;
  updateCard: (id: string, patch: Partial<Omit<UserCard, 'id'>>) => void;
  removeCard: (id: string) => void;
  addAccount: (a: Omit<UserAccount, 'id'>) => void;
  updateAccount: (id: string, patch: Partial<Omit<UserAccount, 'id'>>) => void;
  removeAccount: (id: string) => void;
  addTransaction: (input: {
    description: string;
    amount: number;
    date: string;
    category: string;
    paymentMethod: string;
    cardId?: string;
    accountId?: string;
    installments?: number;
    type: 'receita' | 'despesa';
    owner: UserProfile;
    recurrence?: Recurrence;
    recurrenceEndDate?: string;
  }) => number;
  /** Edita uma única transação (não propaga para o grupo de parcelamento). */
  updateTransaction: (id: string, patch: Partial<{
    description: string;
    amount: number; // valor absoluto; o sinal é derivado do type
    date: string;
    category: string;
    paymentMethod: string;
    cardId?: string;
    accountId?: string;
    type: 'receita' | 'despesa';
    recurrence: Recurrence;
    recurrenceEndDate?: string;
  }>) => void;
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

const STORAGE_KEY = 'financasduo:data:v3';
const LEGACY_KEY_V2 = 'financasduo:data:v2';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const SEED_CARDS: UserCard[] = [
  { id: 'seed-nu-l', name: 'Nubank', limit: 8000, closingDay: 3, dueDay: 10, color: 'purple', owner: 'leandro' },
  { id: 'seed-c6-j', name: 'C6 Gold', limit: 4000, closingDay: 8, dueDay: 15, color: 'gray', owner: 'jonathan' },
];
const SEED_ACCOUNTS: UserAccount[] = [
  { id: 'seed-nu-acc-l', name: 'Nubank Conta', type: 'corrente', balance: 3840, owner: 'leandro' },
  { id: 'seed-inter-j', name: 'Inter Conta', type: 'corrente', balance: 2150, owner: 'jonathan' },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [cards, setCards] = useState<UserCard[]>(SEED_CARDS);
  const [accounts, setAccounts] = useState<UserAccount[]>(SEED_ACCOUNTS);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      // migração automática do v2
      if (!raw) {
        const legacy = localStorage.getItem(LEGACY_KEY_V2);
        if (legacy) raw = legacy;
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.cards) setCards(parsed.cards);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.goals) setGoals(parsed.goals);
        if (parsed.contributions) setContributions(parsed.contributions);
        if (parsed.budgets) setBudgets(parsed.budgets);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        cards, accounts, transactions, goals, contributions, budgets,
      }));
    } catch {}
  }, [cards, accounts, transactions, goals, contributions, budgets, hydrated]);

  const addCard: DataContextType['addCard'] = (c) =>
    setCards(prev => [...prev, { ...c, id: uid() }]);
  const updateCard: DataContextType['updateCard'] = (id, patch) =>
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  const removeCard: DataContextType['removeCard'] = (id) =>
    setCards(prev => prev.filter(c => c.id !== id));

  const addAccount: DataContextType['addAccount'] = (a) =>
    setAccounts(prev => [...prev, { ...a, id: uid() }]);
  const updateAccount: DataContextType['updateAccount'] = (id, patch) =>
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const removeAccount: DataContextType['removeAccount'] = (id) =>
    setAccounts(prev => prev.filter(a => a.id !== id));

  const addTransaction: DataContextType['addTransaction'] = (input) => {
    const n = Math.max(1, Math.min(input.installments || 1, 60));
    const groupId = uid();
    const valuePerInstallment = input.amount / n;
    const sign = input.type === 'receita' ? 1 : -1;
    const todayISO = new Date().toISOString().slice(0, 10);
    const recurrence = input.recurrence && input.recurrence !== 'none' ? input.recurrence : undefined;

    const created: UserTransaction[] = Array.from({ length: n }, (_, i) => ({
      id: uid(),
      groupId: n > 1 ? groupId : undefined,
      description: n > 1 ? `${input.description} (${i + 1}/${n})` : input.description,
      amount: sign * Math.abs(valuePerInstallment),
      date: addMonths(input.date, i),
      category: input.category,
      paymentMethod: input.paymentMethod,
      cardId: input.cardId,
      accountId: input.accountId,
      installmentInfo: n > 1 ? { current: i + 1, total: n } : undefined,
      type: input.type,
      owner: input.owner,
      createdAt: new Date().toISOString(),
      recurrence: n === 1 ? recurrence : undefined,
      recurrenceEndDate: n === 1 ? input.recurrenceEndDate : undefined,
    }));

    setTransactions(prev => [...created, ...prev]);

    if (input.accountId) {
      const realizedDelta = created
        .filter(t => !t.cardId && t.date <= todayISO)
        .reduce((s, t) => s + t.amount, 0);
      if (realizedDelta !== 0) {
        setAccounts(prev => prev.map(a =>
          a.id === input.accountId ? { ...a, balance: a.balance + realizedDelta } : a
        ));
      }
    }

    return n;
  };

  const updateTransaction: DataContextType['updateTransaction'] = (id, patch) => {
    const todayISO = new Date().toISOString().slice(0, 10);
    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextType = patch.type ?? t.type;
      const sign = nextType === 'receita' ? 1 : -1;
      const nextAmountAbs = patch.amount !== undefined ? Math.abs(patch.amount) : Math.abs(t.amount);
      const next: UserTransaction = {
        ...t,
        ...patch,
        amount: sign * nextAmountAbs,
        type: nextType,
      };
      // Ajusta saldo da conta vinculada se mudou valor/data/conta
      const wasRealized = !t.cardId && t.accountId && t.date <= todayISO;
      const willBeRealized = !next.cardId && next.accountId && next.date <= todayISO;
      if (wasRealized || willBeRealized) {
        setAccounts(accs => accs.map(a => {
          let delta = 0;
          if (wasRealized && a.id === t.accountId) delta -= t.amount;
          if (willBeRealized && a.id === next.accountId) delta += next.amount;
          return delta !== 0 ? { ...a, balance: a.balance + delta } : a;
        }));
      }
      return next;
    }));
  };

  const removeTransaction: DataContextType['removeTransaction'] = (id, removeGroup) => {
    const todayISO = new Date().toISOString().slice(0, 10);
    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const toRemove = removeGroup && target.groupId
        ? prev.filter(t => t.groupId === target.groupId)
        : [target];

      const revertByAccount = new Map<string, number>();
      for (const t of toRemove) {
        if (t.accountId && !t.cardId && t.date <= todayISO) {
          revertByAccount.set(t.accountId, (revertByAccount.get(t.accountId) || 0) - t.amount);
        }
      }
      if (revertByAccount.size > 0) {
        setAccounts(accs => accs.map(a =>
          revertByAccount.has(a.id) ? { ...a, balance: a.balance + (revertByAccount.get(a.id) || 0) } : a
        ));
      }

      const ids = new Set(toRemove.map(t => t.id));
      return prev.filter(t => !ids.has(t.id));
    });
  };

  const addGoal: DataContextType['addGoal'] = (g) =>
    setGoals(prev => [...prev, { ...g, id: uid(), createdAt: new Date().toISOString() }]);
  const updateGoal: DataContextType['updateGoal'] = (id, patch) =>
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  const removeGoal: DataContextType['removeGoal'] = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    setContributions(prev => prev.filter(c => c.goalId !== id));
  };
  const contributeGoal: DataContextType['contributeGoal'] = (input) =>
    setContributions(prev => [...prev, { ...input, id: uid() }]);
  const removeContribution: DataContextType['removeContribution'] = (id) =>
    setContributions(prev => prev.filter(c => c.id !== id));

  const addBudget: DataContextType['addBudget'] = (b) =>
    setBudgets(prev => [...prev, { ...b, id: uid() }]);
  const updateBudget: DataContextType['updateBudget'] = (id, patch) =>
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  const removeBudget: DataContextType['removeBudget'] = (id) =>
    setBudgets(prev => prev.filter(b => b.id !== id));

  const resetAll = () => {
    setCards(SEED_CARDS);
    setAccounts(SEED_ACCOUNTS);
    setTransactions([]);
    setGoals([]);
    setContributions([]);
    setBudgets([]);
  };

  return (
    <DataContext.Provider value={{
      cards, accounts, transactions, goals, contributions, budgets,
      addCard, updateCard, removeCard,
      addAccount, updateAccount, removeAccount,
      addTransaction, updateTransaction, removeTransaction,
      addGoal, updateGoal, removeGoal, contributeGoal, removeContribution,
      addBudget, updateBudget, removeBudget,
      resetAll,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
