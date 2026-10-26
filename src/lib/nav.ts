import type { LucideIcon } from 'lucide-react';
import { BarChart3, Briefcase, CheckSquare, KanbanSquare, LayoutDashboard, Settings, Trash2, UserRound, Users } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon; manageOnly?: boolean };

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/deals', label: 'Negócios', icon: Briefcase },
  { href: '/pipeline', label: 'Funil', icon: KanbanSquare },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/trash', label: 'Lixeira', icon: Trash2, manageOnly: true },
  { href: '/profile', label: 'Meu perfil', icon: UserRound },
  { href: '/settings', label: 'Configurações', icon: Settings },
];
