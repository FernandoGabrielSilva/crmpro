export type AppRole = 'ADMIN' | 'MANAGER' | 'SALES_REP';

export function isOwner(role?: string | null) {
  return role === 'ADMIN';
}

export function canManage(role?: string | null) {
  return role === 'ADMIN' || role === 'MANAGER';
}

export const ROLE_PERMISSIONS: {
  role: AppRole;
  label: string;
  description: string;
  permissions: string[];
}[] = [
  {
    role: 'ADMIN',
    label: 'Administrador (dono)',
    description: 'Controle total da empresa, equipe e configurações.',
    permissions: [
      'Criar, editar e excluir usuários da equipe',
      'Definir funções e permissões dos funcionários',
      'Criar, editar e excluir clientes e negócios',
      'Personalizar estágios do funil e tags',
      'Acessar todos os relatórios e configurações',
    ],
  },
  {
    role: 'MANAGER',
    label: 'Gerente',
    description: 'Gerencia a operação comercial e a equipe de vendas.',
    permissions: [
      'Criar, editar e excluir clientes e negócios',
      'Excluir tarefas e atividades',
      'Personalizar estágios do funil e tags',
      'Acessar todos os relatórios',
      'Não pode criar ou excluir contas de usuários',
    ],
  },
  {
    role: 'SALES_REP',
    label: 'Vendedor',
    description: 'Foco no atendimento e andamento dos negócios.',
    permissions: [
      'Criar e editar clientes e negócios',
      'Criar e concluir tarefas e atividades',
      'Mover negócios entre os estágios do funil',
      'Acessar relatórios',
      'Não pode excluir clientes, negócios ou tarefas',
      'Não pode gerenciar usuários nem configurações',
    ],
  },
];
