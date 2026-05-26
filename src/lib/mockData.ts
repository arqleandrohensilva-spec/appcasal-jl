export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  owner: 'leandro' | 'jonathan';
}

export interface BillItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  installments?: string; // e.g. "1/12"
}

export interface ScheduledTransaction {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  type: 'payable' | 'receivable';
  recurring: boolean;
  frequency?: 'weekly' | 'monthly' | 'yearly';
  category: string;
  status: 'pending' | 'paid' | 'overdue';
  owner: 'leandro' | 'jonathan' | 'casal';
}

export const CREDIT_CARDS: CreditCard[] = [
  { id: 'nubank-l', name: 'Nubank', limit: 8000, closingDay: 3, dueDay: 10, color: 'purple', owner: 'leandro' },
  { id: 'itau-l', name: 'Itaú Visa', limit: 5000, closingDay: 15, dueDay: 22, color: 'blue', owner: 'leandro' },
  { id: 'c6-j', name: 'C6 Gold', limit: 4000, closingDay: 8, dueDay: 15, color: 'gray', owner: 'jonathan' },
  { id: 'inter-j', name: 'Inter Mastercard', limit: 3000, closingDay: 20, dueDay: 27, color: 'orange', owner: 'jonathan' },
];

export const SCHEDULED_TRANSACTIONS: ScheduledTransaction[] = [
  // Leandro
  { id: 'l1', description: 'Salário', amount: 8500, dueDate: '2026-06-05', type: 'receivable', recurring: true, frequency: 'monthly', category: 'Renda', status: 'pending', owner: 'leandro' },
  { id: 'l2', description: 'Aluguel', amount: 1800, dueDate: '2026-06-05', type: 'payable', recurring: true, frequency: 'monthly', category: 'Moradia', status: 'pending', owner: 'leandro' },
  { id: 'l3', description: 'Condomínio', amount: 380, dueDate: '2026-06-10', type: 'payable', recurring: true, frequency: 'monthly', category: 'Moradia', status: 'pending', owner: 'leandro' },
  { id: 'l4', description: 'Internet', amount: 119.90, dueDate: '2026-06-15', type: 'payable', recurring: true, frequency: 'monthly', category: 'Assinaturas', status: 'pending', owner: 'leandro' },
  { id: 'l5', description: 'Spotify', amount: 21.90, dueDate: '2026-06-18', type: 'payable', recurring: true, frequency: 'monthly', category: 'Assinaturas', status: 'pending', owner: 'leandro' },
  { id: 'l6', description: 'Freelance', amount: 1200, dueDate: '2026-06-20', type: 'receivable', recurring: true, frequency: 'monthly', category: 'Renda', status: 'pending', owner: 'leandro' },
  // Jonathan
  { id: 'j1', description: 'Salário', amount: 6200, dueDate: '2026-06-05', type: 'receivable', recurring: true, frequency: 'monthly', category: 'Renda', status: 'pending', owner: 'jonathan' },
  { id: 'j2', description: 'Condomínio', amount: 1200, dueDate: '2026-06-05', type: 'payable', recurring: true, frequency: 'monthly', category: 'Moradia', status: 'pending', owner: 'jonathan' },
  { id: 'j3', description: 'iFood Pass', amount: 29.90, dueDate: '2026-06-22', type: 'payable', recurring: true, frequency: 'monthly', category: 'Assinaturas', status: 'pending', owner: 'jonathan' },
  { id: 'j4', description: 'Xbox Game Pass', amount: 44.90, dueDate: '2026-06-03', type: 'payable', recurring: true, frequency: 'monthly', category: 'Assinaturas', status: 'pending', owner: 'jonathan' },
];

export const BILL_ITEMS: Record<string, BillItem[]> = {
  'nubank-l': [
    { id: 'b1', description: 'TV 65" Samsung', amount: 291.67, date: '2026-05-20', category: 'Lazer', installments: '5/12' },
    { id: 'b2', description: 'Curso Udemy', amount: 49.90, date: '2026-04-10', category: 'Educação', installments: '2/3' },
    { id: 'b3', description: 'Supermercado', amount: 450, date: '2026-05-12', category: 'Alimentação' },
  ],
  'c6-j': [
    { id: 'b4', description: 'Academia anual', amount: 99.00, date: '2026-01-01', category: 'Saúde', installments: '5/12' },
    { id: 'b5', description: 'Acessório iPhone', amount: 83.33, date: '2026-03-15', category: 'Outros', installments: '3/6' },
    { id: 'b6', description: 'Jantar', amount: 150, date: '2026-05-18', category: 'Lazer' },
  ]
};

export const LEANDRO_DATA = {
  name: 'Leandro',
  color: 'bg-purple-600',
  textColor: 'text-purple-600',
  borderColor: 'border-purple-600',
  ringColor: 'ring-purple-600',
  initials: 'L',
  receita: 8500,
  gastos: 5230,
  poupanca: 3270,
  poupancaPercent: 39,
  score: 78,
  saldoAtual: 3840,
  gastosPorCategoria: [
    { name: 'Moradia', value: 1800, prevValue: 1800 },
    { name: 'Alimentação', value: 900, prevValue: 375 },
    { name: 'Transporte', value: 620, prevValue: 600 },
    { name: 'Lazer', value: 480, prevValue: 500 },
    { name: 'Saúde', value: 430, prevValue: 400 },
    { name: 'Outros', value: 1000, prevValue: 900 },
  ],
  metas: [
    { name: 'Reserva emergência', atual: 15200, alvo: 25500, prazo: '12/2026', cor: 'purple' },
    { name: 'Viagem', atual: 4800, alvo: 12000, prazo: '08/2026', cor: 'purple' },
  ],
  sinkingFunds: [
    { name: 'IPTU', atual: 800, alvo: 2400, prazo: '01/2027', aporte: 200 },
  ],
  transacoes: [
    { id: '1', descricao: 'Salário', valor: 8500, tipo: 'receita', categoria: 'Renda', data: '2026-05-05', conta: 'Nubank' },
    { id: '2', descricao: 'Aluguel', valor: 1800, tipo: 'despesa', categoria: 'Moradia', data: '2026-05-10', conta: 'Itaú' },
    { id: '3', descricao: 'Supermercado', valor: 450, tipo: 'despesa', categoria: 'Alimentação', data: '2026-05-12', conta: 'Nubank' },
  ],
  parcelamentos: [
    { id: 'tv', nome: 'TV 65" Samsung', parcelasPagas: 5, totalParcelas: 12, valorParcela: 291.67, inicio: '2026-01-01' },
    { id: 'curso', nome: 'Curso Udemy', parcelasPagas: 2, totalParcelas: 3, valorParcela: 49.90, inicio: '2026-04-01' },
  ],
  conquistas: ['Primeiro mês no verde', 'Investidor iniciante'],
  assinaturas: [
    { id: 's1', nome: 'Spotify', valor: 21.90, duplicada: true },
    { id: 's2', nome: 'Netflix', valor: 55.90, duplicada: true },
  ]
};

export const JONATHAN_DATA = {
  name: 'Jonathan',
  color: 'bg-emerald-600',
  textColor: 'text-emerald-600',
  borderColor: 'border-emerald-600',
  ringColor: 'ring-emerald-600',
  initials: 'J',
  receita: 6200,
  gastos: 4980,
  poupanca: 1220,
  poupancaPercent: 20,
  score: 65,
  saldoAtual: 2150,
  gastosPorCategoria: [
    { name: 'Alimentação', value: 1400, prevValue: 1300 },
    { name: 'Moradia', value: 1200, prevValue: 1200 },
    { name: 'Lazer', value: 800, prevValue: 700 },
    { name: 'Transporte', value: 580, prevValue: 600 },
    { name: 'Assinaturas', value: 350, prevValue: 300 },
    { name: 'Outros', value: 650, prevValue: 600 },
  ],
  metas: [
    { name: 'Reserva emergência', atual: 4500, alvo: 18600, prazo: '12/2026', cor: 'emerald' },
    { name: 'Curso', atual: 2200, alvo: 5000, prazo: '06/2026', cor: 'emerald' },
  ],
  sinkingFunds: [],
  transacoes: [
    { id: '1', descricao: 'Pró-labore', valor: 6200, tipo: 'receita', categoria: 'Renda', data: '2026-05-05', conta: 'Bradesco' },
    { id: '2', descricao: 'Condomínio', valor: 1200, tipo: 'despesa', categoria: 'Moradia', data: '2026-05-08', conta: 'Bradesco' },
  ],
  parcelamentos: [
    { id: 'iphone', nome: 'iPhone acessório', parcelasPagas: 3, totalParcelas: 6, valorParcela: 83.33, inicio: '2026-03-01' },
    { id: 'academia', nome: 'Academia anual', parcelasPagas: 5, totalParcelas: 12, valorParcela: 99.00, inicio: '2026-01-01' },
  ],
  dividas: [
    { id: 'd1', nome: 'Cartão Nubank', valor: 3200, juros: 8.9, minima: 320 },
    { id: 'd2', nome: 'Empréstimo pessoal', valor: 1800, juros: 3.2, minima: 180 },
  ],
  conquistas: ['Assinatura caçada'],
  assinaturas: [
    { id: 's1', nome: 'Spotify', valor: 21.90, duplicada: true },
    { id: 's3', nome: 'Amazon Prime', valor: 14.90, duplicada: false },
  ]
};

export const CASAL_DATA = {
  name: 'Leandro & Jonathan',
  color: 'bg-orange-500',
  textColor: 'text-orange-500',
  borderColor: 'border-orange-500',
  ringColor: 'ring-orange-500',
  initials: '❤',
  receita: 14700,
  gastos: 10210,
  poupanca: 4490,
  poupancaPercent: 31,
  patrimonio: 28400,
  score: 72,
  saldoAtual: 5990,
  metas: [
    { name: 'Viagem Europa', atual: 6800, alvo: 20000, prazo: '05/2027', cor: 'orange' },
  ],
  sinkingFunds: [
    { name: 'Presentes natal', atual: 600, alvo: 1800, prazo: '12/2026', aporte: 150 },
  ],
  alertas: [
    { title: 'Reserva emergência crítica', desc: '1.8x, meta 6x', type: 'error' },
    { title: 'Assinaturas duplicadas', desc: 'Spotify, Netflix, Amazon (R$180/mês)', type: 'warning' },
    { title: 'Taxa de poupança excelente', desc: '31% da renda combinada', type: 'success' },
  ],
  conquistas: []
};

export const CATEGORIES = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Investimentos', 'Educação', 'Outros'
];

export const ACCOUNTS = [
  'Nubank', 'Itaú', 'Bradesco', 'Dinheiro', 'Outro'
];

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

