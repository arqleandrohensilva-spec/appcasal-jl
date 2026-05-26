import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAppContext } from '@/lib/context';
import { formatCurrency, LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA } from '@/lib/mockData';
import { AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/app/fluxo')({
  component: FluxoCaixa,
});

const data = [
  { date: '26/05', balance: 3840 },
  { date: '27/05', balance: 3840 },
  { date: '28/05', balance: 3720 },
  { date: '01/06', balance: 3500 },
  { date: '05/06', balance: 10200 },
  { date: '10/06', balance: 9820 },
  { date: '14/06', balance: -200 },
  { date: '15/06', balance: 1500 },
];

function FluxoCaixa() {
  const { activeProfile } = useAppContext();
  const currentData = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fluxo de Caixa Projetado</h1>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertCircle className="text-amber-600 h-5 w-5 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Atenção para o dia 14/06</p>
            <p className="text-sm text-amber-800">Seu saldo pode ficar negativo. Você tem R$ 2.340 para pagar e R$ 0 previsto de entrada.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projeção para os próximos 30 dias</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(val) => `R$ ${val}`} />
              <Tooltip formatter={(val) => formatCurrency(Number(val))} />
              <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
              <ReferenceLine y={500} stroke="#EAB308" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="balance" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Linha do Tempo</h2>
        <div className="space-y-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">HOJE — 26/05/2026</span>
                <span className="text-sm">Saldo atual: {formatCurrency(currentData.saldoAtual || 3840)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                  <span>↓ Fatura Nubank</span>
                  <span className="font-bold text-red-600">-R$ 2.340,00</span>
                </div>
                <div className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                  <span>↑ Salário</span>
                  <span className="font-bold text-green-600">+R$ 8.500,00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}