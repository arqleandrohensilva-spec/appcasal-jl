import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/lib/context';
import { formatCurrency } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Trash2, Heart } from 'lucide-react';
import { useData } from '@/lib/store';
import { goalProgress, goalProgressByOwner } from '@/lib/finance';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';

export const Route = createFileRoute('/app/metas')({
  component: Metas,
});

function Metas() {
  const { activeProfile } = useAppContext();
  const { goals, contributions, addGoal, removeGoal, contributeGoal } = useData();

  const myGoals = goals.filter(g => activeProfile === 'casal' || g.owner === activeProfile);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Metas</h1>
          <p className="text-muted-foreground">Acompanhe seu progresso financeiro</p>
        </div>
        <NewGoalDialog onCreate={(g) => {
          addGoal({ ...g, owner: activeProfile === 'casal' ? 'casal' : activeProfile });
          toast.success('Meta criada!');
        }} />
      </header>

      {myGoals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <p className="text-muted-foreground mb-3">Nenhuma meta ainda. Crie a primeira para acompanhar seu progresso.</p>
            <NewGoalDialog onCreate={(g) => {
              addGoal({ ...g, owner: activeProfile === 'casal' ? 'casal' : activeProfile });
              toast.success('Meta criada!');
            }} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myGoals.map((meta) => {
            const current = goalProgress(contributions, meta.id);
            const percent = meta.target > 0 ? Math.round((current / meta.target) * 100) : 0;
            const byOwner = goalProgressByOwner(contributions, meta.id);
            const isCouple = meta.owner === 'casal';
            return (
              <Card key={meta.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isCouple && <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />}
                    {meta.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" /> {meta.deadline}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      removeGoal(meta.id);
                      toast.success('Meta removida');
                    }}>
                      <Trash2 className="h-3 w-3 text-rose-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(current)}</p>
                      <p className="text-xs text-muted-foreground">de {formatCurrency(meta.target)}</p>
                    </div>
                    <span className={cn("text-2xl font-bold", percent >= 100 ? "text-emerald-600" : "text-purple-600")}>
                      {percent}%
                    </span>
                  </div>
                  <Progress value={Math.min(percent, 100)} className="h-3" />

                  {isCouple && (current > 0) && (
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      <div className="bg-purple-500" style={{ width: `${(byOwner.leandro / Math.max(current, 1)) * 100}%` }} />
                      <div className="bg-emerald-500" style={{ width: `${(byOwner.jonathan / Math.max(current, 1)) * 100}%` }} />
                    </div>
                  )}
                  {isCouple && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>L: {formatCurrency(byOwner.leandro)}</span>
                      <span>J: {formatCurrency(byOwner.jonathan)}</span>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Faltam {formatCurrency(Math.max(meta.target - current, 0))} para atingir.
                  </p>

                  <ContributeDialog
                    onContribute={(amount, who) => {
                      contributeGoal({
                        goalId: meta.id,
                        amount,
                        owner: who,
                        date: new Date().toISOString().slice(0, 10),
                      });
                      toast.success(`+ ${formatCurrency(amount)} adicionado!`);
                    }}
                    activeProfile={activeProfile}
                    isCouple={isCouple}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewGoalDialog({ onCreate }: { onCreate: (g: { name: string; target: number; deadline: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Nova Meta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Viagem, Reserva, Casa nova" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor alvo (R$)</Label>
              <Input type="number" step="0.01" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!name || !target || !deadline) {
                toast.error('Preencha todos os campos');
                return;
              }
              onCreate({ name, target: parseFloat(target), deadline });
              setName(''); setTarget(''); setDeadline('');
              setOpen(false);
            }}
          >Criar meta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContributeDialog({
  onContribute, activeProfile, isCouple,
}: {
  onContribute: (amount: number, owner: 'leandro' | 'jonathan' | 'casal') => void;
  activeProfile: 'leandro' | 'jonathan' | 'casal';
  isCouple: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [who, setWho] = useState<'leandro' | 'jonathan' | 'casal'>(
    isCouple ? (activeProfile === 'casal' ? 'leandro' : activeProfile) : activeProfile,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full"><Plus className="h-3 w-3 mr-1" /> Adicionar aporte</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar aporte</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          {isCouple && (
            <div className="space-y-2">
              <Label>Quem contribuiu?</Label>
              <Select value={who} onValueChange={(v) => setWho(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leandro">Leandro</SelectItem>
                  <SelectItem value="jonathan">Jonathan</SelectItem>
                  <SelectItem value="casal">Casal (compartilhado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const v = parseFloat(amount);
              if (!v || v <= 0) { toast.error('Valor inválido'); return; }
              onContribute(v, who);
              setAmount('');
              setOpen(false);
            }}
          >Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
