export const instant = false;

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canManage } from '@/lib/permissions';
import { CustomersView } from '@/components/customers/customers-view';
import type { CustomerRow, TagOption, UserOption } from '@/types/crm';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, session] = await Promise.all([searchParams, auth()]);
  const q = first(params.q) ?? '';
  const status = first(params.status) ?? '';
  const ownerId = first(params.ownerId) ?? '';
  const tag = first(params.tag) ?? '';
  const sort = first(params.sort) ?? 'createdAt:desc';
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);
  const pageSize = 10;

  const [sortField, sortDir] = sort.split(':');
  const allowedSort = ['name', 'createdAt', 'updatedAt'];
  const orderBy = {
    [allowedSort.includes(sortField) ? sortField : 'createdAt']: sortDir === 'asc' ? 'asc' : 'desc',
  } as Record<string, 'asc' | 'desc'>;

  const where = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { company: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {},
      status && status !== 'all' ? { status: status as 'LEAD' | 'ACTIVE' | 'INACTIVE' } : {},
      ownerId && ownerId !== 'all' ? { ownerId } : {},
      tag && tag !== 'all' ? { tags: { has: tag } } : {},
    ],
  };

  const [customers, total, users, tags, currentUser] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { deals: true } },
      },
    }),
    prisma.customer.count({ where }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
      : Promise.resolve(null),
  ]);

  const manage = canManage(currentUser?.role);

  const rows: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    position: c.position,
    status: c.status,
    ownerId: c.ownerId,
    ownerName: c.owner?.name ?? null,
    tags: c.tags,
    notes: c.notes,
    dealsCount: c._count.deals,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const userOptions: UserOption[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
  }));

  const tagOptions: TagOption[] = tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  return (
    <CustomersView
      customers={rows}
      users={userOptions}
      tags={tagOptions}
      total={total}
      page={page}
      pageSize={pageSize}
      filters={{ q, status, ownerId, tag, sort }}
      canManage={manage}
    />
  );
}
