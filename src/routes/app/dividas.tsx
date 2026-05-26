import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JONATHAN_DATA, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowDownCircle, Info, TrendingDown, Zap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';

export const Route = createFileRoute('/app/dividas')({
  component: Dividas,
});

function Dividas() {
  const [method, setMethod] = useState<'snowball' | 'avalanche'>('avalanche');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const totalDivida = JONATHAN_DATA.dividas?.reduce((acc, curr) => acc + curr.valor, 0) || 0;
  
  const sortedDividas = [...(JONATHAN_DATA.dividas || [])].sort((a, b) => {
    return method === 'snowball' ? a.valor - b.valor : b.juros - a.juros;
  });

  const chartData = [
    { mes: 'Jun/26', saldo: 5000 },
    { mes: 'Jul/26', saldo: 4400 },
    { mes: 'Ago/26', saldo: 3800 },
    { mes: 'Set/26', saldo: 3100 },
    { mes: 'Out/26', saldo: 2300 },
    { mes: 'Nov/26', saldo: 1400 },
    { mes: 'Dez/26', saldo: 0 },
  ];

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plano de Quitação de Dívidas</h1>
          <p className="text-muted-foreground">Estratégias inteligentes para zerar suas pendências financeiras.</p>
        </div>
        <div className="bg-white p-1 rounded-lg border shadow-sm">
           <Tabs value={method} onValueChange={(v: any) => setMethod(v)}>
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="snowball">Snowball</TabsTrigger>
               <TabsTrigger value="avalanche">Avalanche</TabsTrigger>
             </TabsList>
           </Tabs>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Dívida Total</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalDivida)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" /> Reduzindo 12% ao mês</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-emerald-800 uppercase">Economia com {method}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(method === 'avalanche' ? 1450.20 : 890.50)}</p>
            <p className="text-xs text-emerald-700 mt-1">Em juros evitados até a quitação.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Data de Quitação Total</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">Dezembro / 2026</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Faltam 7 meses!</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Card>
             <CardHeader><CardTitle>Ordem de Pagamento Recomendada</CardTitle></CardHeader>
             <CardContent>
                <div className="space-y-4">
                   {sortedDividas.map((d, idx) => (
                     <div key={d.id} className="flex items-center gap-4 p-4 border rounded-lg hover:border-emerald-300 transition-colors bg-white">
                        <div className="bg-emerald-100 text-emerald-700 h-8 w-8 rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{d.nome}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                             <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Juros: {d.juros}%/mês</span>
                             <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Mínimo: {formatCurrency(d.minima)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(d.valor)}</p>
                          {idx === 0 && <Badge className="bg-emerald-500">FOCO TOTAL</Badge>}
                        </div>
                     </div>
                   ))}
                </div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader><CardTitle>Projeção de Saldo Devedor</CardTitle></CardHeader>
             <CardContent className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="mes" />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="saldo" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saldo Devedor" />
                 </BarChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="bg-blue-50 border-blue-200">
             <CardHeader><CardTitle className="text-blue-900 flex items-center gap-2"><Zap className="h-5 w-5 fill-current" /> Método {method === 'snowball' ? 'Snowball' : 'Avalanche'}</CardTitle></CardHeader>
             <CardContent className="space-y-3">
                <p className="text-sm text-blue-800">
                  {method === 'snowball' 
                    ? 'Focado no psicológico: pagar as dívidas menores primeiro para gerar motivação através de conquistas rápidas.' 
                    : 'Focado na matemática: pagar as dívidas com maiores taxas de juros primeiro para economizar o máximo de dinheiro possível.'}
                </p>
                <Button variant="outline" className="w-full border-blue-300 text-blue-900 hover:bg-blue-100">Como funciona?</Button>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
