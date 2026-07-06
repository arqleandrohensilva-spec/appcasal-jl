import type { UserTransaction, GoalContribution } from './store';
import type { UserProfile } from './context';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function filterByOwner<T extends { owner: UserProfile }>(items: T[], profile: UserProfile): T[] {
  if (profile === 'casal') return items;
  return items.filter(i => i.owner === profile);
}

/**
 * Expande transações recorrentes em instâncias concretas entre fromISO e toISO.
 * A tx original é preservada (com sua data); são criadas cópias virtuais para
 * cada ocorrência futura/passada dentro do range, com IDs sintéticos.
 */
export function expandRecurring(
  transactions: UserTransaction[],
  fromISO: string,
  toISOStr: string,
): UserTransaction[] {
  const result: UserTransaction[] = [];
  const from = parseISO(fromISO);
  const to = parseISO(toISOStr);

  for (const t of transactions) {
    // sempre inclui a instância original
    result.push(t);
    if (!t.recurrence || t.recurrence === 'none') continue;

    const endLimit = t.recurrenceEndDate ? parseISO(t.recurrenceEndDate) : to;
    const stopAt = endLimit < to ? endLimit : to;

    // ---- Semanal com dias da semana específicos ----
    // Ex.: repete toda seg/qua/sex a partir da data inicial.
    if (t.recurrence === 'weekly' && t.recurrenceWeekdays && t.recurrenceWeekdays.length > 0) {
      const days = Array.from(new Set(t.recurrenceWeekdays.map(n => ((n % 7) + 7) % 7)));
      const startDate = parseISO(t.date);
      // Varre dia a dia entre max(from, startDate) e stopAt
      const walkStart = from > startDate ? new Date(from) : new Date(startDate);
      const cursor = new Date(walkStart);
      let idx = 0;
      while (cursor <= stopAt) {
        if (cursor > startDate && days.includes(cursor.getDay())) {
          idx += 1;
          result.push({
            ...t,
            id: `${t.id}__rw${idx}`,
            date: toISO(cursor),
            groupId: t.id,
            installmentInfo: undefined,
            recurrence: undefined,
          });
          if (idx > 1500) break;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      continue;
    }

    // Intervalo em dias: prioriza `recurrenceIntervalDays` quando informado (weekly).
    const stepDays =
      t.recurrence === 'weekly'
        ? (t.recurrenceIntervalDays && t.recurrenceIntervalDays > 0 ? t.recurrenceIntervalDays : 7)
        : 0;
    const stepMonths = t.recurrence === 'monthly' ? 1 : 0;

    // gera ocorrências para frente
    let i = 1;
    while (true) {
      const d = parseISO(t.date);
      if (stepDays) d.setDate(d.getDate() + stepDays * i);
      if (stepMonths) d.setMonth(d.getMonth() + stepMonths * i);
      if (d > stopAt) break;
      if (d >= from) {
        result.push({
          ...t,
          id: `${t.id}__r${i}`,
          date: toISO(d),
          groupId: t.id,
          installmentInfo: undefined,
          recurrence: undefined,
        });
      }
      i += 1;
      if (i > 600) break;
    }

    // gera ocorrências para trás (apenas semanal fixo ou mensal — não faz sentido em dias-da-semana)
    i = 1;
    while (true) {
      const d = parseISO(t.date);
      if (stepDays) d.setDate(d.getDate() - stepDays * i);
      if (stepMonths) d.setMonth(d.getMonth() - stepMonths * i);
      if (d < from) break;
      result.push({
        ...t,
        id: `${t.id}__rb${i}`,
        date: toISO(d),
        groupId: t.id,
        installmentInfo: undefined,
        recurrence: undefined,
      });
      i += 1;
      if (i > 600) break;
    }
  }

  return result;
}

export interface MonthStats {
  receita: number;
  gastos: number;
  saldoMes: number;
  porCategoria: { name: string; value: number }[];
}

/**
 * Estatísticas de um mês específico (ano, mês 0-11).
 * Considera tx recorrentes expandidas.
 */
export function monthlyStats(
  transactions: UserTransaction[],
  profile: UserProfile,
  year: number,
  month: number,
): MonthStats {
  const fromISO = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const toISOStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const own = filterByOwner(transactions, profile);
  const expanded = expandRecurring(own, fromISO, toISOStr);
  const inMonth = expanded.filter(t => t.date >= fromISO && t.date <= toISOStr);

  let receita = 0;
  let gastos = 0;
  const catMap = new Map<string, number>();

  for (const t of inMonth) {
    if (t.type === 'receita') {
      receita += Math.abs(t.amount);
    } else {
      const v = Math.abs(t.amount);
      gastos += v;
      catMap.set(t.category, (catMap.get(t.category) || 0) + v);
    }
  }

  const porCategoria = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return { receita, gastos, saldoMes: receita - gastos, porCategoria };
}

/**
 * Evolução de receita vs gastos dos últimos N meses (incluindo o atual).
 */
export function monthlyEvolution(
  transactions: UserTransaction[],
  profile: UserProfile,
  monthsBack: number = 6,
): { mes: string; mesISO: string; receita: number; gastos: number; saldo: number }[] {
  const now = new Date();
  const result: { mes: string; mesISO: string; receita: number; gastos: number; saldo: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const stats = monthlyStats(transactions, profile, d.getFullYear(), d.getMonth());
    result.push({
      mes: MONTH_NAMES[d.getMonth()],
      mesISO: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      receita: stats.receita,
      gastos: stats.gastos,
      saldo: stats.saldoMes,
    });
  }
  return result;
}

/**
 * Soma de contribuições para uma meta.
 */
export function goalProgress(contributions: GoalContribution[], goalId: string) {
  return contributions
    .filter(c => c.goalId === goalId)
    .reduce((s, c) => s + c.amount, 0);
}

/**
 * Contribuições por perfil (Leandro vs Jonathan) para uma meta.
 */
export function goalProgressByOwner(contributions: GoalContribution[], goalId: string) {
  const byOwner: Record<string, number> = { leandro: 0, jonathan: 0 };
  for (const c of contributions) {
    if (c.goalId !== goalId) continue;
    byOwner[c.owner] = (byOwner[c.owner] || 0) + c.amount;
  }
  return byOwner;
}

/**
 * Retorna o mês (YYYY-MM) da fatura de cartão para uma data de compra.
 * Compras feitas após o `closingDay` entram na fatura do mês seguinte
 * (que vence no mês seguinte, no `dueDay`). A fatura é identificada pelo
 * mês da data de vencimento.
 */
export function invoiceMonthOf(dateISO: string, closingDay: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  // Compra até o dia de fechamento entra na fatura que vence no MESMO mês.
  // Compra após o fechamento entra na fatura do mês seguinte.
  const monthsAhead = d <= closingDay ? 0 : 1;
  const dt = new Date(y, m - 1 + monthsAhead, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

/** Adiciona meses a um YYYY-MM. */
export function addMonthsToKey(key: string, offset: number): string {
  const [y, m] = key.split('-').map(Number);
  const dt = new Date(y, m - 1 + offset, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

/** Nome legível pt-BR para um YYYY-MM (ex.: "Nov/26"). */
export function labelMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]}/${String(y).slice(-2)}`;
}

/** Data de vencimento (ISO) da fatura de um mês, respeitando fim de mês curto. */
export function invoiceDueDateISO(monthKey: string, dueDay: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Data de fechamento (ISO) da fatura de um mês (fecha no mesmo mês do vencimento). */
export function invoiceClosingDateISO(monthKey: string, closingDay: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(closingDay, lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
