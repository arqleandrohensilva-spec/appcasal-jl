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

export interface UserTransaction {
  id: string;
  groupId?: string; // identifica todas as parcelas do mesmo lançamento
  description: string;
  amount: number; // positivo = receita, negativo = despesa
  date: string; // ISO yyyy-mm-dd
  category: string;
  paymentMethod: string; // nome de conta ou cartão
  cardId?: string;
  accountId?: string;
  installmentInfo?: { current: number; total: number };
  type: 'receita' | 'despesa';
  owner: UserProfile;
  createdAt: string;
}

interface DataContextType {
  cards: UserCard[];
  accounts: UserAccount[];
  transactions: UserTransaction[];
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
    installments?: number; // 1 = à vista
    type: 'receita' | 'despesa';
    owner: UserProfile;
  }) => number; // returns number of records created
  removeTransaction: (id: string, removeGroup?: boolean) => void;
  resetAll: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'financasduo:data:v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// Seed inicial — só usado se não houver nada salvo
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

  // Carrega do localStorage só no cliente (evita hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.cards) setCards(parsed.cards);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.transactions) setTransactions(parsed.transactions);
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persiste quando algo muda (apenas depois da hidratação)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards, accounts, transactions }));
    } catch {}
  }, [cards, accounts, transactions, hydrated]);

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
    }));

    setTransactions(prev => [...created, ...prev]);

    // Atualiza saldo da conta (somente para a parcela atual, em pagamentos à vista de conta)
    if (input.accountId && n === 1) {
      setAccounts(prev => prev.map(a =>
        a.id === input.accountId ? { ...a, balance: a.balance + sign * Math.abs(input.amount) } : a
      ));
    }

    return n;
  };

  const removeTransaction: DataContextType['removeTransaction'] = (id, removeGroup) => {
    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      if (removeGroup && target.groupId) {
        return prev.filter(t => t.groupId !== target.groupId);
      }
      return prev.filter(t => t.id !== id);
    });
  };

  const resetAll = () => {
    setCards(SEED_CARDS);
    setAccounts(SEED_ACCOUNTS);
    setTransactions([]);
  };

  return (
    <DataContext.Provider value={{
      cards, accounts, transactions,
      addCard, removeCard,
      addAccount, removeAccount,
      addTransaction, removeTransaction,
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
