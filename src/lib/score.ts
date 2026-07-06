import type { UserAccount, UserCard, UserTransaction, UserGoal, GoalContribution, Budget } from './store';
import type { UserProfile } from './context';
import { invoiceMonthOf, invoiceDueDateISO } from './finance';

export interface ScoreFactor {
  key: string;
  label: string;
  value: number;       // 0..100 (subscore)
  weight: number;      // 0..1
  detail: string;
}

export interface ScoreResult {
  score: number;       // 0..1000
  grade: 'Excelente' | 'Bom' | 'Regular' | 'Ruim' | 'Crítico';
  factors: ScoreFactor[];
}

interface ScoreInput {
  profile: UserProfile;               // 'leandro' | 'jonathan' | 'casal'
  cards: UserCard[];
  accounts: UserAccount[];
  transactions: UserTransaction[];
  goals: UserGoal[];
  contributions: GoalContribution[];
  budgets: Budget[];
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function matchOwner(owner: UserProfile, profile: UserProfile) {
  return profile === 'casal' ? true : owner === profile;
}

export function computeScore(input: ScoreInput): ScoreResult {
  const { profile, cards, accounts, transactions, goals, contributions, budgets } = input;

  const accs = accounts.filter(a => matchOwner(a.owner, profile));
  const crds = cards.filter(c => matchOwner(c.owner, profile));
  const txs = transactions.filter(t => matchOwner(t.owner, profile));
  const gls = goals.filter(g => matchOwner(g.owner, profile));

  const today = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthsAgo = (n: number) => new Date(today.getFullYear(), today.getMonth() - n, 1);

  // === 1. Saldo total das contas (liquidez) ===
  const totalBalance = accs.reduce((s, a) => s + a.balance, 0);
  const balanceScore = totalBalance <= 0 ? 0 : clamp((totalBalance / 5000) * 100);

  // === 2. Fluxo do mês (receitas - despesas realizadas) ===
  const monthTx = txs.filter(t => {
    const d = new Date(t.date);
    return d >= startOfMonth && d <= today;
  });
  const monthIncome = monthTx.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0);
  const netFlow = monthIncome - monthExpense;
  const flowRatio = monthIncome > 0 ? netFlow / monthIncome : (netFlow >= 0 ? 0.2 : -1);
  // -1..+1 → 0..100
  const flowScore = clamp((flowRatio + 1) * 50);

  // === 3. Uso do limite dos cartões (fatura aberta atual) ===
  let totalLimit = 0;
  let openUsage = 0;
  const currentMonthKey = ymd(startOfMonth).slice(0, 7);
  for (const c of crds) {
    totalLimit += c.limit;
    const cardTx = txs.filter(t => t.cardId === c.id && t.type === 'despesa');
    for (const t of cardTx) {
      const mk = invoiceMonthOf(t.date, c.closingDay);
      if (mk === currentMonthKey && !c.paidInvoices?.[mk]) openUsage += t.amount;
    }
  }
  const usagePct = totalLimit > 0 ? openUsage / totalLimit : 0;
  // <30% ótimo; 30-70 ok; >90 ruim
  const cardScore = totalLimit === 0
    ? 70
    : usagePct <= 0.3 ? 100
    : usagePct <= 0.5 ? 80
    : usagePct <= 0.7 ? 60
    : usagePct <= 0.9 ? 35
    : 10;

  // === 4. Faturas em atraso ===
  let overdueBills = 0;
  let dueSoonBills = 0;
  for (const c of crds) {
    const cardTx = txs.filter(t => t.cardId === c.id && t.type === 'despesa');
    const monthKeys = new Set<string>();
    for (const t of cardTx) monthKeys.add(invoiceMonthOf(t.date, c.closingDay));
    for (const mk of monthKeys) {
      if (c.paidInvoices?.[mk]) continue;
      const due = new Date(invoiceDueDateISO(mk, c.dueDay));
      const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0) overdueBills++;
      else if (diffDays <= 7) dueSoonBills++;
    }
  }
  const punctualityScore = overdueBills > 0
    ? Math.max(0, 40 - overdueBills * 20)
    : dueSoonBills > 0 ? 80 : 100;

  // === 5. Projeção de saldo (próximos 30 dias considerando previstas + faturas) ===
  const in30 = new Date(today.getTime() + 30 * 86400000);
  const futureTx = txs.filter(t => {
    const d = new Date(t.date);
    return d > today && d <= in30;
  });
  const futureIn = futureTx.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
  const futureOut = futureTx.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0);
  // faturas com vencimento nos próximos 30 dias
  let futureBills = 0;
  for (const c of crds) {
    const cardTx = txs.filter(t => t.cardId === c.id && t.type === 'despesa');
    const monthKeys = new Set<string>();
    for (const t of cardTx) monthKeys.add(invoiceMonthOf(t.date, c.closingDay));
    for (const mk of monthKeys) {
      if (c.paidInvoices?.[mk]) continue;
      const due = new Date(invoiceDueDateISO(mk, c.dueDay));
      if (due > today && due <= in30) {
        const total = cardTx
          .filter(t => invoiceMonthOf(t.date, c.closingDay) === mk)
          .reduce((s, t) => s + t.amount, 0);
        futureBills += total;
      }
    }
  }
  const projected = totalBalance + futureIn - futureOut - futureBills;
  const projScore = projected >= totalBalance ? 100
    : projected >= 0 ? clamp(60 + (projected / Math.max(totalBalance, 1)) * 40)
    : clamp(40 + (projected / Math.max(Math.abs(projected) + 1000, 1)) * 40, 0, 40);

  // === 6. Reserva de emergência (saldo vs média mensal de despesas) ===
  let last3Expenses = 0;
  for (let i = 0; i < 3; i++) {
    const start = monthsAgo(i);
    const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59);
    last3Expenses += txs.filter(t => {
      const d = new Date(t.date);
      return t.type === 'despesa' && d >= start && d <= end;
    }).reduce((s, t) => s + t.amount, 0);
  }
  const avgMonthlyExpense = last3Expenses / 3;
  const reserveMonths = avgMonthlyExpense > 0 ? totalBalance / avgMonthlyExpense : (totalBalance > 0 ? 6 : 0);
  const reserveScore = reserveMonths <= 0 ? 0
    : reserveMonths >= 6 ? 100
    : clamp((reserveMonths / 6) * 100);

  // === 7. Metas: progresso ===
  let goalScore = 60;
  if (gls.length > 0) {
    const progresses = gls.map(g => {
      const saved = contributions
        .filter(c => c.goalId === g.id && matchOwner(c.owner, profile))
        .reduce((s, c) => s + c.amount, 0);
      return g.target > 0 ? Math.min(1, saved / g.target) : 0;
    });
    const avg = progresses.reduce((a, b) => a + b, 0) / progresses.length;
    goalScore = clamp(avg * 100);
  }

  // === 8. Orçamento (aderência do mês) ===
  let budgetScore = 70;
  const relevantBudgets = budgets.filter(b => matchOwner(b.owner, profile));
  if (relevantBudgets.length > 0) {
    const ratios = relevantBudgets.map(b => {
      const spent = monthTx
        .filter(t => t.type === 'despesa' && t.category === b.category)
        .reduce((s, t) => s + t.amount, 0);
      return b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0;
    });
    // média de "quanto está sobrando" do orçamento
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    budgetScore = avgRatio <= 0.8 ? 100
      : avgRatio <= 1 ? 80
      : avgRatio <= 1.2 ? 50
      : 20;
  }

  // === 9. Dívidas / empréstimos ativos ===
  const loanTx = txs.filter(t => t.type === 'despesa' && (t.category === 'Empréstimo' || t.tags?.includes('empréstimo')));
  const activeLoanFuture = loanTx.filter(t => new Date(t.date) >= today).reduce((s, t) => s + t.amount, 0);
  const loanRatio = monthIncome > 0 ? activeLoanFuture / (monthIncome * 12) : (activeLoanFuture > 0 ? 1 : 0);
  const debtScore = loanRatio <= 0 ? 100
    : loanRatio <= 0.1 ? 90
    : loanRatio <= 0.25 ? 70
    : loanRatio <= 0.5 ? 45
    : 15;

  const factors: ScoreFactor[] = [
    { key: 'balance', label: 'Saldo em conta', value: balanceScore, weight: 0.10, detail: `R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { key: 'flow', label: 'Fluxo do mês', value: flowScore, weight: 0.15, detail: `Sobra: R$ ${netFlow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { key: 'card', label: 'Uso do cartão', value: cardScore, weight: 0.15, detail: totalLimit > 0 ? `${(usagePct * 100).toFixed(0)}% do limite` : 'Sem cartões' },
    { key: 'punctuality', label: 'Pagamento em dia', value: punctualityScore, weight: 0.15, detail: overdueBills > 0 ? `${overdueBills} fatura(s) em atraso` : dueSoonBills > 0 ? `${dueSoonBills} vence em ≤7d` : 'Tudo em dia' },
    { key: 'projection', label: 'Projeção 30d', value: projScore, weight: 0.15, detail: `R$ ${projected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { key: 'reserve', label: 'Reserva de emergência', value: reserveScore, weight: 0.15, detail: `${reserveMonths.toFixed(1)} meses` },
    { key: 'goals', label: 'Metas', value: goalScore, weight: 0.05, detail: gls.length ? `${gls.length} meta(s)` : 'Sem metas' },
    { key: 'budget', label: 'Orçamento', value: budgetScore, weight: 0.05, detail: relevantBudgets.length ? `${relevantBudgets.length} categoria(s)` : 'Sem orçamento' },
    { key: 'debt', label: 'Dívidas/empréstimos', value: debtScore, weight: 0.05, detail: activeLoanFuture > 0 ? `R$ ${activeLoanFuture.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a pagar` : 'Sem dívidas' },
  ];

  const weightedAvg = factors.reduce((s, f) => s + f.value * f.weight, 0);
  const score = Math.round(weightedAvg * 10); // 0..1000

  const grade: ScoreResult['grade'] =
    score >= 850 ? 'Excelente' :
    score >= 700 ? 'Bom' :
    score >= 500 ? 'Regular' :
    score >= 300 ? 'Ruim' : 'Crítico';

  return { score, grade, factors };
}
