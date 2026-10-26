export const instant = false;

import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManage } from '@/lib/permissions';
import { getTrashRetentionDays, purgeExpiredTrash } from '@/lib/trash';
import { TrashView } from '@/components/trash/trash-view';

export default async function TrashPage() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!current || !canManage(current.role)) redirect('/dashboard');

  await purgeExpiredTrash();

  const [items, retentionDays] = await Promise.all([
    prisma.trashItem.findMany({
      where: current.role === 'ADMIN' ? {} : { entityType: { not: 'USER' } },
      orderBy: { deletedAt: 'desc' },
      include: { deletedBy: { select: { name: true } } },
    }),
    getTrashRetentionDays(),
  ]);

  return (
    <TrashView
      items={items.map((item) => ({
        id: item.id,
        entityType: item.entityType,
        label: item.label,
        deletedAt: item.deletedAt.toISOString(),
        deletedByName: item.deletedBy?.name ?? null,
      }))}
      retentionDays={retentionDays}
      isOwner={current.role === 'ADMIN'}
    />
  );
}
