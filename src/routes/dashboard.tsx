import { createFileRoute } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const { activeProfile } = useAppContext();
  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-muted-foreground">Mês: Maio 2026</p>
        </div>
        <Badge className={`${data.color} text-white`}>Score: {data.score}</Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Receita</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(data.receita)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Gastos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">{formatCurrency(data.gastos)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Poupança</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">{formatCurrency(data.poupanca)} ({'poupancaPercent' in data ? (data as any).poupancaPercent : 31}%)</CardContent>
        </Card>
      </div>

      {activeProfile !== 'casal' && (
        <Card>
          <CardHeader><CardTitle>Distribuição de Gastos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.gastosPorCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" label>
                  {data.gastosPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#8b5cf6', '#34d399', '#f59e0b', '#ef4444', '#3b82f6', '#6366f1'][index % 6]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
