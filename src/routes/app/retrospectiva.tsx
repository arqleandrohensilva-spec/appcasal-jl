import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { RETROSPECTIVA_2026 } from '@/lib/premiumData';
import { formatCurrency } from '@/lib/mockData';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Share2, Sparkles, Heart, Trophy, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export const Route = createFileRoute('/app/retrospectiva')({
  component: Retrospectiva,
});

function Retrospectiva() {
  const { activeProfile } = useAppContext();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const data = activeProfile === 'leandro' ? RETROSPECTIVA_2026.leandro : RETROSPECTIVA_2026.leandro; // Fallback to leandro for mock

  useEffect(() => {
    if (currentSlide === 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: activeProfile === 'leandro' ? ['#8b5cf6', '#a78bfa'] : ['#10b981', '#34d399']
      });
    }
  }, [currentSlide, activeProfile]);

  const slides = [
    {
      id: 'welcome',
      content: (
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-black leading-tight">2026 em números, {activeProfile === 'leandro' ? 'Leandro' : 'Jonathan'}</h1>
          <p className="text-xl opacity-80">Foi um ano e tanto. Veja o resumo do seu impacto financeiro.</p>
          <Sparkles className="h-16 w-16 mx-auto opacity-50 animate-pulse" />
        </div>
      )
    },
    {
      id: 'total',
      content: (
        <div className="text-center space-y-4">
          <p className="text-xl uppercase tracking-widest font-bold opacity-70">Você movimentou</p>
          <div className="text-7xl font-black tabular-nums">{formatCurrency(data.total_movimentado)}</div>
          <p className="text-2xl">em 2026</p>
          <div className="pt-8 text-lg opacity-80">{data.total_transacoes} transações registradas</div>
        </div>
      )
    },
    {
      id: 'category',
      content: (
        <div className="text-center space-y-8">
          <p className="text-xl font-bold opacity-70">Você mais gastou com...</p>
          <div className="bg-white/20 p-8 rounded-full w-48 h-48 mx-auto flex items-center justify-center">
            <span className="text-8xl">🏠</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-bold">{formatCurrency(data.valor_moradia)}</h2>
            <p className="text-2xl">em {data.categoria_top}</p>
          </div>
          <p className="text-lg opacity-80">= {Math.round(data.taxa_poupanca * 100)}% de tudo que gastou</p>
        </div>
      )
    },
    {
      id: 'savings',
      content: (
        <div className="text-center space-y-6">
          <p className="text-xl font-bold opacity-70">Mas você também guardou...</p>
          <div className="text-7xl font-black text-white">{formatCurrency(data.poupanca_anual)}</div>
          <p className="text-2xl">39% da sua renda — top 10% do Brasil</p>
          <Trophy className="h-20 w-20 mx-auto text-yellow-300 animate-bounce mt-4" />
        </div>
      )
    },
    {
      id: 'casal',
      content: (
        <div className="text-center space-y-6">
          <Heart className="h-16 w-16 mx-auto text-rose-300 fill-current" />
          <h2 className="text-4xl font-bold">Juntos, vocês...</h2>
          <div className="space-y-4 text-2xl font-medium">
            <p>Pouparam R$ 53.880 em 2026</p>
            <p>Têm patrimônio de R$ 214.000</p>
            <p>Bateram 2 metas compartilhadas</p>
          </div>
        </div>
      )
    },
    {
      id: 'end',
      content: (
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-bold">2027 começa agora.</h2>
          <p className="text-xl opacity-80">Qual sua maior meta para o ano que vem?</p>
          <input 
            type="text" 
            placeholder="Ex: Comprar meu apartamento" 
            className="w-full max-w-sm bg-white/10 border-2 border-white/20 rounded-xl p-4 text-center text-xl placeholder:text-white/40 focus:outline-none focus:border-white/50"
          />
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-white text-gray-900 hover:bg-white/90 gap-2">
              <Share2 className="h-5 w-5" /> Compartilhar
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate({ to: '/app/dashboard' })}>
              Concluir
            </Button>
          </div>
        </div>
      )
    }
  ];

  const bgColor = activeProfile === 'leandro' ? 'bg-purple-600' : activeProfile === 'jonathan' ? 'bg-emerald-600' : 'bg-orange-500';

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-6 transition-colors duration-700", bgColor)}>
      <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate({ to: '/app/dashboard' })}>
        <X className="h-8 w-8" />
      </Button>

      {/* Progress Bars */}
      <div className="absolute top-6 left-6 right-16 flex gap-1">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className={cn("h-full bg-white transition-all duration-300", i < currentSlide ? 'w-full' : i === currentSlide ? 'w-full' : 'w-0')} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        {slides[currentSlide].content}
      </div>

      <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer" onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))} />
      <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer" onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))} />

      <div className="absolute bottom-12 flex gap-4">
        {currentSlide > 0 && (
          <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => setCurrentSlide(prev => prev - 1)}>
            <ChevronLeft className="h-6 w-6 mr-2" /> Anterior
          </Button>
        )}
        {currentSlide < slides.length - 1 && (
          <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => setCurrentSlide(prev => prev + 1)}>
            Próximo <ChevronRight className="h-6 w-6 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
