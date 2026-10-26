'use server';

import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth-helpers';
import { taskSchema } from '@/lib/validations/crm';
import { revalidatePath } from 'next/cache';
import { moveTaskToTrash } from '@/lib/trash';

type ActionResult = { success?: true; error?: string };

function revalidateTasks() {
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
}

export async function createTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assignedTo || user.id,
        relatedTo: data.relatedTo,
      },
    });
    revalidateTasks();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar tarefa' };
  }
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assignedTo || null,
        relatedTo: data.relatedTo,
      },
    });
    revalidateTasks();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar tarefa' };
  }
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.task.update({
      where: { id },
      data: { status: completed ? 'COMPLETED' : 'PENDING' },
    });
    revalidateTasks();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar tarefa' };
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const result = await moveTaskToTrash(id, user.id);
    if (result.error) return { error: result.error };
    revalidateTasks();
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover tarefa para a lixeira' };
  }
}

export async function deleteTasks(ids: string[]): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    if (ids.length === 0) return { success: true };
    for (const id of ids) {
      const result = await moveTaskToTrash(id, user.id);
      if (result.error) return { error: result.error };
    }
    revalidateTasks();
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover tarefas para a lixeira' };
  }
}

export async function permanentlyDeleteTask(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.task.delete({ where: { id } });
    revalidateTasks();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir tarefa permanentemente' };
  }
}

export async function permanentlyDeleteTasks(ids: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (ids.length === 0) return { success: true };
    await prisma.task.deleteMany({ where: { id: { in: ids } } });
    revalidateTasks();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir tarefas permanentemente' };
  }
}
