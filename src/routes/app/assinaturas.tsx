import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LEANDRO_DATA, JONATHAN_DATA, formatCurrency } from '@/lib/mockData';
import { Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/assinaturas')({
  component: Assinaturas,
});

function Assinaturas() {
  const allAssinaturas = [
    ...LEANDRO_DATA.assinaturas.map(a => ({ ...a, owner: 'Leandro' })),
    ...JONATHAN_DATA.assinaturas.map(a => ({ ...a, owner: 'Jonathan' }))
  ];

  const totalPotencial = allAssinaturas
    .filter(a => a.duplicada)
    .reduce((acc, curr) => acc + curr.valor, 0) / 2; // Dividir por 2 porque a duplicata está listada nos dois

  const handleCancel = (name: string) => {
    toast.success(`Assinatura de ${name} marcada para cancelamento!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Detector de Assinaturas</h1>
        <p className="text-muted-foreground">Identificamos cobranças recorrentes e possíveis duplicatas entre o casal.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader><CardTitle className="text-orange-800 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Economia Potencial</CardTitle></CardHeader>
          <CardContent>
             <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalPotencial)}/mês</p>
             <p className="text-sm text-orange-700 mt-1">{formatCurrency(totalPotencial * 12)} ao ano economizados cancelando duplicatas.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Assinaturas Identificadas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allAssinaturas.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${a.owner === 'Leandro' ? 'bg-purple-600' : 'bg-emerald-600'}`}>
                    {a.owner[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{a.nome}</p>
                      {a.duplicada && <Badge variant="destructive" className="text-[10px] h-4">DUPLICADA</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.owner} • Mensal</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <p className="font-bold">{formatCurrency(a.valor)}</p>
                   <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleCancel(a.nome)}>
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card>
           <CardHeader><CardTitle className="text-sm">Sugestão de Plano</CardTitle></CardHeader>
           <CardContent className="space-y-4">
              <div className="flex gap-3 items-start p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">Miguelar Spotify Familiar</p>
                  <p className="text-xs text-emerald-700">Vocês gastam R$ 43,80 em dois planos individuais. O plano Duo custa R$ 27,90. Economia de R$ 15,90/mês.</p>
                </div>
              </div>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
