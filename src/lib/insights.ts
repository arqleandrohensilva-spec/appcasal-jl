import type { UserCard, UserTransaction, UserAccount } from './store';
import type { UserProfile } from './context';
import { expandRecurring, filterByOwner, monthlyStats } from './finance';
import { getBillDueDate } from './projections';

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ====== FATURAS ABERTAS DE CARTÃO ======
export interface OpenBill {
  cardId: string;
  cardName: string;
  cardColor: string;
  dueDate: string;
  total: number;
  itemCount: number;
}

export function openCardBills(
  transactions: UserTransaction[],
  cards: UserCard[],
  profile: UserProfile,
  fromISO?: string,
): OpenBill[] {
  const today = fromISO || toISO(new Date());
  const ownCards = filterByOwner(cards, profile);
  const ownTxs = filterByOwner(transactions, profile);
  const result = new Map<string, OpenBill>();
  for (const t of ownTxs) {
    if (!t.cardId || t.type !== 'despesa') continue;
    const card = ownCards.find(c => c.id === t.cardId);
    if (!card) continue;
    const due = getBillDueDate(t.date, card.closingDay, card.dueDay);
    if (due < today) continue; // já paga
    const key = `${card.id}::${due}`;
    const cur = result.get(key) || {
      cardId: card.id, cardName: card.name, cardColor: card.color,
      dueDate: due, total: 0, itemCount: 0,
    };
    cur.total += Math.abs(t.amount);
    cur.itemCount += 1;
    result.set(key, cur);
  }
  return Array.from(result.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function totalLiabilities(transactions: UserTransaction[], cards: UserCard[], profile: UserProfile) {
  return openCardBills(transactions, cards, profile).reduce((s, b) => s + b.total, 0);
}

// ====== PARCELAMENTOS EM ABERTO ======
export interface InstallmentDebt {
  groupId: string;
  description: string;
  totalRemaining: number;
  remainingCount: number;
  totalCount: number;
  monthlyValue: number;
  nextDueDate: string;
  juros: number; // estimado: 0 (sem juros se foi parcelamento de cartão)
}

export function openInstallments(transactions: UserTransaction[], profile: UserProfile): InstallmentDebt[] {
  const today = toISO(new Date());
  const own = filterByOwner(transactions, profile)
    .filter(t => t.installmentInfo && t.groupId && t.type === 'despesa');
  const byGroup = new Map<string, UserTransaction[]>();
  for (const t of own) {
    const list = byGroup.get(t.groupId!) || [];
    list.push(t);
    byGroup.set(t.groupId!, list);
  }
  const result: InstallmentDebt[] = [];
  for (const [groupId, list] of byGroup) {
    const sorted = list.sort((a, b) => a.date.localeCompare(b.date));
    const remaining = sorted.filter(t => t.date >= today);
    if (remaining.length === 0) continue;
    const totalRemaining = remaining.reduce((s, t) => s + Math.abs(t.amount), 0);
    const first = sorted[0];
    const descBase = first.description.replace(/\s*\(\d+\/\d+\)\s*$/, '');
    result.push({
      groupId,
      description: descBase,
      totalRemaining,
      remainingCount: remaining.length,
      totalCount: sorted[0].installmentInfo?.total || sorted.length,
      monthlyValue: Math.abs(first.amount),
      nextDueDate: remaining[0].date,
      juros: 0,
    });
  }
  return result.sort((a, b) => b.totalRemaining - a.totalRemaining);
}

// ====== ASSINATURAS / RECORRÊNCIAS ======
export interface Subscription {
  id: string;
  description: string;
  category: string;
  monthly: number;
  date: string;
  recurrence: 'weekly' | 'monthly';
}
export function subscriptions(transactions: UserTransaction[], profile: UserProfile): Subscription[] {
  return filterByOwner(transactions, profile)
    .filter(t => t.type === 'despesa' && t.recurrence && t.recurrence !== 'none')
    .map(t => ({
      id: t.id,
      description: t.description,
      category: t.category,
      monthly: Math.abs(t.amount) * (t.recurrence === 'weekly' ? 4 : 1),
      date: t.date,
      recurrence: t.recurrence as 'weekly' | 'monthly',
    }))
    .sort((a, b) => b.monthly - a.monthly);
}

// ====== HEATMAP por dia da semana ======
export function weekdayHeatmap(transactions: UserTransaction[], profile: UserProfile) {
  // Retorna [dom..sáb][0..2]  (manhã/tarde/noite proxy: dividimos pelo dia do mês)
  const grid: number[][] = Array.from({ length: 7 }, () => [0, 0, 0]);
  const own = filterByOwner(transactions, profile).filter(t => t.type === 'despesa');
  for (const t of own) {
    const d = parseISO(t.date);
    const wd = d.getDay();
    const day = d.getDate();
    const bucket = day < 11 ? 0 : day < 21 ? 1 : 2; // proxy
    grid[wd][bucket] += Math.abs(t.amount);
  }
  return grid;
}

// ====== ANOMALIAS DE CATEGORIA ======
export interface CategoryAnomaly {
  category: string;
  current: number;
  avg3m: number;
  ratio: number; // current / avg
}
export function categoryAnomalies(transactions: UserTransaction[], profile: UserProfile): CategoryAnomaly[] {
  const now = new Date();
  const cur = monthlyStats(transactions, profile, now.getFullYear(), now.getMonth());
  const prev = [1, 2, 3].map(off => {
    const d = new Date(now.getFullYear(), now.getMonth() - off, 1);
    return monthlyStats(transactions, profile, d.getFullYear(), d.getMonth());
  });
  const out: CategoryAnomaly[] = [];
  for (const c of cur.porCategoria) {
    const avgs = prev.map(p => p.porCategoria.find(x => x.name === c.name)?.value || 0);
    const avg = avgs.reduce((s, v) => s + v, 0) / 3;
    if (avg <= 0) continue;
    const ratio = c.value / avg;
    if (ratio >= 1.4) out.push({ category: c.name, current: c.value, avg3m: avg, ratio });
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

// ====== TOTAIS ANUAIS ======
export function yearTotals(transactions: UserTransaction[], profile: UserProfile, year: number) {
  const fromISOStr = `${year}-01-01`;
  const toISOStr = `${year}-12-31`;
  const own = filterByOwner(transactions, profile);
  const expanded = expandRecurring(own, fromISOStr, toISOStr);
  const inYear = expanded.filter(t => t.date >= fromISOStr && t.date <= toISOStr);
  let receita = 0, gastos = 0;
  const catMap = new Map<string, number>();
  for (const t of inYear) {
    if (t.type === 'receita') receita += Math.abs(t.amount);
    else {
      const v = Math.abs(t.amount);
      gastos += v;
      catMap.set(t.category, (catMap.get(t.category) || 0) + v);
    }
  }
  const cats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  const topCategory = cats[0]?.[0] || '—';
  const topCategoryValue = cats[0]?.[1] || 0;
  return {
    receita, gastos,
    totalMovimentado: receita + gastos,
    txCount: inYear.length,
    topCategory,
    topCategoryValue,
    saldoAno: receita - gastos,
    taxaPoupanca: receita > 0 ? (receita - gastos) / receita : 0,
    catRanking: cats.map(([name, value]) => ({ name, value })),
  };
}

// ====== COMPROMISSOS PENDENTES DO MÊS (cartões abertos + saídas futuras) ======
export function pendingThisMonth(
  transactions: UserTransaction[],
  cards: UserCard[],
  profile: UserProfile,
): number {
  const today = new Date();
  const todayISO = toISO(today);
  const endMonthISO = toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const bills = openCardBills(transactions, cards, profile, todayISO)
    .filter(b => b.dueDate <= endMonthISO);
  const own = filterByOwner(transactions, profile);
  const expanded = expandRecurring(own, todayISO, endMonthISO)
    .filter(t => !t.cardId && t.date > todayISO && t.date <= endMonthISO && t.type === 'despesa');
  return bills.reduce((s, b) => s + b.total, 0) + expanded.reduce((s, t) => s + Math.abs(t.amount), 0);
}

// ====== CONQUISTAS DINÂMICAS ======
export interface AchievementStatus {
  id: string;
  unlocked: boolean;
  progress: number; // 0..1
  detail: string;
}
export function computeAchievements(
  transactions: UserTransaction[],
  accounts: UserAccount[],
  contributions: { amount: number }[],
  profile: UserProfile,
): Record<string, AchievementStatus> {
  const own = filterByOwner(transactions, profile);
  const saldo = accounts.filter(a => profile === 'casal' || a.owner === profile).reduce((s, a) => s + a.balance, 0);
  const result: Record<string, AchievementStatus> = {};
  // Primeira transação
  result['first-tx'] = {
    id: 'first-tx',
    unlocked: own.length >= 1,
    progress: Math.min(own.length, 1),
    detail: `${own.length} transação(ões) registrada(s)`,
  };
  // 10 transações
  result['ten-tx'] = {
    id: 'ten-tx', unlocked: own.length >= 10,
    progress: Math.min(own.length / 10, 1),
    detail: `${own.length}/10 transações`,
  };
  // Saldo positivo
  result['positive-balance'] = {
    id: 'positive-balance', unlocked: saldo > 0,
    progress: saldo > 0 ? 1 : 0,
    detail: saldo > 0 ? 'Saldo positivo agora' : 'Saldo negativo',
  };
  // Primeiro aporte
  result['first-contribution'] = {
    id: 'first-contribution', unlocked: contributions.length >= 1,
    progress: Math.min(contributions.length, 1),
    detail: `${contributions.length} aporte(s)`,
  };
  // Reserva 5k
  result['reserve-5k'] = {
    id: 'reserve-5k', unlocked: saldo >= 5000,
    progress: Math.min(saldo / 5000, 1),
    detail: `${Math.round((saldo / 5000) * 100)}% até R$ 5.000`,
  };
  // Recorrência cadastrada
  const hasRec = own.some(t => t.recurrence && t.recurrence !== 'none');
  result['set-recurrence'] = {
    id: 'set-recurrence', unlocked: hasRec,
    progress: hasRec ? 1 : 0,
    detail: hasRec ? 'Recorrência ativa' : 'Cadastre uma despesa fixa',
  };
  return result;
}
