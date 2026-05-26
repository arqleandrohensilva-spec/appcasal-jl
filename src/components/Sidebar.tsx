import { Link, useLocation } from '@tanstack/react-router';
import { LayoutDashboard, Receipt, Target, BarChart3, Heart, LogOut, TrendingUp, ShieldCheck, CreditCard, Trophy } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const { activeProfile, setActiveProfile } = useAppContext();
  const location = useLocation();
  
  const currentData = activeProfile === 'leandro' ? LEANDRO_DATA : activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Transações', path: '/app/transacoes', icon: Receipt },
    { name: 'Cartões', path: '/app/cartoes', icon: CreditCard },
    { name: 'Contas', path: '/app/contas', icon: ShieldCheck },
    { name: 'Fluxo de Caixa', path: '/app/fluxo', icon: TrendingUp },
    { name: 'Metas', path: '/app/metas', icon: Target },
    { name: 'Dívidas', path: '/app/dividas', icon: ShieldCheck },
    { name: 'Patrimônio', path: '/app/patrimonio', icon: TrendingUp },
    { name: 'Comportamento', path: '/app/comportamento', icon: Heart },
    { name: 'Agente', path: '/app/agente', icon: Flame },
    { name: 'Relatórios', path: '/app/relatorios', icon: BarChart3 },
  ];


  return (
    <div className="w-64 bg-white border-r h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">FinançasDuo</h1>
      </div>

      <div className="px-4 mb-6">
        <div className={cn("flex items-center gap-3 p-3 rounded-lg border", currentData.ringColor)}>
          <Avatar className={currentData.color}>
            <AvatarFallback className="text-white">{currentData.initials}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="font-medium truncate">{currentData.name}</p>
            <p className="text-xs text-muted-foreground">Score: {currentData.score}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              location.pathname === item.path ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t">
          <Button 
            variant={activeProfile === 'casal' ? "default" : "outline"} 
            className={cn(
              "w-full justify-start gap-3",
              activeProfile === 'casal' ? "bg-orange-500 hover:bg-orange-600" : "border-orange-200 text-orange-600 hover:bg-orange-50"
            )}
            onClick={() => setActiveProfile('casal')}
          >
            <Heart className="h-5 w-5 fill-current" />
            Diagnóstico do Casal
          </Button>
        </div>
      </nav>

      <div className="p-4 border-t">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-red-600 transition-colors">
          <LogOut className="h-5 w-5" />
          Sair / Trocar Perfil
        </Link>
      </div>
    </div>
  );
}
