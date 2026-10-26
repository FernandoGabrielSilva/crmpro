'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { tagSchema } from '@/lib/validations/crm';
import { revalidatePath } from 'next/cache';
import { moveTagToTrash, purgeExpiredTrash } from '@/lib/trash';

type ActionResult = { success?: true; error?: string };

export async function createTag(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = tagSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    await prisma.tag.upsert({
      where: { name: parsed.data.name },
      update: { color: parsed.data.color },
      create: { name: parsed.data.name, color: parsed.data.color },
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar tag' };
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const result = await moveTagToTrash(id, user.id);
    if (result.error) return { error: result.error };
    revalidatePath('/settings');
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover tag para a lixeira' };
  }
}

export async function permanentlyDeleteTag(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.tag.delete({ where: { id } });
    revalidatePath('/settings');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir tag permanentemente' };
  }
}

export async function savePipelineStages(stages: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (stages.length === 0) return { error: 'Adicione ao menos um estágio' };
    const existing = await prisma.pipeline.findFirst({ where: { name: 'Funil de Vendas' } });
    if (existing) {
      await prisma.pipeline.update({ where: { id: existing.id }, data: { stages } });
    } else {
      await prisma.pipeline.create({ data: { name: 'Funil de Vendas', stages } });
    }
    revalidatePath('/settings');
    revalidatePath('/pipeline');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao salvar funil' };
  }
}

export async function saveTrashRetention(days: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const value = Math.round(Number(days));
    if (!Number.isFinite(value) || value < 1 || value > 3650) {
      return { error: 'Informe um prazo entre 1 e 3650 dias' };
    }
    await prisma.trashSetting.upsert({
      where: { id: 'default' },
      update: { retentionDays: value },
      create: { id: 'default', retentionDays: value },
    });
    await purgeExpiredTrash();
    revalidatePath('/settings');
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao salvar prazo da lixeira' };
  }
}
