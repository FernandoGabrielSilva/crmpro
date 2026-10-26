'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { restoreTrashItem } from '@/lib/trash';

type ActionResult = { success?: true; error?: string };

function revalidateTrash() {
  for (const path of ['/trash', '/dashboard', '/customers', '/deals', '/pipeline', '/tasks', '/reports', '/settings']) {
    revalidatePath(path);
  }
}

export async function restoreFromTrash(id: string): Promise<ActionResult> {
  try {
    const current = await requireAdmin();
    const item = await prisma.trashItem.findUnique({ where: { id } });
    if (!item) return { error: 'Item não encontrado na lixeira' };
    if (item.entityType === 'USER' && current.role !== 'ADMIN') {
      return { error: 'Apenas o administrador pode restaurar usuários' };
    }
    await restoreTrashItem(item);
    revalidateTrash();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao restaurar item' };
  }
}

export async function permanentlyDeleteFromTrash(id: string): Promise<ActionResult> {
  try {
    const current = await requireAdmin();
    const item = await prisma.trashItem.findUnique({ where: { id } });
    if (!item) return { error: 'Item não encontrado na lixeira' };
    if (item.entityType === 'USER' && current.role !== 'ADMIN') {
      return { error: 'Apenas o administrador pode excluir usuários permanentemente' };
    }
    await prisma.trashItem.delete({ where: { id } });
    revalidateTrash();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir item permanentemente' };
  }
}

export async function emptyTrash(): Promise<ActionResult> {
  try {
    const current = await requireAdmin();
    await prisma.trashItem.deleteMany({
      where: current.role === 'ADMIN' ? {} : { entityType: { not: 'USER' } },
    });
    revalidateTrash();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao esvaziar a lixeira' };
  }
}
