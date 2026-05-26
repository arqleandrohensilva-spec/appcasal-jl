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
  gastosPorCategoria: [
    { name: 'Moradia', value: 1800, prevValue: 1800 },
    { name: 'Alimentação', value: 900, prevValue: 375 }, // Anomalia proposital: 2.4x mais
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
    { id: '4', descricao: 'Restaurante', valor: 120, tipo: 'despesa', categoria: 'Lazer', data: '2026-05-15', conta: 'Cartão de Crédito' },
    { id: 'p1', descricao: 'TV 65" Samsung (5/12)', valor: 291.67, tipo: 'despesa', categoria: 'Lazer', data: '2026-05-20', conta: 'Cartão de Crédito', parcelado: true },
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
    { id: 'p2', descricao: 'iPhone acessório (3/6)', valor: 83.33, tipo: 'despesa', categoria: 'Outros', data: '2026-05-15', conta: 'Cartão de Crédito', parcelado: true },
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
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Investimentos', 'Outros'
];

export const ACCOUNTS = [
  'Nubank', 'Itaú', 'Bradesco', 'Cartão de Crédito', 'Dinheiro', 'Outro'
];

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
