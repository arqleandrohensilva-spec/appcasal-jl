import type { UserAccount, UserCard, UserTransaction } from './store';
import type { UserProfile } from './context';
import { expandRecurring } from './finance';

export interface DayProjection {
  date: string; // yyyy-mm-dd
  balance: number;
  delta: number;
  events: { description: string; amount: number; kind: 'tx' | 'bill'; cardName?: string }[];
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function filterByOwner<T extends { owner: UserProfile }>(items: T[], profile: UserProfile) {
  if (profile === 'casal') return items;
  return items.filter(i => i.owner === profile);
}

/**
 * Calcula a data de vencimento da fatura para uma compra feita em `purchaseDate`.
 * Se a data <= dia de fechamento, entra na fatura desse mês; senão, na do mês seguinte.
 * Vencimento é dueDay do mesmo mês do fechamento (ou mês seguinte se dueDay < closingDay).
 */
export function getBillDueDate(purchaseDate: string, closingDay: number, dueDay: number): string {
  const p = parseISO(purchaseDate);
  const day = p.getDate();
  let closingMonth = p.getMonth();
  const closingYear = p.getFullYear();
  if (day > closingDay) closingMonth += 1;
  // due in same month as closing, or next if dueDay <= closingDay
  let dueMonth = closingMonth;
  let dueYear = closingYear;
  if (dueDay <= closingDay) dueMonth += 1;
  const due = new Date(dueYear, dueMonth, dueDay);
  return toISO(due);
}

/**
 * Saldo total em caixa do perfil (soma das contas).
 */
export function totalCash(accounts: UserAccount[], profile: UserProfile) {
  return filterByOwner(accounts, profile).reduce((s, a) => s + a.balance, 0);
}

/**
 * Projeta o saldo diário do dia `from` até `to`, considerando:
 * - transações de conta (entram/saem na data)
 * - transações de cartão (saem como "pagamento de fatura" no dueDate)
 */
export function projectDailyBalance(
  accounts: UserAccount[],
  cards: UserCard[],
  transactions: UserTransaction[],
  profile: UserProfile,
  fromDays: number = -7,
  toDays: number = 60,
): DayProjection[] {
  const accs = filterByOwner(accounts, profile);
  const cds = filterByOwner(cards, profile);
  const ownTxs = filterByOwner(transactions, profile);

  // Expande recorrências dentro do range de projeção (com folga)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeStart = toISO(addDays(today, fromDays - 31));
  const rangeEnd = toISO(addDays(today, toDays + 31));
  // import direto (sem ciclo: finance.ts não importa projections.ts)
  const txs = expandRecurringInline(ownTxs, rangeStart, rangeEnd);

  const todayISO = toISO(today);
  const currentCash = accs.reduce((s, a) => s + a.balance, 0);

  // Mapeia eventos diários
  type Ev = { amount: number; description: string; kind: 'tx' | 'bill'; cardName?: string };
  const eventsByDate = new Map<string, Ev[]>();

  for (const t of txs) {
    if (t.cardId) {
      // Compra de cartão -> vira pagamento de fatura no due date
      const card = cds.find(c => c.id === t.cardId);
      if (!card) continue;
      const due = getBillDueDate(t.date, card.closingDay, card.dueDay);
      const list = eventsByDate.get(due) || [];
      list.push({
        amount: t.amount, // já é negativo se despesa
        description: `${t.description}`,
        kind: 'bill',
        cardName: card.name,
      });
      eventsByDate.set(due, list);
    } else {
      const list = eventsByDate.get(t.date) || [];
      list.push({
        amount: t.amount,
        description: t.description,
        kind: 'tx',
      });
      eventsByDate.set(t.date, list);
    }
  }

  // Reconstruir saldo: andar pra trás somando o reverso das txs passadas (de conta)
  // Simplificação: o "currentCash" já reflete as txs de conta confirmadas, e as
  // de cartão ainda não impactaram. Então o saldo hoje = currentCash.
  // Para datas futuras, somamos os eventos.
  // Para datas passadas (history), subtraímos os eventos que aconteceram após.

  const start = addDays(today, fromDays);
  const end = addDays(today, toDays);
  const days: DayProjection[] = [];

  // Primeiro: compute saldo retroativo
  // saldoNoDia(d) = currentCash - somaDosEventosEntre(d+1 .. today)  para d < today
  // saldoNoDia(d) = currentCash + somaDosEventosEntre(today+1 .. d)  para d >= today
  let cursor = new Date(start);
  while (cursor <= end) {
    const iso = toISO(cursor);
    let balance: number;
    if (iso < todayISO) {
      // retroativo: subtrai impactos ocorridos depois deste dia até hoje (inclusive)
      let sum = 0;
      const c2 = addDays(cursor, 1);
      const walk = new Date(c2);
      while (walk <= today) {
        const evs = eventsByDate.get(toISO(walk)) || [];
        sum += evs.reduce((s, e) => s + e.amount, 0);
        walk.setDate(walk.getDate() + 1);
      }
      balance = currentCash - sum;
    } else if (iso === todayISO) {
      balance = currentCash;
    } else {
      // futuro: soma impactos de today+1 até cursor
      let sum = 0;
      const walk = addDays(today, 1);
      while (walk <= cursor) {
        const evs = eventsByDate.get(toISO(walk)) || [];
        sum += evs.reduce((s, e) => s + e.amount, 0);
        walk.setDate(walk.getDate() + 1);
      }
      balance = currentCash + sum;
    }

    const evsToday = eventsByDate.get(iso) || [];
    const delta = evsToday.reduce((s, e) => s + e.amount, 0);
    days.push({ date: iso, balance, delta, events: evsToday });

    cursor = addDays(cursor, 1);
  }

  return days;
}

export interface CardRecommendation {
  card: UserCard;
  dueDate: string;
  projectedBalanceOnDue: number;
  currentBill: number; // valor da fatura atual desse cartão até o vencimento
  totalDueOnDate: number; // bill atual + valor da nova compra
  canPay: boolean;
  safetyMargin: number;
}

/**
 * Para um valor `amount` que o usuário quer gastar `today`, calcula em qual cartão
 * comprar é mais seguro — aquele em que, na data de vencimento da fatura, o saldo
 * projetado ainda cobre o pagamento.
 */
export function recommendCardForPurchase(
  amount: number,
  accounts: UserAccount[],
  cards: UserCard[],
  transactions: UserTransaction[],
  profile: UserProfile,
  purchaseDate?: string,
): CardRecommendation[] {
  const cds = filterByOwner(cards, profile);
  const txs = filterByOwner(transactions, profile);
  const pDate = purchaseDate || toISO(new Date());

  const projection = projectDailyBalance(accounts, cds, txs, profile, 0, 120);
  const balanceByDate = new Map(projection.map(p => [p.date, p.balance]));

  return cds.map(card => {
    const dueDate = getBillDueDate(pDate, card.closingDay, card.dueDay);
    // fatura atual: soma de todas as compras (despesas) desse cartão cujo dueDate == dueDate
    const currentBill = txs
      .filter(t => t.cardId === card.id && t.type === 'despesa')
      .filter(t => getBillDueDate(t.date, card.closingDay, card.dueDay) === dueDate)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const totalDueOnDate = currentBill + amount;
    const projectedBalanceOnDue = balanceByDate.get(dueDate) ?? 0;
    // saldo na data já tem a fatura desse cartão descontada (currentBill); adicionamos de volta
    // pq queremos saber: qual seria o saldo se a fatura não tivesse sido paga ainda?
    const balanceBeforeBill = projectedBalanceOnDue + currentBill;
    const balanceAfterNewBill = balanceBeforeBill - totalDueOnDate;
    const safetyMargin = balanceAfterNewBill;
    const canPay = safetyMargin >= 0;

    return {
      card,
      dueDate,
      projectedBalanceOnDue: balanceBeforeBill,
      currentBill,
      totalDueOnDate,
      canPay,
      safetyMargin,
    };
  }).sort((a, b) => b.safetyMargin - a.safetyMargin);
}
