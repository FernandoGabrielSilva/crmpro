'use server';

import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth-helpers';
import { activitySchema } from '@/lib/validations/crm';
import { revalidatePath } from 'next/cache';
import { moveActivityToTrash } from '@/lib/trash';

type ActionResult = { success?: true; error?: string };

export async function createActivity(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = activitySchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    await prisma.activity.create({
      data: {
        type: data.type,
        content: data.content,
        customerId: data.customerId || null,
        dealId: data.dealId || null,
        userId: user.id,
        dueDate: data.dueDate,
        completed: data.completed,
      },
    });
    revalidatePath('/dashboard');
    revalidatePath('/customers');
    revalidatePath('/tasks');
    if (data.customerId) revalidatePath(`/customers/${data.customerId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar atividade' };
  }
}

export async function toggleActivityComplete(id: string, completed: boolean): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.activity.update({ where: { id }, data: { completed } });
    revalidatePath('/dashboard');
    revalidatePath('/tasks');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar atividade' };
  }
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const result = await moveActivityToTrash(id, user.id);
    if (result.error) return { error: result.error };
    revalidatePath('/dashboard');
    revalidatePath('/tasks');
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover atividade para a lixeira' };
  }
}
