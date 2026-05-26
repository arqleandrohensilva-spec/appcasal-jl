import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CATEGORIES, ACCOUNTS, formatCurrency, CREDIT_CARDS } from '@/lib/mockData';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AlertCircle, Camera, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { useAppContext } from '@/lib/context';


export const Route = createFileRoute('/app/transacoes')({
  component: Transacoes,
});

function Transacoes() {
  const navigate = useNavigate();
  const { activeProfile } = useAppContext();
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [valor, setValor] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);


  const myCards = CREDIT_CARDS.filter(c => c.owner === activeProfile);
  const availableAccounts = [...ACCOUNTS, ...myCards.map(c => c.name)];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nova Transação</h1>
            <p className="text-muted-foreground">Adicione uma receita ou despesa</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2 border-purple-200 text-purple-600 hover:bg-purple-50"
            onClick={() => {
              setIsScanning(true);
              setTimeout(() => {
                setDescription("Supermercado Pão de Açúcar");
                setValor("234.70");
                setCategory("Alimentação");
                setDate("2026-05-26");
                setIsScanning(false);
                toast.success("Nota lida com sucesso!");
              }, 2000);
            }}
            disabled={isScanning}
          >
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {isScanning ? 'Lendo nota...' : 'Escanear nota'}
          </Button>
        </div>

      </header>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" placeholder="Ex: Supermercado, Salário..." required value={description} onChange={(e) => setDescription(e.target.value)} />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select required value={category} onValueChange={setCategory}>

                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta">Pago com / Conta</Label>
                <Select 
                  required 
                  onValueChange={(val) => {
                    setSelectedAccount(val);
                    setIsCreditCard(myCards.some(c => c.name === val));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Input id="obs" />
            </div>

            {valorNum > 30 && category !== 'Moradia' && category !== 'Saúde' && category !== 'Educação' && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <TrendingUp className="h-4 w-4" />
                  💡 Custo de Oportunidade
                </div>
                <p className="text-xs text-blue-600 leading-relaxed">
                  {formatCurrency(valorNum)} investidos todo mês a 10% a.a. virariam <b>{formatCurrency(valorNum * 210)}</b> em 10 anos.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 text-[10px] bg-white border-blue-200 text-blue-700 hover:bg-blue-50">Investir em vez disso</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-[10px] text-blue-600 hover:bg-blue-100">Entendido</Button>
                </div>
              </div>
            )}

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
