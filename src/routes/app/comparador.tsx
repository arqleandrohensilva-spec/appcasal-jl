import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Scale, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/comparador')({
  component: Comparador,
});

function Comparador() {
  const { activeProfile } = useAppContext();
  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;
  const accent = activeProfile === 'leandro' ? 'purple' : activeProfile === 'jonathan' ? 'emerald' : 'orange';

  const [valor, setValor] = useState('1800');
  const [parcelas, setParcelas] = useState(6);
  const [juros, setJuros] = useState('2.5'); // % ao mês
  const [descricao, setDescricao] = useState('Notebook novo');

  const valorNum = parseFloat(valor) || 0;
  const jurosNum = parseFloat(juros) / 100 || 0;
  const saldo = (data as any).saldoAtual ?? 3840;
  const sobraMes = data.receita - data.gastos;

  // À vista
  const saldoAposVista = saldo - valorNum;
  const podeAVista = saldoAposVista >= 800;

  // Parcelado (sistema Price)
  const valorParcela = jurosNum > 0
    ? (valorNum * jurosNum) / (1 - Math.pow(1 + jurosNum, -parcelas))
    : valorNum / parcelas;
  const totalParcelado = valorParcela * parcelas;
  const jurosTotais = totalParcelado - valorNum;
  const sobraAposParcela = sobraMes - valorParcela;
  const comprometeMeta = sobraAposParcela < 500;

  // Oportunidade: investir o dinheiro à vista a 1% am
  const rendimento = jurosNum > 0
    ? valorNum * (Math.pow(1.01, parcelas) - 1)
    : 0;

  let veredicto: 'vista' | 'parcelado' | 'esperar' = 'vista';
  let resumo = '';
  if (!podeAVista && !comprometeMeta) {
    veredicto = 'parcelado';
    resumo = `Você não tem folga de caixa pra ${formatCurrency(valorNum)} à vista sem zerar sua reserva. As ${parcelas} parcelas de ${formatCurrency(valorParcela)} cabem na sua sobra mensal — parcelar faz sentido, mesmo pagando ${formatCurrency(jurosTotais)} em juros.`;
  } else if (podeAVista && jurosTotais > rendimento) {
    veredicto = 'vista';
    resumo = `Pagar à vista é a melhor escolha. Você economiza ${formatCurrency(jurosTotais)} em juros, e mesmo deixando o dinheiro rendendo só faria ${formatCurrency(rendimento)} no mesmo período.`;
  } else if (!podeAVista && comprometeMeta) {
    veredicto = 'esperar';
    resumo = `Nenhuma das duas opções é segura agora. À vista zera sua reserva e parcelar derruba sua sobra abaixo de ${formatCurrency(500)}, comprometendo metas. Espere acumular ou negocie um valor menor.`;
  } else {
    veredicto = 'vista';
    resumo = `Pagar à vista mantém sua reserva saudável (${formatCurrency(saldoAposVista)} restantes) e evita ${formatCurrency(jurosTotais)} em juros.`;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className={`h-6 w-6 text-${accent}-600`} /> À vista ou Parcelado?
        </h1>
        <p className="text-muted-foreground">Compare juros, impacto na sobra mensal e custo de oportunidade antes de decidir.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Dados da compra</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>O que você quer comprar</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor à vista (R$)</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Parcelas: <span className="font-bold">{parcelas}x</span></Label>
              <Slider value={[parcelas]} onValueChange={([v]) => setParcelas(v)} min={2} max={24} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Juros do parcelamento (% ao mês)</Label>
              <Input type="number" step="0.1" value={juros} onChange={(e) => setJuros(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Cartão típico: 2% a 3% a.m. Algumas lojas oferecem "sem juros" — use 0%.</p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className={cn(
            'border-2',
            veredicto === 'vista' && 'border-emerald-300 bg-emerald-50/30',
            veredicto === 'parcelado' && `border-${accent}-300`,
            veredicto === 'esperar' && 'border-amber-300 bg-amber-50/30',
          )}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                {veredicto === 'vista' && <Badge className="bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Pague à vista</Badge>}
                {veredicto === 'parcelado' && <Badge className={`bg-${accent}-600 gap-1`}><CheckCircle2 className="h-3 w-3" /> Parcele com segurança</Badge>}
                {veredicto === 'esperar' && <Badge className="bg-amber-600 gap-1"><AlertTriangle className="h-3 w-3" /> Melhor esperar</Badge>}
                <span className="text-sm text-muted-foreground">para "{descricao}"</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{resumo}</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className={cn(veredicto === 'vista' && 'ring-2 ring-emerald-400')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> À vista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Valor pago" value={formatCurrency(valorNum)} />
                <Row label="Juros" value={formatCurrency(0)} good />
                <Row label="Saldo após compra" value={formatCurrency(saldoAposVista)} bad={!podeAVista} />
                <Row label="Reserva mantida?" value={podeAVista ? 'Sim' : 'Não'} good={podeAVista} bad={!podeAVista} />
              </CardContent>
            </Card>

            <Card className={cn(veredicto === 'parcelado' && `ring-2 ring-${accent}-400`)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-600" /> Em {parcelas}x
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Parcela mensal" value={formatCurrency(valorParcela)} />
                <Row label="Total pago" value={formatCurrency(totalParcelado)} bad={jurosTotais > 0} />
                <Row label="Juros pagos" value={formatCurrency(jurosTotais)} bad={jurosTotais > 0} />
                <Row label="Sobra mensal após parcela" value={formatCurrency(sobraAposParcela)} bad={comprometeMeta} good={!comprometeMeta} />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex gap-3 text-sm text-blue-900">
              <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Custo de oportunidade</p>
                <p className="text-blue-800">
                  Se você pagasse à vista e investisse a diferença ({formatCurrency(valorParcela)}/mês) a 1% a.m. por {parcelas} meses,
                  acumularia cerca de <b>{formatCurrency(rendimento)}</b>. Compare com os <b>{formatCurrency(jurosTotais)}</b> de juros do parcelamento.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className={cn('font-semibold', good && 'text-emerald-600', bad && 'text-rose-600')}>{value}</span>
    </div>
  );
}
