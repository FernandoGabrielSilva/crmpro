export const instant = false;

import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProfileView } from '@/components/profile/profile-view';

export default async function ProfilePage() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');

  return (
    <ProfileView
      user={{ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
    />
  );
}
