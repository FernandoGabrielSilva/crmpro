export const instant = false;

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canManage } from '@/lib/permissions';
import { TasksView } from '@/components/tasks/tasks-view';
import type { TaskRow, UserOption } from '@/types/crm';

export default async function TasksPage() {
  const session = await auth();
  const [tasks, users, currentUser] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { assignee: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
      : Promise.resolve(null),
  ]);

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueDate: t.dueDate?.toISOString() ?? null,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignedTo,
    assigneeName: t.assignee?.name ?? null,
    relatedTo: t.relatedTo,
    createdAt: t.createdAt.toISOString(),
  }));

  const userOptions: UserOption[] = users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl }));

  return <TasksView tasks={rows} users={userOptions} canManage={canManage(currentUser?.role)} />;
}
