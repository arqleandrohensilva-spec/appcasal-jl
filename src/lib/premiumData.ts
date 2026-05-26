import { CreditCard, ScheduledTransaction, BillItem, formatCurrency } from './mockData';

export interface EmotionalTrigger {
  id: string;
  icon: string;
  title: string;
  description: string;
  frequency: string;
  cost: number;
  owner: 'leandro' | 'jonathan';
}

export interface InvestmentAsset {
  id: string;
  type: 'CDB' | 'Tesouro Direto' | 'Ações' | 'FII' | 'Cripto' | 'LCI/LCA' | 'Imóvel' | 'Veículo' | 'Outro';
  name: string;
  institution?: string;
  value: number;
  yieldAnnual?: number;
  owner: 'leandro' | 'jonathan';
  purchaseDate?: string;
  depreciationAnnual?: number;
}

export interface AgentRecommendation {
  id: string;
  type: 'money_parked' | 'goal_risk' | 'forgotten_sub' | 'savings_opp' | 'milestone';
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction?: string;
  urgency: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'ignored';
  date: string;
}

export interface LifeEvent {
  id: string;
  name: string;
  date: string;
  estimatedCost: number;
  incomeImpact?: number;
  expenseImpact?: number;
  durationMonths?: number;
  icon: string;
  color: string;
}

export const EMOTIONAL_TRIGGERS: EmotionalTrigger[] = [
  {
    id: 't1',
    icon: '🌙',
    title: 'Gatilho noturno em delivery',
    description: 'Jonathan gasta 3.2x mais em Alimentação entre 21h–23h às sextas.',
    frequency: '8x nos últimos 3 meses',
    cost: 944,
    owner: 'jonathan'
  },
  {
    id: 't2',
    icon: '📅',
    title: 'Lazer fim de mês',
    description: 'Gastos de lazer 67% acima da média entre os dias 25 e 31.',
    frequency: 'Todos os meses',
    cost: 480,
    owner: 'jonathan'
  },
  {
    id: 't3',
    icon: '🛍',
    title: 'Compras online domingo à tarde',
    description: 'Leandro gasta 2.1x mais em Compras no domingo à tarde.',
    frequency: '5x nos últimos 2 meses',
    cost: 1200,
    owner: 'leandro'
  }
];

export const PATRIMONIO_ASSETS: InvestmentAsset[] = [
  // Leandro
  { id: 'a1', type: 'Tesouro Direto', name: 'Tesouro Selic 2027', institution: 'Tesouro Nacional', value: 15200, yieldAnnual: 11.75, owner: 'leandro' },
  { id: 'a2', type: 'CDB', name: 'CDB Nubank 100% CDI', institution: 'Nubank', value: 8400, yieldAnnual: 10.65, owner: 'leandro' },
  { id: 'a3', type: 'Veículo', name: 'Honda Civic 2022', value: 98000, depreciationAnnual: 15, owner: 'leandro' },
  // Jonathan
  { id: 'a4', type: 'Ações', name: 'Carteira Diversificada', institution: 'Inter', value: 3200, yieldAnnual: 15, owner: 'jonathan' },
  { id: 'a5', type: 'Tesouro Direto', name: 'Poupança Inter', institution: 'Inter', value: 4500, yieldAnnual: 6, owner: 'jonathan' },
];

export const AGENT_RECOMMENDATIONS: AgentRecommendation[] = [
  {
    id: 'r1',
    type: 'money_parked',
    title: 'Dinheiro Parado',
    description: 'Leandro tem R$ 1.840 em conta corrente há 14 dias sem movimentação. Transferir para reserva de emergência?',
    primaryAction: 'Aprovar',
    secondaryAction: 'Ignorar',
    urgency: 'medium',
    status: 'pending',
    date: '2026-05-24'
  },
  {
    id: 'r2',
    type: 'goal_risk',
    title: 'Meta em Risco',
    description: 'No ritmo atual, Jonathan não baterá a meta \'Quitar cartão\' até a data prevista. Reduzir Lazer em R$ 200/mês resolve.',
    primaryAction: 'Ajustar meta',
    urgency: 'high',
    status: 'pending',
    date: '2026-05-23'
  },
  {
    id: 'r3',
    type: 'savings_opp',
    title: 'Oportunidade de Economia',
    description: 'Vocês dois têm Spotify separado (R$ 21,90 + R$ 21,90). Plano Duo: R$ 26,90. Economia: R$ 202/ano.',
    primaryAction: 'Anotar',
    urgency: 'low',
    status: 'pending',
    date: '2026-05-22'
  }
];

export const LIFE_EVENTS: LifeEvent[] = [
  { id: 'e1', name: 'Apartamento próprio', date: '2028-01', estimatedCost: 80000, expenseImpact: 2800, durationMonths: 240, icon: '🏠', color: 'bg-blue-500' },
  { id: 'e2', name: 'Viagem sabática', date: '2027-07', estimatedCost: 25000, incomeImpact: -0.5, durationMonths: 3, icon: '✈️', color: 'bg-emerald-500' }
];

export const RETROSPECTIVA_2026 = {
  leandro: {
    total_movimentado: 87340,
    total_transacoes: 487,
    mes_mais_caro: "Outubro",
    valor_outubro: 9840,
    categoria_top: "Moradia",
    valor_moradia: 21600,
    poupanca_anual: 39240,
    taxa_poupanca: 0.39,
    meta_destaque: "Reserva de emergência",
    progresso: 0.72
  }
};
