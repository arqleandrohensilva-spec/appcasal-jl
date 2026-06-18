import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/reset-password')({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    // Supabase recovery link sets a session via the hash fragment.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setHasSession(!!session);
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Senha deve ter ao menos 6 caracteres.');
    if (password !== confirm) return toast.error('As senhas não coincidem.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Senha atualizada! Entrando...');
    navigate({ to: '/app/dashboard' });
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            {hasSession
              ? 'Defina uma nova senha para sua conta.'
              : 'Link inválido ou expirado. Solicite um novo link de redefinição na tela de login.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="np">Nova senha</Label>
                <Input id="np" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cp">Confirmar senha</Label>
                <Input id="cp" type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          ) : (
            <Button onClick={() => navigate({ to: '/' })} className="w-full">Voltar para login</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
