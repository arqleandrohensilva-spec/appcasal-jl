import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Sparkles, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useData } from '@/lib/store';
import { yearTotals } from '@/lib/insights';

export const Route = createFileRoute('/app/retrospectiva')({
  component: Retrospectiva,
});

function Retrospectiva() {
  const { activeProfile } = useAppContext();
  const { transactions } = useData();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  const year = new Date().getFullYear();
  const totals = useMemo(() => yearTotals(transactions, activeProfile, year), [transactions, activeProfile, year]);
  const name = activeProfile === 'leandro' ? 'Leandro' : activeProfile === 'jonathan' ? 'Jonathan' : 'casal';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (currentSlide === 0) {
      confetti({
        particleCount: 100, spread: 70, origin: { y: 0.6 },
        colors: activeProfile === 'leandro' ? ['#8b5cf6', '#a78bfa'] : activeProfile === 'jonathan' ? ['#10b981', '#34d399'] : ['#f97316', '#fb923c'],
      });
    }
  }, [currentSlide, activeProfile, mounted]);

  const slides = [
    {
      content: (
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-black leading-tight">{year} em números, {name}</h1>
          <p className="text-xl opacity-80">Seu resumo financeiro do ano até aqui.</p>
          <Sparkles className="h-16 w-16 mx-auto opacity-50 animate-pulse" />
        </div>
      )
    },
    {
      content: (
        <div className="text-center space-y-4">
          <p className="text-xl uppercase tracking-widest font-bold opacity-70">Você movimentou</p>
          <div className="text-7xl font-black tabular-nums">{formatCurrency(totals.totalMovimentado)}</div>
          <p className="text-2xl">em {year}</p>
          <div className="pt-8 text-lg opacity-80">{totals.txCount} transações registradas</div>
        </div>
      )
    },
    {
      content: (
        <div className="text-center space-y-6">
          <p className="text-xl font-bold opacity-70">Sua categoria campeã</p>
          <div className="bg-white/20 p-8 rounded-full w-44 h-44 mx-auto flex items-center justify-center">
            <span className="text-8xl">📊</span>
          </div>
          <h2 className="text-4xl font-bold">{formatCurrency(totals.topCategoryValue)}</h2>
          <p className="text-2xl">em {totals.topCategory}</p>
        </div>
      )
    },
    {
      content: (
        <div className="text-center space-y-6">
          <p className="text-xl font-bold opacity-70">Você guardou</p>
          <div className="text-7xl font-black">{formatCurrency(Math.max(0, totals.saldoAno))}</div>
          <p className="text-2xl">{Math.round(totals.taxaPoupanca * 100)}% da sua renda anual</p>
          <Trophy className="h-20 w-20 mx-auto text-yellow-300 animate-bounce mt-4" />
        </div>
      )
    },
    {
      content: (
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-bold">Top categorias</h2>
          <div className="space-y-3 text-left max-w-md mx-auto">
            {totals.catRanking.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex justify-between bg-white/10 rounded-xl px-5 py-3">
                <span className="font-bold">{i + 1}. {c.name}</span>
                <span>{formatCurrency(c.value)}</span>
              </div>
            ))}
            {totals.catRanking.length === 0 && <p className="text-center opacity-70">Sem dados ainda — registre transações!</p>}
          </div>
        </div>
      )
    },
    {
      content: (
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-bold">{year + 1} começa em breve.</h2>
          <p className="text-xl opacity-80">Continue acompanhando suas finanças.</p>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate({ to: '/app/dashboard' })}>
            Voltar ao Dashboard
          </Button>
        </div>
      )
    },
  ];

  const bgColor = activeProfile === 'leandro' ? 'bg-purple-600' : activeProfile === 'jonathan' ? 'bg-emerald-600' : 'bg-orange-500';

  if (!mounted) return null;

  return (
    <div className={cn('fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-6 transition-colors duration-700', bgColor)}>
      <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate({ to: '/app/dashboard' })}>
        <X className="h-8 w-8" />
      </Button>

      <div className="absolute top-6 left-6 right-16 flex gap-1">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className={cn('h-full bg-white transition-all duration-300', i <= currentSlide ? 'w-full' : 'w-0')} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700" key={currentSlide}>
        {slides[currentSlide].content}
      </div>

      <div className="absolute bottom-12 flex gap-4">
        {currentSlide > 0 && (
          <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => setCurrentSlide(p => p - 1)}>
            <ChevronLeft className="h-6 w-6 mr-2" /> Anterior
          </Button>
        )}
        {currentSlide < slides.length - 1 && (
          <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => setCurrentSlide(p => p + 1)}>
            Próximo <ChevronRight className="h-6 w-6 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
