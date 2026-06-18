import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Já instalado? não mostra nada.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    if (standalone) return;

    if (localStorage.getItem(DISMISS_KEY)) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // iOS Safari não dispara beforeinstallprompt — mostra dica manual.
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIOS && isSafari) setIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDeferred(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (!deferred && !iosHint) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border bg-card p-4 shadow-lg sm:left-auto">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      {deferred ? (
        <>
          <p className="font-medium text-sm">Instalar App JL</p>
          <p className="text-xs text-muted-foreground mt-1">
            Acesse mais rápido direto da tela inicial.
          </p>
          <Button size="sm" className="mt-3 w-full" onClick={install}>
            <Download className="h-4 w-4 mr-2" /> Instalar
          </Button>
        </>
      ) : (
        <>
          <p className="font-medium text-sm">Adicionar à Tela de Início</p>
          <p className="text-xs text-muted-foreground mt-1">
            Toque em <span className="font-semibold">Compartilhar</span> ↑ e escolha
            <span className="font-semibold"> Adicionar à Tela de Início</span>.
          </p>
        </>
      )}
    </div>
  );
}
