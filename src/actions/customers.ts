'use server';

import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth-helpers';
import { customerSchema, contactSchema } from '@/lib/validations/crm';
import { revalidatePath } from 'next/cache';
import { moveContactToTrash, moveCustomerToTrash } from '@/lib/trash';

type ActionResult = { success?: true; error?: string };

function revalidateAll() {
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  revalidatePath('/deals');
  revalidatePath('/pipeline');
  revalidatePath('/reports');
}

export async function createCustomer(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    await prisma.customer.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        company: data.company,
        position: data.position,
        status: data.status,
        ownerId: data.ownerId || user.id,
        tags: data.tags,
        notes: data.notes,
      },
    });
    revalidateAll();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar cliente' };
  }
}

export async function updateCustomer(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        company: data.company,
        position: data.position,
        status: data.status,
        ownerId: data.ownerId || null,
        tags: data.tags,
        notes: data.notes,
      },
    });
    revalidateAll();
    revalidatePath(`/customers/${id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar cliente' };
  }
}

async function hardDeleteCustomer(id: string) {
  const deals = await prisma.deal.findMany({ where: { customerId: id }, select: { id: true } });
  await prisma.activity.deleteMany({ where: { OR: [{ customerId: id }, { dealId: { in: deals.map((d) => d.id) } }] } });
  await prisma.deal.deleteMany({ where: { customerId: id } });
  await prisma.contact.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const result = await moveCustomerToTrash(id, user.id);
    if (result.error) return { error: result.error };
    revalidateAll();
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover cliente para a lixeira' };
  }
}

export async function deleteCustomers(ids: string[]): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    if (ids.length === 0) return { success: true };
    for (const id of ids) {
      const result = await moveCustomerToTrash(id, user.id);
      if (result.error) return { error: result.error };
    }
    revalidateAll();
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover clientes para a lixeira' };
  }
}

export async function permanentlyDeleteCustomer(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await hardDeleteCustomer(id);
    revalidateAll();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir cliente permanentemente' };
  }
}

export async function permanentlyDeleteCustomers(ids: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (ids.length === 0) return { success: true };
    for (const id of ids) await hardDeleteCustomer(id);
    revalidateAll();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir clientes permanentemente' };
  }
}

export async function assignCustomersOwner(ids: string[], ownerId: string | null): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.customer.updateMany({ where: { id: { in: ids } }, data: { ownerId } });
    revalidateAll();
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atribuir responsável' };
  }
}

export async function createContact(input: unknown): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    const data = parsed.data;
    await prisma.contact.create({
      data: {
        customerId: data.customerId,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        position: data.position,
      },
    });
    revalidatePath(`/customers/${data.customerId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar contato' };
  }
}

export async function deleteContact(id: string, customerId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const result = await moveContactToTrash(id, user.id);
    if (result.error) return { error: result.error };
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/trash');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao mover contato para a lixeira' };
  }
}
