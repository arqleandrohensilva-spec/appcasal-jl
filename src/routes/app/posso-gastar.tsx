import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircleQuestion, Send, Sparkles, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/store';
import { monthlyStats } from '@/lib/finance';
import { pendingThisMonth } from '@/lib/insights';

export const Route = createFileRoute('/app/posso-gastar')({
  component: PossoGastar,
});

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  verdict?: 'yes' | 'no' | 'careful';
  breakdown?: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }[];
}

interface Ctx {
  saldo: number;
  sobraMes: number;
  pendentes: number;
  reservaMinima: number;
}

function analyze(question: string, ctx: Ctx): Message {
  const id = Math.random().toString(36).slice(2);
  const match = question.match(/(\d+[\.,]?\d*)/);
  const valor = match ? parseFloat(match[1].replace(',', '.')) : 0;

  if (valor === 0) {
    return { id, role: 'assistant', content: 'Diga um valor, por exemplo: "posso gastar R$ 300 hoje?"' };
  }

  const sobraProjetada = ctx.saldo - ctx.pendentes - valor;
  let verdict: 'yes' | 'no' | 'careful' = 'yes';
  let texto = '';

  if (sobraProjetada < 0) {
    verdict = 'no';
    texto = `Não recomendo gastar ${formatCurrency(valor)} agora. Depois dos compromissos do mês, sua sobra projetada ficaria em ${formatCurrency(sobraProjetada)} — você entraria no vermelho.`;
  } else if (sobraProjetada < ctx.reservaMinima) {
    verdict = 'careful';
    texto = `Dá pra pagar ${formatCurrency(valor)}, mas com cuidado. Sua sobra projetada cairia para ${formatCurrency(sobraProjetada)}, abaixo do colchão mínimo de ${formatCurrency(ctx.reservaMinima)}.`;
  } else {
    verdict = 'yes';
    texto = `Sim, pode gastar ${formatCurrency(valor)}. Ainda sobrariam ${formatCurrency(sobraProjetada)} depois dos compromissos do mês — folga saudável.`;
  }

  return {
    id, role: 'assistant', content: texto, verdict,
    breakdown: [
      { label: 'Saldo atual', value: formatCurrency(ctx.saldo), tone: 'neutral' },
      { label: 'Compromissos pendentes do mês', value: `− ${formatCurrency(ctx.pendentes)}`, tone: 'bad' },
      { label: 'Gasto solicitado', value: `− ${formatCurrency(valor)}`, tone: 'bad' },
      { label: 'Sobra projetada', value: formatCurrency(sobraProjetada), tone: sobraProjetada >= ctx.reservaMinima ? 'good' : 'bad' },
      { label: 'Sobra mensal típica', value: formatCurrency(ctx.sobraMes), tone: 'neutral' },
    ],
  };
}

const SUGGESTIONS = [
  'Posso gastar R$ 300 hoje?',
  'Dá pra pagar uma viagem de R$ 2.000 esse mês?',
  'Posso parcelar um tênis de R$ 600?',
  'Tenho folga pra um jantar de R$ 180?',
];

function PossoGastar() {
  const { activeProfile } = useAppContext();
  const { transactions, accounts, cards } = useData();
  const accent = activeProfile === 'leandro' ? 'purple' : activeProfile === 'jonathan' ? 'emerald' : 'orange';

  const ctx: Ctx = useMemo(() => {
    const now = new Date();
    const stats = monthlyStats(transactions, activeProfile, now.getFullYear(), now.getMonth());
    const saldo = accounts.filter(a => activeProfile === 'casal' || a.owner === activeProfile).reduce((s, a) => s + a.balance, 0);
    const pendentes = pendingThisMonth(transactions, cards, activeProfile);
    return {
      saldo,
      sobraMes: stats.receita - stats.gastos,
      pendentes,
      reservaMinima: Math.max(800, stats.gastos * 0.2),
    };
  }, [transactions, accounts, cards, activeProfile]);

  const name = activeProfile === 'leandro' ? 'Leandro' : activeProfile === 'jonathan' ? 'Jonathan' : 'pessoal';
  const [messages, setMessages] = useState<Message[]>([{
    id: 'init', role: 'assistant',
    content: `Oi, ${name}! Pergunte se pode gastar algo e eu olho seu saldo (${formatCurrency(ctx.saldo)}) e compromissos do mês antes de responder.`
  }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMessages(m => [...m, { id: Math.random().toString(36).slice(2), role: 'user', content: q }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      setMessages(m => [...m, analyze(q, ctx)]);
      setThinking(false);
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-500 h-[calc(100vh-3rem)] flex flex-col">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircleQuestion className={`h-6 w-6 text-${accent}-600`} /> Posso Gastar?
        </h1>
        <p className="text-muted-foreground">Análise baseada no seu saldo real, compromissos do mês e sobra projetada.</p>
      </header>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm space-y-3',
                m.role === 'user' ? `bg-${accent}-600 text-white` : 'bg-gray-100 text-gray-900'
              )}>
                {m.verdict && (
                  <Badge className={cn(
                    'gap-1',
                    m.verdict === 'yes' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
                    m.verdict === 'no' && 'bg-rose-100 text-rose-700 hover:bg-rose-100',
                    m.verdict === 'careful' && 'bg-amber-100 text-amber-700 hover:bg-amber-100',
                  )}>
                    {m.verdict === 'yes' && <><CheckCircle2 className="h-3 w-3" /> Sim, pode gastar</>}
                    {m.verdict === 'no' && <><XCircle className="h-3 w-3" /> Melhor não</>}
                    {m.verdict === 'careful' && <><AlertTriangle className="h-3 w-3" /> Com cuidado</>}
                  </Badge>
                )}
                <p className="leading-relaxed">{m.content}</p>
                {m.breakdown && (
                  <div className="space-y-1 pt-2 border-t border-gray-200/50">
                    {m.breakdown.map((b, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600">{b.label}</span>
                        <span className={cn('font-semibold',
                          b.tone === 'good' && 'text-emerald-600',
                          b.tone === 'bad' && 'text-rose-600',
                        )}>{b.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando seus dados...
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => ask(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600">
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: posso gastar R$ 300 hoje?" className="flex-1" />
            <Button type="submit" className={`bg-${accent}-600 hover:bg-${accent}-700 gap-2`}>
              <Send className="h-4 w-4" /> Perguntar
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Saldo {formatCurrency(ctx.saldo)} · Compromissos {formatCurrency(ctx.pendentes)} · Sobra mensal {formatCurrency(ctx.sobraMes)}
          </p>
        </div>
      </Card>
    </div>
  );
}
