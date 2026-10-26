export const instant = false;

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SettingsView } from '@/components/settings/settings-view';
import { DEAL_STAGES } from '@/lib/crm';
import { canManage as canManageRole, isOwner as isOwnerRole } from '@/lib/permissions';
import { getTrashRetentionDays } from '@/lib/trash';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');

  const owner = isOwnerRole(user.role);
  const manage = canManageRole(user.role);

  const [users, tags, pipeline, retentionDays] = await Promise.all([
    owner ? prisma.user.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
    manage ? prisma.tag.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
    manage ? prisma.pipeline.findFirst({ where: { name: 'Funil de Vendas' } }) : Promise.resolve(null),
    manage ? getTrashRetentionDays() : Promise.resolve(30),
  ]);

  return (
    <SettingsView
      currentUser={{ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt.toISOString(),
      }))}
      tags={tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }))}
      stages={pipeline?.stages?.length === DEAL_STAGES.length ? pipeline.stages : DEAL_STAGES.map((s) => s.label)}
      retentionDays={retentionDays}
      isOwner={owner}
      canManage={manage}
    />
  );
}
