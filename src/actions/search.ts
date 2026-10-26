'use server';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';

export type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  type: 'customer' | 'deal' | 'task';
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  await requireUser();
  const term = query.trim();
  if (term.length < 2) return [];

  const [customers, deals, tasks] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { company: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.deal.findMany({
      where: { title: { contains: term, mode: 'insensitive' } },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { customer: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { title: { contains: term, mode: 'insensitive' } },
      take: 5,
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  return [
    ...customers.map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: c.company ?? c.email ?? undefined,
      href: `/customers/${c.id}`,
      type: 'customer' as const,
    })),
    ...deals.map((d) => ({
      id: d.id,
      title: d.title,
      subtitle: d.customer.name,
      href: `/deals`,
      type: 'deal' as const,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.description ?? undefined,
      href: `/tasks`,
      type: 'task' as const,
    })),
  ];
}
