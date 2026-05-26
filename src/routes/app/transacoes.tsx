import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CATEGORIES, ACCOUNTS, formatCurrency } from '@/lib/mockData';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/app/transacoes')({
  component: Transacoes,
});

function Transacoes() {
  const navigate = useNavigate();
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [installments, setInstallments] = useState("1");
  const [valor, setValor] = useState("");

  const parcelasNum = parseInt(installments) || 1;
  const valorNum = parseFloat(valor) || 0;
  const valorParcela = valorNum / parcelasNum;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Transação salva com sucesso!');
    navigate({ to: '/app/dashboard' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Nova Transação</h1>
        <p className="text-muted-foreground">Adicione uma receita ou despesa</p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" placeholder="Ex: Supermercado, Salário..." required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor Total (R$)</Label>
                <Input 
                  id="valor" 
                  type="number" 
                  step="0.01" 
                  placeholder="0,00" 
                  required 
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Switch 
                id="pago-no-cartao" 
                checked={isCreditCard}
                onCheckedChange={setIsCreditCard}
              />
              <Label htmlFor="pago-no-cartao">Pago no cartão?</Label>
            </div>

            {isCreditCard && (
              <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-100 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label htmlFor="parcelas">Número de parcelas</Label>
                  <Select value={installments} onValueChange={setInstallments}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {[...Array(48)].map((_, i) => (
                        <SelectItem key={i+1} value={(i+1).toString()}>{i+1}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {valorNum > 0 && (
                  <div className="flex items-start gap-2 text-orange-700 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div>
                      <p className="font-semibold">Preview do parcelamento:</p>
                      <p>{parcelasNum}x de {formatCurrency(valorParcela)} — de junho/2026 a {new Date(2026, 5 + parcelasNum - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta">Conta</Label>
                <Select required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Input id="obs" />
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit" className="flex-1">Salvar Transação</Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/app/dashboard' })}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
