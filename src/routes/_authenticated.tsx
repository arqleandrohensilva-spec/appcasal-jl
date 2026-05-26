import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import { Sidebar } from '@/components/Sidebar';

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  
  return (
    <div className="flex bg-[#F9FAFB] min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
