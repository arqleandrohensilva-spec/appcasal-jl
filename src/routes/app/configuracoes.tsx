import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings, User, Users, Moon, Sun, Copy, Check, LogOut,
  Download, AlertTriangle, Mail, Shield, Sparkles, RefreshCw, Save, Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import { useData } from '@/lib/store';
import { downloadCSV, transactionsToCSV } from '@/lib/csv';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/configuracoes')({
  component: Configuracoes,
});

function Configuracoes() {
  const { user, profile, workspace, signOut, joinByCode, setProfilePessoa, updateDisplayName, regenerateInviteCode } = useAuth();
  const { theme, toggle } = useTheme();
  const { transactions } = useData();

  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const copyInvite = () => {
    if (!workspace?.invite_code) return;
    navigator.clipboard.writeText(workspace.invite_code);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    const r = await joinByCode(joinCode);
    setJoining(false);
    if (r.ok) {
      toast.success('Você entrou no workspace!');
      setJoinCode('');
    } else {
      toast.error(r.error || 'Código inválido');
    }
  };

  const exportAll = () => {
    if (transactions.length === 0) {
      toast.error('Não há transações para exportar.');
      return;
    }
    downloadCSV(`financasduo-transacoes-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCSV(transactions));
    toast.success('CSV exportado!');
  };

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  const handleSaveName = async () => {
    if (displayName.trim() === (profile?.display_name ?? '').trim()) return;
    setSavingName(true);
    const r = await updateDisplayName(displayName);
    setSavingName(false);
    if (r.ok) toast.success('Nome atualizado!');
    else toast.error(r.error || 'Erro ao atualizar nome');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const r = await regenerateInviteCode();
    setRegenerating(false);
    if (r.ok) toast.success('Novo código gerado! O antigo deixou de funcionar.');
    else toast.error(r.error || 'Erro ao gerar novo código');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      <header>
        <div className="flex items-center gap-2 text-orange-500 mb-1">
          <Settings className="h-5 w-5" />
          <span className="text-sm font-medium">Conta</span>
        </div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Perfil, workspace compartilhado, aparência e dados.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{profile?.display_name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="display-name" className="text-sm">Nome de exibição</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como você quer ser chamado"
              />
              <Button
                onClick={handleSaveName}
                disabled={savingName || !displayName.trim() || displayName.trim() === (profile?.display_name ?? '').trim()}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> {savingName ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Quem é você no workspace?</Label>
            <div className="flex gap-2">
              {(['leandro', 'jonathan'] as const).map((p) => (
                <Button
                  key={p}
                  variant={profile?.pessoa === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProfilePessoa(p)}
                  className="capitalize"
                >
                  {p}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Define como suas transações e mensagens no assistente são identificadas.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Workspace compartilhado
          </CardTitle>
          <CardDescription>{workspace?.name || 'Espaço do casal'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Código de convite</Label>
            <div className="flex gap-2">
              <Input readOnly value={workspace?.invite_code ?? '...'} className="font-mono" />
              <Button variant="outline" size="icon" onClick={copyInvite} title="Copiar código">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" title="Gerar novo código" disabled={regenerating}>
                    <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> Gerar novo código?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      O código atual deixará de funcionar imediatamente. Quem já está no workspace continua dentro — mas qualquer link ou código antigo compartilhado não servirá mais.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRegenerate}>Gerar novo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground">
              Compartilhe apenas com seu parceiro(a) — quem tiver esse código entra no mesmo espaço.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Entrar em outro workspace</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Cole o código aqui"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="font-mono"
              />
              <Button onClick={handleJoin} disabled={joining || !joinCode.trim()}>
                {joining ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Aparência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tema {theme === 'dark' ? 'escuro' : 'claro'}</p>
              <p className="text-xs text-muted-foreground">Alterna entre modo claro e escuro em todo o app.</p>
            </div>
            <Button variant="outline" onClick={toggle} className="gap-2">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Assistente IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Modelo em uso</p>
              <p className="text-xs text-muted-foreground">Claude, via Lovable AI Gateway</p>
            </div>
            <Badge variant="outline">Ativo</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" /> Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exportar transações</p>
              <p className="text-xs text-muted-foreground">Baixa um CSV com todas as transações do workspace.</p>
            </div>
            <Button variant="outline" onClick={exportAll} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-600">
            <Shield className="h-4 w-4" /> Sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                <LogOut className="h-4 w-4" /> Sair da conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" /> Sair da conta?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Você precisará entrar novamente com seu email e senha (ou Google) para acessar o app.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={signOut} className="bg-red-600 hover:bg-red-700">
                  Sair
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
