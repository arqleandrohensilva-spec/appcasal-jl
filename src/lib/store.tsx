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
  recurrence?: Recurrence; // se definido, a tx repete a partir da data
  recurrenceEndDate?: string; // ISO; opcional
}

export interface UserGoal {
  id: string;
  name: string;
  target: number;
  deadline: string; // ISO
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

interface DataContextType {
  cards: UserCard[];
  accounts: UserAccount[];
  transactions: UserTransaction[];
  goals: UserGoal[];
  contributions: GoalContribution[];
  addCard: (c: Omit<UserCard, 'id'>) => void;
  removeCard: (id: string) => void;
  addAccount: (a: Omit<UserAccount, 'id'>) => void;
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
  removeTransaction: (id: string, removeGroup?: boolean) => void;
  addGoal: (g: Omit<UserGoal, 'id' | 'createdAt'>) => void;
  removeGoal: (id: string) => void;
  contributeGoal: (input: Omit<GoalContribution, 'id'>) => void;
  removeContribution: (id: string) => void;
  resetAll: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'financasduo:data:v2';
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.cards) setCards(parsed.cards);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.goals) setGoals(parsed.goals);
        if (parsed.contributions) setContributions(parsed.contributions);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        cards, accounts, transactions, goals, contributions,
      }));
    } catch {}
  }, [cards, accounts, transactions, goals, contributions, hydrated]);

  const addCard: DataContextType['addCard'] = (c) =>
    setCards(prev => [...prev, { ...c, id: uid() }]);
  const removeCard: DataContextType['removeCard'] = (id) =>
    setCards(prev => prev.filter(c => c.id !== id));
  const addAccount: DataContextType['addAccount'] = (a) =>
    setAccounts(prev => [...prev, { ...a, id: uid() }]);
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
      // Recorrência só faz sentido para tx única (sem parcelamento)
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
  const removeGoal: DataContextType['removeGoal'] = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    setContributions(prev => prev.filter(c => c.goalId !== id));
  };
  const contributeGoal: DataContextType['contributeGoal'] = (input) =>
    setContributions(prev => [...prev, { ...input, id: uid() }]);
  const removeContribution: DataContextType['removeContribution'] = (id) =>
    setContributions(prev => prev.filter(c => c.id !== id));

  const resetAll = () => {
    setCards(SEED_CARDS);
    setAccounts(SEED_ACCOUNTS);
    setTransactions([]);
    setGoals([]);
    setContributions([]);
  };

  return (
    <DataContext.Provider value={{
      cards, accounts, transactions, goals, contributions,
      addCard, removeCard,
      addAccount, removeAccount,
      addTransaction, removeTransaction,
      addGoal, removeGoal, contributeGoal, removeContribution,
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
