'use server';

import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth-helpers';
import { dealSchema } from '@/lib/validations/crm';
import { DEAL_STAGES, type DealStage } from '@/lib/crm';
import { revalidatePath } from 'next/cache';
import { moveDealToTrash } from '@/lib/trash';

type ActionResult = { success?: true; error?: string };

function revalidateDeals() {
  revalidatePath('/deals');
  revalidatePath('/pipeline');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  revalidatePath('/customers');
}

function defaultProbability(stage: string) {
  return DEAL_STAGES.find((s) => s.value === stage)?.probability ?? 10;
}

export async function createDeal(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = dealSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    const canAssign = user.role === 'ADMIN' || user.role === 'MANAGER';
    const last = await prisma.deal.findFirst({
      where: { stage: data.stage },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    await prisma.deal.create({
      data: {
        title: data.title,
        value: Math.round(data.value),
        currency: data.currency,
        stage: data.stage,
        probability: data.probability,
        customerId: data.customerId,
        ownerId: canAssign ? (data.ownerId || user.id) : user.id,
        expectedCloseDate: data.expectedCloseDate,
        description: data.description,
        order: (last?.order ?? -1) + 1,
      },
    });
    revalidateDeals();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar negócio' };
  }
}

export async function updateDeal(id: string, input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = dealSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    const canAssign = user.role === 'ADMIN' || user.role === 'MANAGER';
    const existing = await prisma.deal.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) return { error: 'Negócio não encontrado' };
    if (user.role === 'SALES_REP' && existing.ownerId && existing.ownerId !== user.id) {
      return { error: 'Sem permissão' };
    }
    await prisma.deal.update({
      where: { id },
      data: {
        title: data.title,
        value: Math.round(data.value),
        currency: data.currency,
        stage: data.stage,
        probability: data.probability,
        customerId: data.customerId,
        ownerId: canAssign ? (data.ownerId || null) : existing.ownerId,
        expectedCloseDate: data.expectedCloseDate,
        description: data.description,
        lostReason: data.lostReason,
      },
    });
    revalidateDeals();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar negócio' };
  }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const result = await moveDealToTrash(id, user.id);
    if (result.error) return { error: result.error };
    revalidateDeals();
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover negócio para a lixeira' };
  }
}

export async function deleteDeals(ids: string[]): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    if (ids.length === 0) return { success: true };
    for (const id of ids) {
      const result = await moveDealToTrash(id, user.id);
      if (result.error) return { error: result.error };
    }
    revalidateDeals();
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover negócios para a lixeira' };
  }
}

export async function permanentlyDeleteDeal(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.activity.deleteMany({ where: { dealId: id } });
    await prisma.deal.delete({ where: { id } });
    revalidateDeals();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir negócio permanentemente' };
  }
}

export async function permanentlyDeleteDeals(ids: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (ids.length === 0) return { success: true };
    await prisma.activity.deleteMany({ where: { dealId: { in: ids } } });
    await prisma.deal.deleteMany({ where: { id: { in: ids } } });
    revalidateDeals();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir negócios permanentemente' };
  }
}

export async function moveDealStage(id: string, stage: string, targetIndex: number): Promise<ActionResult> {
  try {
    await requireUser();
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal) return { error: 'Negócio não encontrado' };

    const siblings = await prisma.deal.findMany({
      where: { stage: stage as DealStage, id: { not: id } },
      orderBy: { order: 'asc' },
      select: { id: true, stage: true },
    });
    const clamped = Math.max(0, Math.min(targetIndex, siblings.length));
    const ordered = [...siblings];
    ordered.splice(clamped, 0, { id, stage: deal.stage });

    const changedStage = deal.stage !== stage;
    await prisma.$transaction(
      ordered.map((d, index) =>
        prisma.deal.update({
          where: { id: d.id },
          data: {
            stage: stage as DealStage,
            order: index,
            ...(d.id === id && changedStage ? { probability: defaultProbability(stage) } : {}),
          },
        })
      )
    );
    revalidateDeals();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover negócio' };
  }
}
