'use server';

import { prisma } from '@/lib/prisma';
import { requireOwner, requireUser } from '@/lib/auth-helpers';
import { userCreateSchema, userUpdateSchema, profileSchema } from '@/lib/validations/crm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { moveUserToTrash } from '@/lib/trash';

type ActionResult = { success?: true; error?: string };

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    await requireOwner();
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const { name, email, password, role } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: 'Email já cadastrado' };
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { name, email, password: hashed, role } });
    revalidatePath('/settings');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar usuário' };
  }
}

export async function updateUser(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireOwner();
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const { name, email, role, password, avatarUrl } = parsed.data;
    const existing = await prisma.user.findFirst({ where: { email, id: { not: id } } });
    if (existing) return { error: 'Email já cadastrado' };
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        avatarUrl,
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      },
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar usuário' };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const current = await requireOwner();
    if (current.id === id) return { error: 'Você não pode excluir sua própria conta' };
    const result = await moveUserToTrash(id, current.id);
    if (result.error) return { error: result.error };
    revalidatePath('/settings');
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover usuário para a lixeira' };
  }
}

export async function permanentlyDeleteUser(id: string): Promise<ActionResult> {
  try {
    const current = await requireOwner();
    if (current.id === id) return { error: 'Você não pode excluir sua própria conta' };
    await prisma.$transaction([
      prisma.activity.updateMany({ where: { userId: id }, data: { userId: current.id } }),
      prisma.user.delete({ where: { id } }),
    ]);
    revalidatePath('/settings');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir usuário permanentemente' };
  }
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, avatarUrl: parsed.data.avatarUrl },
    });
    revalidatePath('/settings');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar perfil' };
  }
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres'),
});

export async function changePassword(input: unknown): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();
    const parsed = passwordChangeSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return { error: 'Usuário não encontrado' };
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!valid) return { error: 'Senha atual incorreta' };
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(parsed.data.newPassword, 10) },
    });
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao alterar senha' };
  }
}
