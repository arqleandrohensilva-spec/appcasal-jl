import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/app/relatorios')({
  component: Relatorios,
});

const mockEvolution = [
  { mes: 'Dez', receita: 12000, gastos: 9000 },
  { mes: 'Jan', receita: 13500, gastos: 8500 },
  { mes: 'Fev', receita: 14000, gastos: 10000 },
  { mes: 'Mar', receita: 13800, gastos: 9500 },
  { mes: 'Abr', receita: 14700, gastos: 10500 },
  { mes: 'Mai', receita: 14700, gastos: 10210 },
];

function Relatorios() {
  const { activeProfile } = useAppContext();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  if (!isMounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios e Análise</h1>
          <p className="text-muted-foreground">Evolução do seu patrimônio</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="2026">
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2026">2026</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="maio">
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="maio">Maio</SelectItem></SelectContent>
          </Select>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Receita vs Gastos (Últimos 6 meses)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita" />
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} name="Gastos" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Maiores Gastos por Categoria</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {((data as any).gastosPorCategoria || (activeProfile === 'casal' ? LEANDRO_DATA.gastosPorCategoria : [])).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2">
                   <div>
                     <p className="font-medium">{item.name}</p>
                     <p className="text-xs text-muted-foreground">{Math.round((item.value / data.gastos) * 100)}% do total</p>
                   </div>
                   <p className="font-bold">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeProfile === 'casal' && (
          <Card>
            <CardHeader><CardTitle>Comparativo: Leandro vs Jonathan</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { category: 'Alimentação', L: 900, J: 1400 },
                  { category: 'Moradia', L: 1800, J: 1200 },
                  { category: 'Lazer', L: 480, J: 800 },
                  { category: 'Transporte', L: 620, J: 580 },
                ]}>
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="L" fill="#8b5cf6" name="Leandro" />
                  <Bar dataKey="J" fill="#10b981" name="Jonathan" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
