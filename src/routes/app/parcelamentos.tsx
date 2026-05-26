import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA, formatCurrency } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/parcelamentos')({
  component: Parcelamentos,
});

function Parcelamentos() {
  const { activeProfile } = useAppContext();
  const data = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;
  const parcelamentos = (data as any).parcelamentos || [];

  const handleQuitar = (nome: string) => {
    toast.success(`${nome} quitado antecipadamente!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-7 w-7" /> Meus Parcelamentos</h1>
        <p className="text-muted-foreground">Gerencie suas compras parceladas e planeje seu fluxo de caixa futuro.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {parcelamentos.map((p: any) => {
          const totalPago = p.parcelasPagas * p.valorParcela;
          const totalRestante = (p.totalParcelas - p.parcelasPagas) * p.valorParcela;
          const percent = Math.round((p.parcelasPagas / p.totalParcelas) * 100);
          
          return (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{p.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Iniciou em {new Date(p.inicio).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Ativo</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Pago até hoje</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPago)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Restante</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(totalRestante)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold">Progresso do Pagamento</span>
                    <span>{p.parcelasPagas} de {p.totalParcelas} parcelas</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleQuitar(p.nome)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Quitar Antecipado
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {parcelamentos.length === 0 && (
          <Card className="col-span-full border-dashed p-12 text-center">
            <p className="text-muted-foreground">Você não possui parcelamentos ativos no momento.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
