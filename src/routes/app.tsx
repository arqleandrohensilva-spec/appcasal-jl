import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader2, Menu } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ProfileBanner } from '@/components/ProfileBanner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/app')({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: '/' });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  }

  return (
    <div className="flex bg-background text-foreground min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="flex-1 min-w-0 md:ml-64 min-h-screen">
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 backdrop-blur px-3 h-12">
          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold">FinançasDuo</h1>
        </header>
        <div className="p-4 md:p-6 min-w-0">
          <ProfileBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
