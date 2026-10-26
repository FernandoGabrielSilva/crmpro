export const DEAL_STAGES = [
  { value: 'LEAD', label: 'Lead', color: '#64748b', probability: 10 },
  { value: 'QUALIFIED', label: 'Qualificado', color: '#3b82f6', probability: 25 },
  { value: 'PROPOSAL', label: 'Proposta', color: '#8b5cf6', probability: 50 },
  { value: 'NEGOTIATION', label: 'Negociação', color: '#f59e0b', probability: 75 },
  { value: 'WON', label: 'Ganho', color: '#10b981', probability: 100 },
  { value: 'LOST', label: 'Perdido', color: '#ef4444', probability: 0 },
] as const;

export type DealStage = (typeof DEAL_STAGES)[number]['value'];

export const DEAL_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  DEAL_STAGES.map((s) => [s.value, s.label])
);

export const DEAL_STAGE_COLORS: Record<string, string> = Object.fromEntries(
  DEAL_STAGES.map((s) => [s.value, s.color])
);

export const OPEN_STAGES: DealStage[] = DEAL_STAGES.filter(
  (s) => s.value !== 'WON' && s.value !== 'LOST'
).map((s) => s.value);

export const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'SALES_REP', label: 'Vendedor' },
] as const;

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
);

export const CUSTOMER_STATUSES = [
  { value: 'LEAD', label: 'Lead', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'ACTIVE', label: 'Ativo', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { value: 'INACTIVE', label: 'Inativo', className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400' },
] as const;

export const CUSTOMER_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  CUSTOMER_STATUSES.map((s) => [s.value, s.label])
);

export const CUSTOMER_STATUS_CLASSES: Record<string, string> = Object.fromEntries(
  CUSTOMER_STATUSES.map((s) => [s.value, s.className])
);

export const TASK_PRIORITIES = [
  { value: 'LOW', label: 'Baixa', className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400' },
  { value: 'MEDIUM', label: 'Média', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { value: 'HIGH', label: 'Alta', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
] as const;

export const TASK_PRIORITY_LABELS: Record<string, string> = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.value, p.label])
);

export const TASK_PRIORITY_CLASSES: Record<string, string> = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.value, p.className])
);

export const TASK_STATUSES = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluída' },
] as const;

export const TASK_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
);

export const ACTIVITY_TYPES = [
  { value: 'CALL', label: 'Ligação', icon: 'Phone' },
  { value: 'EMAIL', label: 'Email', icon: 'Mail' },
  { value: 'MEETING', label: 'Reunião', icon: 'CalendarDays' },
  { value: 'NOTE', label: 'Nota', icon: 'Pencil' },
  { value: 'TASK', label: 'Tarefa', icon: 'CheckSquare' },
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((a) => [a.value, a.label])
);
