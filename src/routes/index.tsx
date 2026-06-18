import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/')({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (!loading && user) navigate({ to: '/app/dashboard' });
  }, [loading, user, navigate]);

  const mapError = (msg?: string) => {
    if (!msg) return 'Erro inesperado';
    if (/restrito|whitelist|not allowed|42501/i.test(msg)) return 'Este app é de acesso restrito.';
    return msg;
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (r.error) { toast.error(mapError(r.error.message)); setBusy(false); return; }
      if (r.redirected) return;
    } catch (e: any) {
      toast.error(mapError(e?.message));
      setBusy(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(mapError(error.message));
    else toast.success('Bem-vindo!');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { toast.error(mapError(error.message)); setBusy(false); return; }
    if (inviteCode.trim() && data.user) {
      await new Promise(r => setTimeout(r, 800));
      const { error: jerr } = await supabase.rpc('join_workspace_by_code', { _code: inviteCode.trim() });
      if (jerr) toast.error('Conta criada, mas código de convite inválido.');
      else toast.success('Conta criada e workspace conectado!');
    } else {
      toast.success('Conta criada!');
    }
    setBusy(false);
  };

  const handleForgot = async () => {
    const target = (email || window.prompt('Informe seu e-mail para receber o link de redefinição:') || '').trim();
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(mapError(error.message));
    else toast.success('Enviamos um link de redefinição para seu e-mail.');
  };




  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">FinançasDuo</h1>
          <p className="mt-2 text-muted-foreground">Suas finanças, em sincronia.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Acesse com Google ou e-mail e senha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGoogle} disabled={busy} className="w-full h-11" variant="outline">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar com Google
            </Button>

            <div className="relative my-2">
              <Separator />
              <span className="absolute inset-0 -top-2 mx-auto w-fit px-2 bg-card text-xs text-muted-foreground">ou</span>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="pt-3">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></div>
                  <Button type="submit" disabled={busy} className="w-full">{busy ? 'Entrando...' : 'Entrar'}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup" className="pt-3">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div><Label htmlFor="su-email">Email</Label><Input id="su-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="su-password">Senha (mín. 6)</Label><Input id="su-password" type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></div>
                  <div>
                    <Label htmlFor="invite">Código de convite (opcional)</Label>
                    <Input id="invite" placeholder="ex: ABCD1234" value={inviteCode} onChange={e=>setInviteCode(e.target.value.toUpperCase())} />
                    <p className="text-[11px] text-muted-foreground mt-1">Tem um código? Você entra no mesmo workspace que seu parceiro.</p>
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">{busy ? 'Criando...' : 'Criar conta'}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
