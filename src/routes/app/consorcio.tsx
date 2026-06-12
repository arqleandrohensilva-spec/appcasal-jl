import { useEffect, useMemo, useState, type ElementType } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calculator, Home, TrendingUp, Wallet, Target, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/mockData';

export const Route = createFileRoute('/app/consorcio')({
  component: SimuladorConsorcio,
});

function chanceContemplacao(pct: number) {
  if (pct >= 35) return { label: 'Alta', desc: 'primeiros meses do grupo', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', bar: '#10b981' };
  if (pct >= 25) return { label: 'Boa', desc: 'primeiro ano', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', bar: '#10b981' };
  if (pct >= 15) return { label: 'Média', desc: '1 a 2 anos', color: 'bg-amber-100 text-amber-700 border-amber-300', bar: '#f59e0b' };
  return { label: 'Baixa', desc: 'depende de sorteio', color: 'bg-red-100 text-red-700 border-red-300', bar: '#ef4444' };
}

function SimuladorConsorcio() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [credito, setCredito] = useState(200000);
  const [lanceLivre, setLanceLivre] = useState(33800);
  const [embutidoPct, setEmbutidoPct] = useState(20);
  const [aluguel, setAluguel] = useState(1400);
  const [prazo, setPrazo] = useState(15);
  if (!mounted) return null;


  const calc = useMemo(() => {
    const n = prazo * 12;
    const taxaAdmAnual = 0.015;
    const totalAdm = credito * taxaAdmAnual * prazo;
    const parcela = (credito + totalAdm) / n;

    const embutido = credito * (embutidoPct / 100);
    const lancePctLivre = (lanceLivre / credito) * 100;
    const lancePctTotal = Math.min(((lanceLivre + embutido) / credito) * 100, 60);
    const creditoEfetivo = credito - embutido;
    const liquidoMensal = Math.max(0, parcela - aluguel);
    const coberturaAluguelPct = Math.min((aluguel / parcela) * 100, 100);

    return {
      parcela,
      embutido,
      lancePctLivre,
      lancePctTotal,
      creditoEfetivo,
      liquidoMensal,
      coberturaAluguelPct,
      chance: chanceContemplacao(lancePctTotal),
    };
  }, [credito, lanceLivre, embutidoPct, aluguel, prazo]);

  const chartData = [
    { name: 'Lance livre', valor: lanceLivre, fill: '#6366f1' },
    { name: 'Lance embutido', valor: calc.embutido, fill: '#a855f7' },
    { name: 'Crédito efetivo', valor: calc.creditoEfetivo, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <div className="flex items-center gap-2 text-orange-500 mb-1">
          <Calculator className="h-5 w-5" />
          <span className="text-sm font-medium">Simulador</span>
        </div>
        <h1 className="text-2xl font-bold">Consórcio imobiliário</h1>
        <p className="text-muted-foreground">
          Ajuste os valores e veja em tempo real a parcela, o crédito efetivo e a chance de contemplação.
        </p>
      </header>

      {/* CONTROLES */}
      <Card>
        <CardHeader>
          <CardTitle>Variáveis do consórcio</CardTitle>
          <CardDescription>Mexa nos sliders — os resultados abaixo recalculam na hora.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderField
            label="Valor do crédito"
            value={credito}
            onChange={setCredito}
            min={150000}
            max={350000}
            step={5000}
            format={formatCurrency}
          />
          <SliderField
            label="Lance livre disponível"
            value={lanceLivre}
            onChange={setLanceLivre}
            min={0}
            max={60000}
            step={500}
            format={formatCurrency}
          />
          <SliderField
            label="Lance embutido"
            value={embutidoPct}
            onChange={setEmbutidoPct}
            min={0}
            max={30}
            step={5}
            format={(v) => `${v}% do crédito`}
          />
          <SliderField
            label="Aluguel esperado do imóvel"
            value={aluguel}
            onChange={setAluguel}
            min={800}
            max={2500}
            step={50}
            format={formatCurrency}
          />
          <SliderField
            label="Prazo do consórcio"
            value={prazo}
            onChange={setPrazo}
            min={10}
            max={20}
            step={5}
            format={(v) => `${v} anos`}
          />
        </CardContent>
      </Card>

      {/* RESULTADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ResultCard
          icon={Wallet}
          label="Parcela mensal"
          value={formatCurrency(calc.parcela)}
          sub={`taxa de adm. 1,5% a.a. · ${prazo} anos`}
          accent="text-orange-600"
        />
        <ResultCard
          icon={Target}
          label="% total de lance"
          value={`${calc.lancePctTotal.toFixed(1)}%`}
          sub={`${calc.lancePctLivre.toFixed(1)}% livre + ${embutidoPct}% embutido`}
          accent="text-indigo-600"
        />
        <ResultCard
          icon={Home}
          label="Crédito efetivo"
          value={formatCurrency(calc.creditoEfetivo)}
          sub="disponível após o lance embutido"
          accent="text-emerald-600"
        />
        <ResultCard
          icon={TrendingUp}
          label="Custo líquido / mês"
          value={formatCurrency(calc.liquidoMensal)}
          sub={`aluguel cobre ${calc.coberturaAluguelPct.toFixed(0)}% da parcela`}
          accent={calc.liquidoMensal < 300 ? 'text-emerald-600' : 'text-amber-600'}
        />
        <Card className="md:col-span-2 lg:col-span-1">
          <CardContent className="pt-6 flex flex-col h-full justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Chance de contemplação</p>
              <Badge variant="outline" className={`text-sm px-3 py-1 ${calc.chance.color}`}>
                {calc.chance.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{calc.chance.desc}</p>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO */}
      <Card>
        <CardHeader>
          <CardTitle>Composição do lance vs. crédito efetivo</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(val) => formatCurrency(Number(val))} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* LEITURA */}
      <Card className="border-l-4 border-l-orange-400 bg-orange-50/50">
        <CardContent className="pt-6 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">
            Com lance livre de <strong>{formatCurrency(lanceLivre)}</strong> ({calc.lancePctLivre.toFixed(1)}% do
            crédito){embutidoPct > 0 && <> + <strong>{embutidoPct}% embutido</strong> ({formatCurrency(calc.embutido)})</>}, o
            lance total fica em <strong>{calc.lancePctTotal.toFixed(1)}%</strong> — chance de contemplação{' '}
            <strong>{calc.chance.label.toLowerCase()}</strong> ({calc.chance.desc}). O crédito efetivo de{' '}
            <strong>{formatCurrency(calc.creditoEfetivo)}</strong> permite comprar um imóvel para reforma e locação,
            com aluguel de {formatCurrency(aluguel)}/mês cobrindo {calc.coberturaAluguelPct.toFixed(0)}% da parcela de{' '}
            {formatCurrency(calc.parcela)}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="text-sm font-semibold tabular-nums">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ElementType;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <p className="text-sm">{label}</p>
        </div>
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
