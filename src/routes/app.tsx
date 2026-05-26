import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Sidebar } from '@/components/Sidebar';

export const Route = createFileRoute('/app')({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex bg-[#F9FAFB] min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen p-6">
        <Outlet />
      </main>
    </div>
  );
}
