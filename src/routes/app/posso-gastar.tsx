import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircleQuestion, Send, Sparkles, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function analyze(question: string, data: typeof LEANDRO_DATA): Message {
  const id = Math.random().toString(36).slice(2);
  const match = question.match(/(\d+[\.,]?\d*)/);
  const valor = match ? parseFloat(match[1].replace(',', '.')) : 0;

  const saldo = data.saldoAtual ?? 3840;
  const receitaMes = data.receita;
  const gastosMes = data.gastos;
  const sobraMes = receitaMes - gastosMes;
  const compromissosPendentes = 1380; // parcelas + contas restantes do mês
  const sobraProjetada = saldo - compromissosPendentes - valor;
  const reservaMinima = 800;

  let verdict: 'yes' | 'no' | 'careful' = 'yes';
  let texto = '';

  if (valor === 0) {
    return {
      id, role: 'assistant',
      content: 'Diga um valor, por exemplo: "posso gastar R$ 300 hoje?" ou "dá pra pagar uma viagem de R$ 2.000 esse mês?"'
    };
  }

  if (sobraProjetada < 0) {
    verdict = 'no';
    texto = `Não recomendo gastar ${formatCurrency(valor)} agora. Depois dos compromissos pendentes do mês, sua sobra projetada ficaria em ${formatCurrency(sobraProjetada)} — você entraria no vermelho.`;
  } else if (sobraProjetada < reservaMinima) {
    verdict = 'careful';
    texto = `Dá pra pagar ${formatCurrency(valor)}, mas com cuidado. Sua sobra projetada cairia para ${formatCurrency(sobraProjetada)}, abaixo do colchão mínimo de ${formatCurrency(reservaMinima)} que você costuma manter.`;
  } else {
    verdict = 'yes';
    texto = `Sim, pode gastar ${formatCurrency(valor)}. Mesmo depois dos compromissos do mês, ainda sobrariam ${formatCurrency(sobraProjetada)} — folga saudável.`;
  }

  return {
    id, role: 'assistant', content: texto, verdict,
    breakdown: [
      { label: 'Saldo atual', value: formatCurrency(saldo), tone: 'neutral' },
      { label: 'Compromissos pendentes do mês', value: `− ${formatCurrency(compromissosPendentes)}`, tone: 'bad' },
      { label: 'Gasto que você quer fazer', value: `− ${formatCurrency(valor)}`, tone: 'bad' },
      { label: 'Sobra projetada', value: formatCurrency(sobraProjetada), tone: sobraProjetada >= reservaMinima ? 'good' : 'bad' },
      { label: 'Sobra mensal típica', value: formatCurrency(sobraMes), tone: 'neutral' },
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
  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;
  const accent = activeProfile === 'leandro' ? 'purple' : activeProfile === 'jonathan' ? 'emerald' : 'orange';

  const [messages, setMessages] = useState<Message[]>([{
    id: 'init', role: 'assistant',
    content: `Oi, ${data.name}! Pergunte se pode gastar algo agora e eu olho seu saldo, parcelas e compromissos do mês antes de responder.`
  }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    const userMsg: Message = { id: Math.random().toString(36).slice(2), role: 'user', content: q };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      setMessages(m => [...m, analyze(q, data as typeof LEANDRO_DATA)]);
      setThinking(false);
    }, 900);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-500 h-[calc(100vh-3rem)] flex flex-col">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircleQuestion className={`h-6 w-6 text-${accent}-600`} /> Posso Gastar?
        </h1>
        <p className="text-muted-foreground">Pergunte em linguagem natural — a IA olha seus dados reais antes de responder.</p>
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: posso gastar R$ 300 hoje?"
              className="flex-1"
            />
            <Button type="submit" className={`bg-${accent}-600 hover:bg-${accent}-700 gap-2`}>
              <Send className="h-4 w-4" /> Perguntar
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Respostas baseadas no seu saldo, parcelas e compromissos do mês.
          </p>
        </div>
      </Card>
    </div>
  );
}
