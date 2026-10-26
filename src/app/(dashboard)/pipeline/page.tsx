export const instant = false;

import { prisma } from '@/lib/prisma';
import { PipelineBoard } from '@/components/kanban/pipeline-board';
import { DEAL_STAGES } from '@/lib/crm';
import type { DealRow, TagOption, UserOption } from '@/types/crm';

export default async function PipelinePage() {
  const [deals, users, customers, tags, pipeline] = await Promise.all([
    prisma.deal.findMany({
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      take: 500,
      include: {
        customer: { select: { id: true, name: true, tags: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.pipeline.findFirst({ where: { name: 'Funil de Vendas' } }),
  ]);

  const rows: DealRow[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value,
    currency: d.currency,
    stage: d.stage,
    probability: d.probability,
    customerId: d.customerId,
    customerName: d.customer.name,
    customerTags: d.customer.tags,
    ownerId: d.ownerId,
    ownerName: d.owner?.name ?? null,
    expectedCloseDate: d.expectedCloseDate?.toISOString() ?? null,
    description: d.description,
    lostReason: d.lostReason,
    order: d.order,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  const userOptions: UserOption[] = users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl }));
  const tagOptions: TagOption[] = tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  const stageLabels = Object.fromEntries(
    DEAL_STAGES.map((stage, index) => [stage.value, pipeline?.stages?.[index] ?? stage.label])
  );

  return <PipelineBoard deals={rows} users={userOptions} customers={customers} tags={tagOptions} stageLabels={stageLabels} />;
}
