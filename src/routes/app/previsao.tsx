import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react';

export const Route = createFileRoute('/app/previsao')({
  component: Previsao,
});

function Previsao() {
  const { activeProfile } = useAppContext();
  const [economy, setEconomy] = useState(0);
  const [leisureReduction, setLeisureReduction] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  const generateProjection = () => {
    const projection = [];
    let currentBalance = data.poupanca * 5; // Simulação de saldo inicial
    const baseDailyExpenses = data.gastos / 30;
    
    for (let i = 0; i < 90; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Simular entradas e saídas
      if (date.getDate() === 5) currentBalance += data.receita;
      
      const adjustedExpenses = baseDailyExpenses * (1 - (leisureReduction / 100) * 0.3);
      currentBalance -= (adjustedExpenses - (economy / 30));
      
      projection.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        saldo: Math.round(currentBalance),
        rawDate: date
      });
    }
    return projection;
  };

  const projection = generateProjection();
  const lowBalance = projection.some(p => p.saldo < 0);
  const attentionBalance = projection.some(p => p.saldo < 500 && p.saldo >= 0);

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Fluxo de Caixa Futuro (90 dias)</h1>
        <p className="text-muted-foreground">Projeção detalhada baseada em seus gastos recorrentes e parcelamentos.</p>
      </header>

      {lowBalance && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">Alerta: Saldo projetado negativo identificado nos próximos 90 dias!</p>
        </div>
      )}

      {attentionBalance && !lowBalance && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center gap-3 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">Atenção: Saldo projetado abaixo de R$ 500,00 identificado.</p>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Projeção de Saldo</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="saldo" stroke="#7C3AED" fillOpacity={1} fill="url(#colorSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Simulador "E Se?"</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Economia extra mensal: {formatCurrency(economy)}</Label>
              <Slider value={[economy]} max={5000} step={50} onValueChange={(v) => setEconomy(v[0])} />
            </div>
            <div className="space-y-3">
              <Label>Redução em lazer: {leisureReduction}%</Label>
              <Slider value={[leisureReduction]} max={100} step={5} onValueChange={(v) => setLeisureReduction(v[0])} />
            </div>
            <div className="pt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Impacto Estimado</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">
                {economy > 1000 ? 'Baterá meta 2 meses antes!' : 'Mais fôlego no orçamento'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Compromissos de Cartão</CardTitle></CardHeader>
          <CardContent>
             <div className="space-y-4">
                {(data as any).parcelamentos?.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">Parcela {p.parcelasPagas}/{p.totalParcelas}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(p.valorParcela)}</p>
                      <p className="text-[10px] text-amber-600 bg-amber-50 px-1.5 rounded inline-block">Parcelado</p>
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
