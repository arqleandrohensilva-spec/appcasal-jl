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
    { name: 'Moradia', value: 1800 },
    { name: 'Alimentação', value: 900 },
    { name: 'Transporte', value: 620 },
    { name: 'Lazer', value: 480 },
    { name: 'Saúde', value: 430 },
    { name: 'Outros', value: 1000 },
  ],
  metas: [
    { name: 'Reserva emergência', atual: 15200, alvo: 25500, prazo: '12/2026', cor: 'purple' },
    { name: 'Viagem', atual: 4800, alvo: 12000, prazo: '08/2026', cor: 'purple' },
    { name: 'Investimentos mensais', atual: 2100, alvo: 3000, prazo: 'Mensal', cor: 'purple' },
  ],
  transacoes: [
    { id: '1', descricao: 'Salário', valor: 8500, tipo: 'receita', categoria: 'Renda', data: '05/05/2026', conta: 'Nubank' },
    { id: '2', descricao: 'Aluguel', valor: 1800, tipo: 'despesa', categoria: 'Moradia', data: '10/05/2026', conta: 'Itaú' },
    { id: '3', descricao: 'Supermercado', valor: 450, tipo: 'despesa', categoria: 'Alimentação', data: '12/05/2026', conta: 'Nubank' },
    { id: '4', descricao: 'Restaurante', valor: 120, tipo: 'despesa', categoria: 'Lazer', data: '15/05/2026', conta: 'Cartão de Crédito' },
    { id: '5', descricao: 'Academia', valor: 150, tipo: 'despesa', categoria: 'Saúde', data: '18/05/2026', conta: 'Nubank' },
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
    { name: 'Alimentação', value: 1400 },
    { name: 'Moradia', value: 1200 },
    { name: 'Lazer', value: 800 },
    { name: 'Transporte', value: 580 },
    { name: 'Assinaturas', value: 350 },
    { name: 'Outros', value: 650 },
  ],
  metas: [
    { name: 'Reserva emergência', atual: 4500, alvo: 18600, prazo: '12/2026', cor: 'emerald' },
    { name: 'Curso', atual: 2200, alvo: 5000, prazo: '06/2026', cor: 'emerald' },
    { name: 'Quitar cartão', atual: 1100, alvo: 3200, prazo: '04/2026', cor: 'emerald' },
  ],
  transacoes: [
    { id: '1', descricao: 'Pró-labore', valor: 6200, tipo: 'receita', categoria: 'Renda', data: '05/05/2026', conta: 'Bradesco' },
    { id: '2', descricao: 'Condomínio', valor: 1200, tipo: 'despesa', categoria: 'Moradia', data: '08/05/2026', conta: 'Bradesco' },
    { id: '3', descricao: 'iFood', valor: 250, tipo: 'despesa', categoria: 'Alimentação', data: '11/05/2026', conta: 'Cartão de Crédito' },
    { id: '4', descricao: 'Netflix', valor: 55, tipo: 'despesa', categoria: 'Assinaturas', data: '14/05/2026', conta: 'Nubank' },
    { id: '5', descricao: 'Cinema', valor: 80, tipo: 'despesa', categoria: 'Lazer', data: '16/05/2026', conta: 'Dinheiro' },
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
    { name: 'Fundo compartilhado', atual: 3200, alvo: 10000, prazo: '12/2026', cor: 'orange' },
    { name: 'Investimento conjunto', atual: 9600, alvo: 30000, prazo: '12/2028', cor: 'orange' },
  ],
  alertas: [
    { title: 'Reserva emergência crítica', desc: '1.8x, meta 6x', type: 'error' },
    { title: 'Assinaturas duplicadas', desc: 'Spotify, Netflix, Amazon (R$180/mês)', type: 'warning' },
    { title: 'Taxa de poupança excelente', desc: '31% da renda combinada', type: 'success' },
  ]
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
