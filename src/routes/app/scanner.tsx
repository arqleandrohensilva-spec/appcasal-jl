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
import { useServerFn } from '@tanstack/react-start';
import { scanReceipt } from '@/lib/scanner.functions';
import { accentFor } from '@/lib/accent';

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Scanner() {
  const { activeProfile } = useAppContext();
  const navigate = useNavigate();
  const { addTransaction, accounts } = useData();
  const a = accentFor(activeProfile);
  const fileRef = useRef<HTMLInputElement>(null);
  const scan = useServerFn(scanReceipt);

  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedReceipt | null>(null);
  const [step, setStep] = useState<'idle' | 'reading' | 'categorizing' | 'done'>('idle');
  const scanning = step === 'reading' || step === 'categorizing';

  const handleFile = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      setResult(null);
      setStep('reading');
      // visual feedback transition
      setTimeout(() => setStep((s) => (s === 'reading' ? 'categorizing' : s)), 800);
      const data = await scan({ data: { imageDataUrl: dataUrl } });
      const items: ExtractedItem[] = (data.items ?? []).map((it, i) => ({
        id: String(i + 1),
        description: it.description,
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || (it.total / Math.max(1, it.quantity || 1)),
        total: it.total,
        category: CATEGORIES.includes(it.category) ? it.category : 'Outros',
      }));
      setResult({
        merchant: data.merchant,
        date: data.date,
        total: data.total,
        items,
      });
      setStep('done');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível ler a nota. Tente outra foto.');
      setStep('idle');
      setPreview(null);
    }
  };

  const reset = () => {
    setResult(null);
    setPreview(null);
    setStep('idle');
  };

  const save = () => {
    if (!result) return;
    const ownerProfile = activeProfile === 'casal' ? 'leandro' : activeProfile;
    const acc = accounts.find((x) => x.owner === ownerProfile);
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
      items: result.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className={cn('h-6 w-6', a.text)} /> Scanner de Nota Fiscal
        </h1>
        <p className="text-muted-foreground">
          Tire uma foto da nota — a IA lê item por item e categoriza tudo automaticamente.
        </p>
      </header>

      {!result && !scanning && (
        <Card>
          <CardContent className="p-10">
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors',
                a.border,
                a.borderHover,
                a.bgSoftHover,
              )}
            >
              <div className={cn('mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4', a.bgSoft)}>
                <Camera className={cn('h-8 w-8', a.text)} />
              </div>
              <h3 className="font-bold text-lg mb-2">Envie ou tire foto da nota</h3>
              <p className="text-sm text-muted-foreground mb-4">PNG ou JPG — até 10MB</p>
              <Button className={cn(a.bg, a.bgHover, 'gap-2')}>
                <Upload className="h-4 w-4" /> Escolher arquivo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> A IA extrai estabelecimento, data, itens e categorias.
            </div>
          </CardContent>
        </Card>
      )}

      {scanning && (
        <Card>
          <CardContent className="p-10 text-center space-y-6">
            {preview && <img src={preview} alt="Nota" className="max-h-64 mx-auto rounded-xl shadow" />}
            <div className="space-y-3">
              <Loader2 className={cn('h-10 w-10 mx-auto animate-spin', a.text)} />
              <div className="space-y-2 max-w-sm mx-auto">
                <StepRow label="Enviando imagem à IA" active={step === 'reading'} done={step !== 'reading'} />
                <StepRow label="Extraindo itens e categorizando" active={step === 'categorizing'} done={false} />
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
                  {result.date ? new Date(result.date).toLocaleDateString('pt-BR') : '—'} · {result.items.length} itens · Total {formatCurrency(result.total)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
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
                    <SelectTrigger className="col-span-4 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={reset}>Cancelar</Button>
            <Button className={cn(a.bg, a.bgHover)} onClick={save}>
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
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-gray-300" />
      )}
      <span className={cn(done ? 'text-emerald-600' : active ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
    </div>
  );
}
