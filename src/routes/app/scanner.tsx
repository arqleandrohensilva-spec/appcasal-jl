import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { useAppContext } from '@/lib/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, formatCurrency } from '@/lib/mockData';
import { ScanLine, Upload, Loader2, Sparkles, CheckCircle2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/store';


export const Route = createFileRoute('/app/scanner')({
  component: Scanner,
});

interface ExtractedItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

interface ExtractedReceipt {
  merchant: string;
  date: string;
  total: number;
  items: ExtractedItem[];
}

const MOCK_RECEIPTS: ExtractedReceipt[] = [
  {
    merchant: 'Supermercado Pão de Açúcar',
    date: '2026-05-26',
    total: 234.70,
    items: [
      { id: '1', description: 'Arroz Tio João 5kg', quantity: 1, unitPrice: 32.90, total: 32.90, category: 'Alimentação' },
      { id: '2', description: 'Feijão Carioca 1kg', quantity: 2, unitPrice: 9.50, total: 19.00, category: 'Alimentação' },
      { id: '3', description: 'Frango Sadia', quantity: 1, unitPrice: 28.40, total: 28.40, category: 'Alimentação' },
      { id: '4', description: 'Detergente Ypê', quantity: 4, unitPrice: 3.20, total: 12.80, category: 'Casa' },
      { id: '5', description: 'Coca-Cola 2L', quantity: 3, unitPrice: 9.80, total: 29.40, category: 'Alimentação' },
      { id: '6', description: 'Queijo Mussarela 500g', quantity: 1, unitPrice: 34.90, total: 34.90, category: 'Alimentação' },
      { id: '7', description: 'Pão de forma', quantity: 2, unitPrice: 8.90, total: 17.80, category: 'Alimentação' },
      { id: '8', description: 'Outros', quantity: 1, unitPrice: 59.50, total: 59.50, category: 'Alimentação' },
    ]
  },
  {
    merchant: 'Drogaria São Paulo',
    date: '2026-05-25',
    total: 89.40,
    items: [
      { id: '1', description: 'Dipirona 500mg', quantity: 1, unitPrice: 12.90, total: 12.90, category: 'Saúde' },
      { id: '2', description: 'Protetor solar FPS50', quantity: 1, unitPrice: 54.90, total: 54.90, category: 'Saúde' },
      { id: '3', description: 'Pasta de dente', quantity: 2, unitPrice: 10.80, total: 21.60, category: 'Saúde' },
    ]
  }
];

function Scanner() {
  const { activeProfile } = useAppContext();
  const navigate = useNavigate();
  const { addTransaction, accounts } = useData();
  const accent = activeProfile === 'leandro' ? 'purple' : activeProfile === 'jonathan' ? 'emerald' : 'orange';
  const fileRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedReceipt | null>(null);
  const [step, setStep] = useState<'idle' | 'reading' | 'categorizing' | 'done'>('idle');

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    runScan();
  };

  const runScan = () => {
    setScanning(true);
    setResult(null);
    setStep('reading');
    setTimeout(() => setStep('categorizing'), 1200);
    setTimeout(() => {
      const mock = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];
      setResult(mock);
      setStep('done');
      setScanning(false);
    }, 2400);
  };

  const reset = () => {
    setResult(null);
    setPreview(null);
    setStep('idle');
  };

  const save = () => {
    if (!result) return;
    const ownerProfile = activeProfile === 'casal' ? 'leandro' : activeProfile;
    const acc = accounts.find(a => a.owner === ownerProfile);
    for (const item of result.items) {
      addTransaction({
        description: `${result.merchant} · ${item.description}`,
        amount: item.total,
        date: result.date,
        category: item.category,
        paymentMethod: acc ? 'Conta' : 'Dinheiro',
        accountId: acc?.id,
        type: 'despesa',
        owner: ownerProfile,
      });
    }
    toast.success(`${result.items.length} itens lançados em transações!`);
    navigate({ to: '/app/transacoes' });
  };

  const updateItem = (id: string, patch: Partial<ExtractedItem>) => {
    if (!result) return;
    setResult({
      ...result,
      items: result.items.map(it => it.id === id ? { ...it, ...patch } : it)
    });
  };



  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className={`h-6 w-6 text-${accent}-600`} /> Scanner de Nota Fiscal
        </h1>
        <p className="text-muted-foreground">Tire uma foto da nota — a IA lê item por item e categoriza tudo automaticamente.</p>
      </header>

      {!result && !scanning && (
        <Card>
          <CardContent className="p-10">
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors',
                `border-${accent}-300 hover:border-${accent}-500 hover:bg-${accent}-50/30`
              )}
            >
              <div className={`mx-auto w-16 h-16 rounded-2xl bg-${accent}-100 flex items-center justify-center mb-4`}>
                <Camera className={`h-8 w-8 text-${accent}-600`} />
              </div>
              <h3 className="font-bold text-lg mb-2">Envie ou tire foto da nota</h3>
              <p className="text-sm text-muted-foreground mb-4">PNG, JPG ou PDF — até 10MB</p>
              <Button className={`bg-${accent}-600 hover:bg-${accent}-700 gap-2`}>
                <Upload className="h-4 w-4" /> Escolher arquivo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> A IA aprende suas preferências de categorização a cada nota lida.
            </div>
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={runScan} className="text-xs">
                Demonstração com nota de exemplo →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {scanning && (
        <Card>
          <CardContent className="p-10 text-center space-y-6">
            {preview && (
              <img src={preview} alt="Nota" className="max-h-64 mx-auto rounded-xl shadow" />
            )}
            <div className="space-y-3">
              <Loader2 className={`h-10 w-10 mx-auto animate-spin text-${accent}-600`} />
              <div className="space-y-2 max-w-sm mx-auto">
                <StepRow label="Lendo texto da nota com OCR" active={step === 'reading'} done={step !== 'reading'} />
                <StepRow label="Identificando itens e valores" active={step === 'categorizing'} done={step === 'done'} />
                <StepRow label="Categorizando com base no seu histórico" active={step === 'categorizing'} done={step === 'done'} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <Badge className="bg-emerald-100 text-emerald-700 gap-1 mb-2">
                  <CheckCircle2 className="h-3 w-3" /> Nota lida com sucesso
                </Badge>
                <CardTitle>{result.merchant}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(result.date).toLocaleDateString('pt-BR')} · {result.items.length} itens · Total {formatCurrency(result.total)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={reset}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-gray-50">
                  <Input
                    className="col-span-5 h-9 text-sm"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  />
                  <Input
                    className="col-span-1 h-9 text-sm text-center"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                  />
                  <Input
                    className="col-span-2 h-9 text-sm"
                    type="number"
                    step="0.01"
                    value={item.total}
                    onChange={(e) => updateItem(item.id, { total: parseFloat(e.target.value) || 0 })}
                  />
                  <Select value={item.category} onValueChange={(v) => updateItem(item.id, { category: v })}>
                    <SelectTrigger className="col-span-4 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={reset}>Cancelar</Button>
            <Button className={`bg-${accent}-600 hover:bg-${accent}-700`} onClick={save}>
              Lançar {result.items.length} transações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        : active ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        : <div className="h-4 w-4 rounded-full border border-gray-300" />}
      <span className={cn(done ? 'text-emerald-600' : active ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
    </div>
  );
}
