import { cache } from 'react';
import { prisma } from './prisma';

export const getUserById = cache(async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });
});
