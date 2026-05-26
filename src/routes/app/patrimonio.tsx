import { createFileRoute } from '@tanstack/react-router';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { PATRIMONIO_ASSETS } from '@/lib/premiumData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, TrendingUp, Building2, Car, Wallet, Landmark } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Route = createFileRoute('/app/patrimonio')({
  component: Patrimonio,
});

function Patrimonio() {
  const { activeProfile } = useAppContext();
  
  const userAssets = PATRIMONIO_ASSETS.filter(a => activeProfile === 'casal' ? true : a.owner === activeProfile);
  const totalAssets = userAssets.reduce((acc, a) => acc + a.value, 0);
  
  // Mocked passives
  const passives = activeProfile === 'leandro' ? 3230 : activeProfile === 'jonathan' ? 3900 : 7130;
  const netWorth = totalAssets - passives;
  const growth = activeProfile === 'leandro' ? 2340 : 420;

  const chartData = [
    { name: 'Investimentos', value: userAssets.filter(a => ['CDB', 'Tesouro Direto', 'Ações'].includes(a.type)).reduce((acc, a) => acc + a.value, 0) },
    { name: 'Imóveis', value: userAssets.filter(a => a.type === 'Imóvel').reduce((acc, a) => acc + a.value, 0) },
    { name: 'Veículos', value: userAssets.filter(a => a.type === 'Veículo').reduce((acc, a) => acc + a.value, 0) },
    { name: 'Liquidez', value: activeProfile === 'leandro' ? 5040 : 2900 },
  ].filter(d => d.value > 0);

  const colors = ['#8b5cf6', '#34d399', '#f59e0b', '#3b82f6'];

  const historyData = [
    { month: 'Jan', value: netWorth * 0.9 },
    { month: 'Fev', value: netWorth * 0.92 },
    { month: 'Mar', value: netWorth * 0.95 },
    { month: 'Abr', value: netWorth * 0.98 },
    { month: 'Mai', value: netWorth },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Patrimônio</h1>
        <p className="text-muted-foreground">Visão consolidada de seus ativos e passivos</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <CardHeader className="pb-2 text-gray-400 text-xs uppercase font-bold tracking-wider">Patrimônio Líquido</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(netWorth)}</div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm mt-2">
              <ArrowUpRight className="h-4 w-4" />
              {formatCurrency(growth)} este mês (+8.2%)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-muted-foreground text-xs uppercase font-bold tracking-wider">Total Ativos</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAssets)}</div>
            <p className="text-xs text-muted-foreground mt-1">Investimentos, Bens e Contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-muted-foreground text-xs uppercase font-bold tracking-wider">Total Passivos</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(passives)}</div>
            <p className="text-xs text-muted-foreground mt-1">Dívidas e Faturas em aberto</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Composição dos Ativos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Evolução</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="passivos">Passivos</TabsTrigger>
        </TabsList>
        <TabsContent value="ativos" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userAssets.map(asset => (
              <Card key={asset.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {asset.type === 'Veículo' ? <Car className="h-5 w-5" /> : asset.type === 'Imóvel' ? <Building2 className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.type} • {asset.institution || 'Bem próprio'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(asset.value)}</p>
                    {asset.yieldAnnual && <p className="text-[10px] text-emerald-600">+{asset.yieldAnnual}% a.a.</p>}
                    {asset.depreciationAnnual && <p className="text-[10px] text-rose-600">-{asset.depreciationAnnual}% a.a.</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="passivos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-gray-400" />
                    <span>Faturas de Cartão</span>
                  </div>
                  <span className="font-bold">{formatCurrency(passives)}</span>
                </div>
                <div className="p-4 flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-gray-400" />
                    <span>Empréstimos</span>
                  </div>
                  <span className="font-bold">{formatCurrency(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-gray-100 p-6 rounded-2xl text-center">
        <p className="text-muted-foreground mb-2">Projeção em 5 anos no ritmo atual</p>
        <p className="text-4xl font-black text-gray-900">{formatCurrency(netWorth * 1.5)}</p>
      </div>
    </div>
  );
}
