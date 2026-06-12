import { Link, useLocation } from '@tanstack/react-router';
import { useState } from 'react';
import {
  LayoutDashboard, Receipt, Target, BarChart3, Heart, LogOut, TrendingUp,
  ShieldCheck, CreditCard, Trophy, Sparkles, Brain, Calculator,
  MessageCircleQuestion, ScanLine, Scale, ChevronDown, Wallet, Landmark,
  PieChart, Bot, CalendarDays, Check, Users,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { LEANDRO_DATA, JONATHAN_DATA, CASAL_DATA } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type NavItem = { name: string; path: string; icon: any; badge?: string };
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
      { name: 'Relatórios', path: '/app/relatorios', icon: BarChart3 },
      { name: 'Conquistas', path: '/app/conquistas', icon: Trophy },
    ],
  },
  {
    id: 'ia',
    label: 'IA & Decisões',
    icon: Bot,
    items: [
      { name: 'Posso Gastar?', path: '/app/posso-gastar', icon: MessageCircleQuestion, badge: 'IA' },
      { name: 'À vista ou Parcelado?', path: '/app/comparador', icon: Scale, badge: 'IA' },
      { name: 'Scanner de Nota', path: '/app/scanner', icon: ScanLine, badge: 'IA' },
      { name: 'Agente Autônomo', path: '/app/agente', icon: Sparkles, badge: 'IA' },
      { name: 'Comportamento', path: '/app/comportamento', icon: Brain, badge: 'IA' },
    ],
  },
  {
    id: 'dia-a-dia',
    label: 'Dia a Dia',
    icon: Wallet,
    items: [
      { name: 'Transações', path: '/app/transacoes', icon: Receipt },
      { name: 'Cartões', path: '/app/cartoes', icon: CreditCard },
      { name: 'Contas', path: '/app/contas', icon: ShieldCheck },
      { name: 'Fluxo de Caixa', path: '/app/fluxo', icon: TrendingUp },
      { name: 'Projeção Diária', path: '/app/projecao', icon: CalendarDays },
    ],
  },
  {
    id: 'planejamento',
    label: 'Planejamento',
    icon: Landmark,
    items: [
      { name: 'Metas', path: '/app/metas', icon: Target },
      { name: 'Patrimônio', path: '/app/patrimonio', icon: PieChart },
      { name: 'Consórcio', path: '/app/consorcio', icon: Calculator },
      { name: 'Dívidas', path: '/app/dividas', icon: ShieldCheck },
    ],
  },
];

export function Sidebar() {
  const { activeProfile, setActiveProfile } = useAppContext();
  const location = useLocation();

  const currentData =
    activeProfile === 'leandro' ? LEANDRO_DATA :
    activeProfile === 'jonathan' ? JONATHAN_DATA : CASAL_DATA;

  // Auto-open the group containing the active route
  const activeGroup = GROUPS.find(g => g.items.some(i => i.path === location.pathname))?.id;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true, ia: true, 'dia-a-dia': true, planejamento: true,
  });
  const toggle = (id: string) => setOpenGroups(s => ({ ...s, [id]: !s[id] }));

  const month = new Date().getMonth();
  const showRetro = month >= 10 || month <= 1;

  return (
    <div className="w-64 bg-white border-r h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 pb-4">
        <h1 className="text-xl font-bold text-gray-900">FinançasDuo</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Finanças para casal</p>
      </div>

      <div className="px-4 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 group',
              currentData.ringColor,
            )}>
              <Avatar className={currentData.color}>
                <AvatarFallback className="text-white">{currentData.initials}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden flex-1 text-left">
                <p className="font-medium truncate text-sm">{currentData.name}</p>
                <p className="text-xs text-muted-foreground">Score: {currentData.score}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-700 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Trocar perfil
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {([
              { id: 'leandro', data: LEANDRO_DATA, icon: null },
              { id: 'jonathan', data: JONATHAN_DATA, icon: null },
              { id: 'casal', data: CASAL_DATA, icon: Heart },
            ] as const).map(({ id, data, icon: Icon }) => (
              <DropdownMenuItem
                key={id}
                onClick={() => setActiveProfile(id)}
                className="gap-2 cursor-pointer"
              >
                <Avatar className={cn('h-6 w-6', data.color)}>
                  <AvatarFallback className="text-white text-[10px]">{data.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {Icon && <Icon className="h-3 w-3 fill-current text-rose-500" />}
                    {data.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Score: {data.score}</p>
                </div>
                {activeProfile === id && <Check className="h-4 w-4 text-emerald-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
        {GROUPS.map((group) => {
          const open = openGroups[group.id] ?? group.id === activeGroup;
          return (
            <div key={group.id} className="pb-1">
              <button
                onClick={() => toggle(group.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
              >
                <span className="flex items-center gap-2">
                  <group.icon className="h-3 w-3" />
                  {group.label}
                </span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', open ? '' : '-rotate-90')} />
              </button>
              {open && (
                <div className="space-y-0.5 mt-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors text-sm',
                          isActive
                            ? 'bg-gray-900 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-100',
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge && (
                          <span className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded',
                            isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700',
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-3 mt-3 border-t space-y-2">
          <Button
            variant={activeProfile === 'casal' ? 'default' : 'outline'}
            className={cn(
              'w-full justify-start gap-3 h-10',
              activeProfile === 'casal'
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'border-orange-200 text-orange-600 hover:bg-orange-50',
            )}
            onClick={() => setActiveProfile('casal')}
          >
            <Heart className="h-4 w-4 fill-current" />
            Diagnóstico do Casal
          </Button>

          {showRetro && (
            <Link
              to="/app/retrospectiva"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname === '/app/retrospectiva'
                  ? 'bg-purple-100 text-purple-900'
                  : 'text-purple-600 bg-purple-50 hover:bg-purple-100',
              )}
            >
              <Trophy className="h-4 w-4" />
              Retrospectiva 2026
            </Link>
          )}
        </div>
      </nav>

      <div className="p-3 border-t">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair / Trocar Perfil
        </Link>
      </div>
    </div>
  );
}
