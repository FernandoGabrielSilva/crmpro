export const instant = false;

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canManage } from '@/lib/permissions';
import { DealsView } from '@/components/deals/deals-view';
import { OPEN_STAGES } from '@/lib/crm';
import type { DealRow, UserOption } from '@/types/crm';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DealsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, session] = await Promise.all([searchParams, auth()]);
  const q = first(params.q) ?? '';
  const stage = first(params.stage) ?? '';
  const ownerId = first(params.ownerId) ?? '';

  const where = {
    AND: [
      q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { customer: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {},
      stage && stage !== 'all' ? { stage: stage as DealRow['stage'] } : {},
      ownerId && ownerId !== 'all' ? { ownerId } : {},
    ],
  };

  const [deals, customers, users, openDeals, wonDeals, currentUser] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
      include: {
        customer: { select: { id: true, name: true, tags: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.deal.findMany({ where: { stage: { in: OPEN_STAGES as DealRow['stage'][] } }, select: { value: true, probability: true } }),
    prisma.deal.findMany({ where: { stage: 'WON' }, select: { value: true } }),
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
      : Promise.resolve(null),
  ]);

  const manage = canManage(currentUser?.role);

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

  const openValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const weighted = openDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  const userOptions: UserOption[] = users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl }));

  return (
    <DealsView
      deals={rows}
      customers={customers}
      users={userOptions}
      summary={{ openValue, weighted, wonValue, openCount: openDeals.length, wonCount: wonDeals.length }}
      filters={{ q, stage, ownerId }}
      canManage={manage}
    />
  );
}
