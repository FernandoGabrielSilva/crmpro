export const instant = false;

import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/cache';
import { canManage } from '@/lib/permissions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await getUserById(session.user.id);
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar canManage={canManage(user.role)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <AppHeader user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }} />
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
