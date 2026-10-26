export const instant = false;

import Link from 'next/link';
import { format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, Briefcase, CheckSquare, DollarSign, Plus, Target, TrendingUp, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ActivityIcon } from '@/components/shared/activity-icon';
import { PipelineDonut, RevenueAreaChart } from '@/components/dashboard/dashboard-charts';
import { ACTIVITY_TYPE_LABELS, DEAL_STAGES, OPEN_STAGES } from '@/lib/crm';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

export default async function DashboardPage() {
  const [deals, activities, tasks, customersCount] = await Promise.all([
    prisma.deal.findMany({
      include: { owner: { select: { id: true, name: true } }, customer: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    }),
    prisma.activity.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        customer: { select: { id: true, name: true } },
        deal: { select: { title: true } },
      },
    }),
    prisma.task.findMany({
      where: { status: { not: 'COMPLETED' }, dueDate: { not: null } },
      orderBy: { dueDate: 'asc' },
      take: 6,
      include: { assignee: { select: { name: true } } },
    }),
    prisma.customer.count(),
  ]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = subMonths(monthStart, 1);

  const openDeals = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === 'WON');
  const lostDeals = deals.filter((d) => d.stage === 'LOST');

  const wonThisMonth = wonDeals.filter((d) => (d.expectedCloseDate ?? d.updatedAt) >= monthStart);
  const wonPrevMonth = wonDeals.filter((d) => {
    const date = d.expectedCloseDate ?? d.updatedAt;
    return date >= prevMonthStart && date < monthStart;
  });

  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const wonMonthValue = wonThisMonth.reduce((sum, d) => sum + d.value, 0);
  const openValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const conversion = wonDeals.length + lostDeals.length > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0;
  const ticket = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;
  const prevWonValue = wonPrevMonth.reduce((sum, d) => sum + d.value, 0);
  const monthGrowth = prevWonValue > 0 ? ((wonMonthValue - prevWonValue) / prevWonValue) * 100 : null;

  const monthly = Array.from({ length: 6 }).map((_, index) => {
    const month = subMonths(monthStart, 5 - index);
    const nextMonth = subMonths(monthStart, 4 - index);
    const won = wonDeals.filter((d) => {
      const date = d.expectedCloseDate ?? d.updatedAt;
      return date >= month && date < nextMonth;
    });
    return { month: format(month, 'MMM', { locale: ptBR }), vendas: won.reduce((sum, d) => sum + d.value, 0) };
  });

  const stageData = DEAL_STAGES.map((stage) => ({
    stage: stage.value,
    label: stage.label,
    total: deals.filter((d) => d.stage === stage.value).length,
    value: deals.filter((d) => d.stage === stage.value).reduce((sum, d) => sum + d.value, 0),
  }));

  const topDeals = [...openDeals].sort((a, b) => b.value - a.value).slice(0, 5);
  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu funil de vendas e atividades."
        actions={
          <>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/customers" />}>
              <Users className="size-4" /> Clientes
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/pipeline" />}>
              <Plus className="size-4" /> Novo negócio
            </Button>
          </>
        }
      />

      {overdueTasks > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">
            Você tem <strong>{overdueTasks}</strong> tarefa(s) atrasada(s).
          </span>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tasks" />}>Ver tarefas</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Vendas no mês"
          value={formatCurrency(wonMonthValue)}
          hint={
            monthGrowth === null
              ? `${wonThisMonth.length} negócio(s) ganho(s)`
              : `${monthGrowth >= 0 ? '+' : ''}${monthGrowth.toFixed(0)}% vs. mês anterior`
          }
          icon={<DollarSign className="size-4" />}
          trend={monthGrowth}
        />
        <Kpi
          label="Pipeline aberto"
          value={formatCurrency(openValue)}
          hint={`${openDeals.length} negócio(s) em andamento`}
          icon={<Briefcase className="size-4" />}
        />
        <Kpi
          label="Taxa de conversão"
          value={`${conversion.toFixed(1)}%`}
          hint={`${wonDeals.length} ganho(s) • ${lostDeals.length} perdido(s)`}
          icon={<Target className="size-4" />}
        />
        <Kpi
          label="Ticket médio"
          value={formatCurrency(ticket)}
          hint={`${customersCount} cliente(s) na base`}
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Receita ganha</CardTitle>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reports" />}>
              Relatórios <ArrowUpRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={monthly} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Funil por estágio</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/pipeline" />}>Abrir Kanban</Button>
          </CardHeader>
          <CardContent>
            <PipelineDonut data={stageData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Atividades recentes</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/customers" />}>Ver clientes</Button>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            ) : (
              <ul className="divide-y">
                {activities.map((activity) => (
                  <li key={activity.id} className="flex items-start gap-3 py-2.5">
                    <ActivityIcon type={activity.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-medium">{ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}</span>
                        {activity.customer && (
                          <Link href={`/customers/${activity.customer.id}`} className="text-sm text-primary hover:underline">
                            {activity.customer.name}
                          </Link>
                        )}
                        {activity.deal && <span className="text-xs text-muted-foreground">• {activity.deal.title}</span>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{activity.content}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activity.user.name} • {formatDateTime(activity.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximas tarefas</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tasks" />}>Ver todas</Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem tarefas pendentes.</p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((task) => {
                  const overdue = !!task.dueDate && new Date(task.dueDate) < now;
                  return (
                    <li key={task.id} className="flex items-start gap-2">
                      <CheckSquare className={overdue ? 'mt-0.5 size-4 shrink-0 text-destructive' : 'mt-0.5 size-4 shrink-0 text-muted-foreground'} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className={`text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {formatDate(task.dueDate)}
                          {task.assignee && ` • ${task.assignee.name}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="h-5 shrink-0 text-[10px]">{task.priority}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Maiores negócios em aberto</CardTitle>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/deals" />}>Ver negócios</Button>
        </CardHeader>
        <CardContent>
          {topDeals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum negócio em aberto.</p>
          ) : (
            <div className="divide-y">
              {topDeals.map((deal) => (
                <div key={deal.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {deal.customer.name}
                      {deal.owner && ` • ${deal.owner.name}`}
                      {deal.expectedCloseDate && ` • previsão ${formatDate(deal.expectedCloseDate)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{DEAL_STAGES.find((s) => s.value === deal.stage)?.label}</Badge>
                    <span className="text-sm font-semibold">{formatCurrency(deal.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  trend?: number | null;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</span>
        </div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className={trend != null && trend < 0 ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{hint}</p>
      </CardContent>
    </Card>
  );
}
