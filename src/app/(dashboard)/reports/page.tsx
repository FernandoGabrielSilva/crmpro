export const instant = false;

import Link from 'next/link';
import { connection } from 'next/server';
import { format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ReportActions } from '@/components/reports/report-actions';
import { LostReasonChart, SalesLineChart, StageBarChart } from '@/components/reports/reports-charts';
import { DEAL_STAGES, OPEN_STAGES } from '@/lib/crm';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PERIODS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'all', label: 'Tudo' },
];

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const periodParam = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = periodParam && PERIODS.some((p) => p.value === periodParam) ? periodParam : '90';
  const start = getPeriodStart(period);

  const [deals, users] = await Promise.all([
    prisma.deal.findMany({
      where: start ? { updatedAt: { gte: start } } : {},
      include: { owner: { select: { id: true, name: true } }, customer: { select: { name: true } } },
      take: 2000,
    }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const now = new Date();
  const monthly = Array.from({ length: 6 }).map((_, index) => {
    const month = subMonths(startOfMonth(now), 5 - index);
    const monthEnd = subMonths(startOfMonth(now), 4 - index);
    const won = deals.filter((d) => {
      if (d.stage !== 'WON') return false;
      const date = d.expectedCloseDate ?? d.updatedAt;
      return date >= month && date < monthEnd;
    });
    return {
      month: format(month, 'MMM', { locale: ptBR }),
      vendas: won.reduce((sum, d) => sum + d.value, 0),
      negocios: won.length,
    };
  });

  const stageData = DEAL_STAGES.map((stage) => ({
    stage: stage.label,
    total: deals.filter((d) => d.stage === stage.value).length,
  }));

  const openDeals = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === 'WON');
  const lostDeals = deals.filter((d) => d.stage === 'LOST');
  const closedDeals = [...wonDeals, ...lostDeals];

  const openValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const conversion = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;
  const avgDays =
    closedDeals.length > 0
      ? closedDeals.reduce(
          (sum, d) => sum + Math.max(0, (d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
          0
        ) / closedDeals.length
      : 0;

  const ranking = users
    .map((user) => {
      const userDeals = deals.filter((d) => d.ownerId === user.id);
      const userWon = userDeals.filter((d) => d.stage === 'WON');
      const userClosed = userDeals.filter((d) => d.stage === 'WON' || d.stage === 'LOST');
      return {
        id: user.id,
        name: user.name,
        won: userWon.reduce((sum, d) => sum + d.value, 0),
        total: userDeals.reduce((sum, d) => sum + d.value, 0),
        count: userWon.length,
        deals: userDeals.length,
        conversion: userClosed.length > 0 ? Math.round((userWon.length / userClosed.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.won - a.won);

  const lostReasons = Object.entries(
    lostDeals.reduce<Record<string, number>>((acc, deal) => {
      const reason = deal.lostReason?.trim() || 'Não informado';
      acc[reason] = (acc[reason] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Relatórios"
        description="Análise de vendas, performance e conversão do funil."
        actions={<ReportActions ranking={ranking.map((r) => ({ name: r.name, won: r.won, total: r.total, count: r.count, conversion: r.conversion }))} />}
      />

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-sm text-muted-foreground">Período:</span>
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/reports?period=${p.value}`}
            className={cn(
              'rounded-md border px-2.5 py-1 text-sm transition-colors',
              period === p.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vendas ganhas" value={formatCurrency(wonValue)} hint={`${wonDeals.length} negócio(s)`} />
        <Metric label="Em pipeline" value={formatCurrency(openValue)} hint={`${openDeals.length} aberto(s)`} />
        <Metric label="Taxa de conversão" value={`${conversion.toFixed(1)}%`} hint={`${wonDeals.length} de ${closedDeals.length} fechados`} />
        <Metric label="Tempo médio de fechamento" value={`${avgDays.toFixed(0)} dias`} hint="Negócios fechados" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesLineChart data={monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Negócios por estágio</CardTitle>
          </CardHeader>
          <CardContent>
            <StageBarChart data={stageData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance por vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b pb-2 text-xs font-medium text-muted-foreground">
                  <span>Vendedor</span>
                  <span className="text-right">Ganho</span>
                  <span className="text-right">Deals</span>
                  <span className="text-right">Conv.</span>
                </div>
                {ranking.map((r, index) => (
                  <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
                      <span className="truncate">{r.name}</span>
                    </div>
                    <span className="text-right font-medium">{formatCurrency(r.won)}</span>
                    <span className="text-right text-muted-foreground">{r.count}/{r.deals}</span>
                    <Badge variant="secondary" className="justify-self-end">{r.conversion}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Motivos de perda</CardTitle>
          </CardHeader>
          <CardContent>
            {lostReasons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma perda registrada no período.</p>
            ) : (
              <LostReasonChart data={lostReasons} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversão por estágio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEAL_STAGES.map((stage) => {
              const count = deals.filter((d) => d.stage === stage.value).length;
              const percent = deals.length > 0 ? (count / deals.length) * 100 : 0;
              return (
                <div key={stage.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{stage.label}</span>
                    <span className="text-muted-foreground">{count} • {percent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getPeriodStart(period: string) {
  if (period === 'all') return null;
  const date = new Date();
  date.setDate(date.getDate() - Number(period));
  return date;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
