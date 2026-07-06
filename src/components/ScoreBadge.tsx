import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Lightbulb, Sparkles } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useScore } from '@/hooks/useScore';
import { cn } from '@/lib/utils';

const RECOMMENDATIONS: Record<string, { title: string; tip: string }> = {
  balance: {
    title: 'Aumente seu saldo em conta',
    tip: 'Deixe uma reserva mínima na conta corrente. Programe transferências automáticas no dia do salário para separar o que sobra.',
  },
  flow: {
    title: 'Melhore o fluxo do mês',
    tip: 'Suas despesas estão próximas (ou acima) das receitas. Revise categorias com maior gasto em Transações e corte assinaturas ou supérfluos.',
  },
  card: {
    title: 'Reduza o uso do cartão',
    tip: 'Você está usando uma fatia alta do limite. Antecipe pagamento da fatura aberta ou distribua compras entre cartões para ficar abaixo de 30% do limite.',
  },
  punctuality: {
    title: 'Coloque as faturas em dia',
    tip: 'Há faturas atrasadas ou vencendo em breve. Marque-as como pagas em Cartões assim que quitar e programe débito automático para não repetir.',
  },
  projection: {
    title: 'Cuide da projeção de 30 dias',
    tip: 'O saldo projetado ficará baixo. Veja Fluxo de Caixa, remaneje pagamentos grandes ou antecipe recebimentos para evitar saldo negativo.',
  },
  reserve: {
    title: 'Monte sua reserva de emergência',
    tip: 'Ideal: 6 meses de despesas guardados. Crie uma meta em Metas e faça aportes mensais fixos até atingir esse valor.',
  },
  goals: {
    title: 'Avance nas suas metas',
    tip: 'Suas metas estão pouco progredidas. Defina aportes mensais realistas e registre contribuições em Metas para acompanhar a evolução.',
  },
  budget: {
    title: 'Ajuste seu orçamento',
    tip: 'Você está estourando limites por categoria. Revise em Orçamento — aumente limites realistas ou reduza gastos nas categorias mais caras.',
  },
  debt: {
    title: 'Reduza suas dívidas',
    tip: 'Empréstimos ativos pesam no score. Priorize quitar dívidas com juros altos primeiro e evite novos financiamentos até baixar o comprometimento.',
  },
};

export function ScoreBadge({ compact = false }: { compact?: boolean }) {
  const { score, grade, factors } = useScore();
  const worst = [...factors]
    .filter((f) => f.value < 70)
    .sort((a, b) => a.value * a.weight - b.value * b.weight)
    .slice(0, 3);


  const color =
    score >= 850 ? 'text-emerald-500' :
    score >= 700 ? 'text-emerald-400' :
    score >= 500 ? 'text-amber-400' :
    score >= 300 ? 'text-orange-400' : 'text-rose-500';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center gap-1 hover:underline underline-offset-2 focus:outline-none',
            compact ? 'text-[10px]' : 'text-xs',
            'text-muted-foreground',
          )}
        >
          <span>Score:</span>
          <span className={cn('font-semibold', color)}>{score}</span>
          {!compact && <Info className="h-3 w-3 opacity-60" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score financeiro</p>
            <p className={cn('text-2xl font-bold', color)}>{score}<span className="text-xs text-muted-foreground font-normal ml-1">/ 1000</span></p>
          </div>
          <span className={cn('text-xs font-semibold', color)}>{grade}</span>
        </div>
        <div className="space-y-2">
          {factors.map((f) => (
            <div key={f.key} className="text-xs">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium">{f.label}</span>
                <span className="text-muted-foreground">
                  {Math.round(f.value)} · peso {(f.weight * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    f.value >= 70 ? 'bg-emerald-500' :
                    f.value >= 40 ? 'bg-amber-400' : 'bg-rose-500',
                  )}
                  style={{ width: `${Math.max(2, Math.min(100, f.value))}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{f.detail}</p>
            </div>
          ))}
        </div>
        {worst.length > 0 && (
          <div className="mt-4 pt-3 border-t space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Como melhorar seu score
            </p>
            {worst.map((f) => {
              const rec = RECOMMENDATIONS[f.key];
              if (!rec) return null;
              return (
                <div key={f.key} className="text-xs bg-muted/40 rounded p-2">
                  <p className="font-semibold flex items-center justify-between gap-2">
                    <span>{rec.title}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{f.label} · {Math.round(f.value)}/100</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{rec.tip}</p>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
          Calculado em tempo real com base em saldo, fluxo do mês, uso de cartão, pagamento em dia, projeção 30d, reserva de emergência, metas, orçamento e dívidas.
        </p>
      </PopoverContent>
    </Popover>
  );
}
