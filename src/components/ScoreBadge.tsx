import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import { useScore } from '@/hooks/useScore';
import { cn } from '@/lib/utils';

export function ScoreBadge({ compact = false }: { compact?: boolean }) {
  const { score, grade, factors } = useScore();

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
        <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
          Calculado em tempo real com base em saldo, fluxo do mês, uso de cartão, pagamento em dia, projeção 30d, reserva de emergência, metas, orçamento e dívidas.
        </p>
      </PopoverContent>
    </Popover>
  );
}
