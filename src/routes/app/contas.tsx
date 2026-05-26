import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SCHEDULED_TRANSACTIONS, formatCurrency, formatDate } from '@/lib/mockData';
import { useAppContext } from '@/lib/context';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute('/app/contas')({
  component: Contas,
});

function Contas() {
  const { activeProfile } = useAppContext();
  const myTransactions = SCHEDULED_TRANSACTIONS.filter(t => t.owner === activeProfile || activeProfile === 'casal');

  const payables = myTransactions.filter(t => t.type === 'payable');
  const receivables = myTransactions.filter(t => t.type === 'receivable');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">A pagar (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ 4.320,00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">A receber (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ 8.500,00</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pay" className="w-full">
        <TabsList>
          <TabsTrigger value="pay">A Pagar</TabsTrigger>
          <TabsTrigger value="receive">A Receber</TabsTrigger>
        </TabsList>
        <TabsContent value="pay">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {payables.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.dueDate)} • {t.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-red-600">-{formatCurrency(t.amount)}</span>
                      <Button size="sm" variant="outline">Baixar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="receive">
           <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {receivables.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.dueDate)} • {t.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-green-600">+{formatCurrency(t.amount)}</span>
                      <Button size="sm" variant="outline">Baixar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}