import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/app')({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: '/' });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  }

  return (
    <div className="flex bg-background text-foreground min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen p-6">
        <Outlet />
      </main>
    </div>
  );
}
