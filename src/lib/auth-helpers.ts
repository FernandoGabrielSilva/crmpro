import { auth } from './auth';
import { prisma } from './prisma';

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Não autenticado');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new Error('Sessão inválida');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    throw new Error('Sem permissão');
  }
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') {
    throw new Error('Apenas o administrador pode gerenciar usuários');
  }
  return user;
}
