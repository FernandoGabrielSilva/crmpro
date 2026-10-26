import type { Activity, Contact, Customer, Deal, Prisma, Tag, Task, TrashItem, User } from '@prisma/client';
import { prisma } from './prisma';

type Serialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

type CustomerPayload = {
  customer: Serialized<Customer>;
  contacts: Serialized<Contact>[];
  deals: Serialized<Deal>[];
  activities: Serialized<Activity>[];
};

type DealPayload = { deal: Serialized<Deal>; activities: Serialized<Activity>[] };
type TaskPayload = { task: Serialized<Task> };
type ContactPayload = { contact: Serialized<Contact> };
type ActivityPayload = { activity: Serialized<Activity> };
type TagPayload = { tag: Serialized<Tag> };
type UserPayload = {
  user: Serialized<User>;
  activities: Serialized<Activity>[];
  ownedCustomerIds: string[];
  ownedDealIds: string[];
  assignedTaskIds: string[];
};

function serialize<T>(value: T[]): Serialized<T>[];
function serialize<T>(value: T): Serialized<T>;
function serialize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function optionalDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

async function safeOwnerId(tx: Prisma.TransactionClient, ownerId: string | null) {
  if (!ownerId) return null;
  const owner = await tx.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  return owner?.id ?? null;
}

async function restoreActivity(tx: Prisma.TransactionClient, data: Serialized<Activity>) {
  const user = await tx.user.findUnique({ where: { id: data.userId }, select: { id: true } });
  if (!user) return;
  const customer = data.customerId
    ? await tx.customer.findUnique({ where: { id: data.customerId }, select: { id: true } })
    : null;
  const deal = data.dealId
    ? await tx.deal.findUnique({ where: { id: data.dealId }, select: { id: true } })
    : null;
  await tx.activity.create({
    data: {
      id: data.id,
      type: data.type,
      content: data.content,
      customerId: customer?.id ?? null,
      dealId: deal?.id ?? null,
      userId: user.id,
      dueDate: optionalDate(data.dueDate),
      completed: data.completed,
      createdAt: new Date(data.createdAt),
    },
  });
}

export async function moveCustomerToTrash(id: string, deletedById: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: true,
      activities: true,
      deals: { include: { activities: true } },
    },
  });
  if (!customer) return { error: 'Cliente não encontrado' };

  const { contacts, deals, activities, ...customerData } = customer;
  const activityMap = new Map<string, Activity>();
  [...activities, ...deals.flatMap((deal) => deal.activities)].forEach((activity) => {
    activityMap.set(activity.id, activity);
  });
  const payload: CustomerPayload = {
    customer: serialize(customerData),
    contacts: serialize(contacts),
    deals: serialize(
      deals.map((deal) => {
        const copy = { ...deal };
        Reflect.deleteProperty(copy, 'activities');
        return copy;
      })
    ),
    activities: serialize([...activityMap.values()]),
  };

  await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({
      where: { OR: [{ customerId: id }, { dealId: { in: deals.map((deal) => deal.id) } }] },
    });
    await tx.deal.deleteMany({ where: { customerId: id } });
    await tx.contact.deleteMany({ where: { customerId: id } });
    await tx.customer.delete({ where: { id } });
    await tx.trashItem.create({
      data: {
        entityType: 'CUSTOMER',
        entityId: id,
        label: customer.name,
        data: payload as unknown as Prisma.InputJsonValue,
        deletedById,
      },
    });
  });

  return { success: true as const };
}

export async function moveDealToTrash(id: string, deletedById: string) {
  const deal = await prisma.deal.findUnique({ where: { id }, include: { activities: true } });
  if (!deal) return { error: 'Negócio não encontrado' };
  const { activities, ...dealData } = deal;
  const payload: DealPayload = { deal: serialize(dealData), activities: serialize(activities) };

  await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { dealId: id } });
    await tx.deal.delete({ where: { id } });
    await tx.trashItem.create({
      data: {
        entityType: 'DEAL',
        entityId: id,
        label: deal.title,
        data: payload as unknown as Prisma.InputJsonValue,
        deletedById,
      },
    });
  });

  return { success: true as const };
}

export async function moveTaskToTrash(id: string, deletedById: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return { error: 'Tarefa não encontrada' };
  const payload: TaskPayload = { task: serialize(task) };

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id } });
    await tx.trashItem.create({
      data: {
        entityType: 'TASK',
        entityId: id,
        label: task.title,
        data: payload as unknown as Prisma.InputJsonValue,
        deletedById,
      },
    });
  });

  return { success: true as const };
}

export async function moveContactToTrash(id: string, deletedById: string) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return { error: 'Contato não encontrado' };
  const payload: ContactPayload = { contact: serialize(contact) };

  await prisma.$transaction(async (tx) => {
    await tx.contact.delete({ where: { id } });
    await tx.trashItem.create({
      data: {
        entityType: 'CONTACT',
        entityId: id,
        label: contact.name,
        data: payload as unknown as Prisma.InputJsonValue,
        deletedById,
      },
    });
  });

  return { success: true as const };
}

export async function moveActivityToTrash(id: string, deletedById: string) {
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return { error: 'Atividade não encontrada' };
  const payload: ActivityPayload = { activity: serialize(activity) };

  await prisma.$transaction(async (tx) => {
    await tx.activity.delete({ where: { id } });
    await tx.trashItem.create({
      data: {
        entityType: 'ACTIVITY',
        entityId: id,
        label: activity.content.slice(0, 120),
        data: payload as unknown as Prisma.InputJsonValue,
        deletedById,
      },
    });
  });

  return { success: true as const };
}

export async function moveTagToTrash(id: string, deletedById: string) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return { error: 'Tag não encontrada' };
  const payload: TagPayload = { tag: serialize(tag) };

  await prisma.$transaction(async (tx) => {
    await tx.tag.delete({ where: { id } });
    await tx.trashItem.create({
      data: {
        entityType: 'TAG',
        entityId: id,
        label: tag.name,
        data: payload as unknown as Prisma.InputJsonValue,
        deletedById,
      },
    });
  });

  return { success: true as const };
}

export async function moveUserToTrash(id: string, deletedById: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      activities: true,
      customers: { select: { id: true } },
      deals: { select: { id: true } },
      tasks: { select: { id: true } },
    },
  });
  if (!user) return { error: 'Usuário não encontrado' };

  const { activities, customers, deals, tasks, ...userData } = user;
  const payload: UserPayload = {
    user: serialize(userData),
    activities: serialize(activities),
    ownedCustomerIds: customers.map((item) => item.id),
    ownedDealIds: deals.map((item) => item.id),
    assignedTaskIds: tasks.map((item) => item.id),
  };

  await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
    await tx.trashItem.create({
      data: {
        entityType: 'USER',
        entityId: id,
        label: `${user.name} (${user.email})`,
        data: payload as unknown as Prisma.InputJsonValue,
        deletedById: deletedById === id ? null : deletedById,
      },
    });
  });

  return { success: true as const };
}

export async function restoreTrashItem(item: TrashItem) {
  const data = item.data as Record<string, unknown>;

  await prisma.$transaction(async (tx) => {
    switch (item.entityType) {
      case 'CUSTOMER': {
        const payload = data as unknown as CustomerPayload;
        const customer = payload.customer;
        await tx.customer.create({
          data: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company,
            position: customer.position,
            status: customer.status,
            ownerId: await safeOwnerId(tx, customer.ownerId),
            tags: customer.tags,
            notes: customer.notes,
            createdAt: new Date(customer.createdAt),
            updatedAt: new Date(customer.updatedAt),
          },
        });
        for (const contact of payload.contacts) {
          await tx.contact.create({
            data: {
              id: contact.id,
              customerId: customer.id,
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              position: contact.position,
            },
          });
        }
        for (const deal of payload.deals) {
          await tx.deal.create({
            data: {
              id: deal.id,
              title: deal.title,
              value: deal.value,
              currency: deal.currency,
              stage: deal.stage,
              probability: deal.probability,
              customerId: customer.id,
              ownerId: await safeOwnerId(tx, deal.ownerId),
              expectedCloseDate: optionalDate(deal.expectedCloseDate),
              description: deal.description,
              lostReason: deal.lostReason,
              order: deal.order,
              createdAt: new Date(deal.createdAt),
              updatedAt: new Date(deal.updatedAt),
            },
          });
        }
        for (const activity of payload.activities) {
          await restoreActivity(tx, activity);
        }
        break;
      }
      case 'DEAL': {
        const payload = data as unknown as DealPayload;
        const deal = payload.deal;
        const customer = await tx.customer.findUnique({ where: { id: deal.customerId }, select: { id: true } });
        if (!customer) throw new Error('O cliente deste negócio não existe mais. Restaure o cliente primeiro.');
        await tx.deal.create({
          data: {
            id: deal.id,
            title: deal.title,
            value: deal.value,
            currency: deal.currency,
            stage: deal.stage,
            probability: deal.probability,
            customerId: customer.id,
            ownerId: await safeOwnerId(tx, deal.ownerId),
            expectedCloseDate: optionalDate(deal.expectedCloseDate),
            description: deal.description,
            lostReason: deal.lostReason,
            order: deal.order,
            createdAt: new Date(deal.createdAt),
            updatedAt: new Date(deal.updatedAt),
          },
        });
        for (const activity of payload.activities) {
          await restoreActivity(tx, activity);
        }
        break;
      }
      case 'TASK': {
        const payload = data as unknown as TaskPayload;
        const task = payload.task;
        const assignee = task.assignedTo
          ? await tx.user.findUnique({ where: { id: task.assignedTo }, select: { id: true } })
          : null;
        await tx.task.create({
          data: {
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: optionalDate(task.dueDate),
            priority: task.priority,
            status: task.status,
            assignedTo: assignee?.id ?? null,
            relatedTo: task.relatedTo,
            createdAt: new Date(task.createdAt),
          },
        });
        break;
      }
      case 'CONTACT': {
        const payload = data as unknown as ContactPayload;
        const contact = payload.contact;
        const customer = await tx.customer.findUnique({ where: { id: contact.customerId }, select: { id: true } });
        if (!customer) throw new Error('O cliente deste contato não existe mais. Restaure o cliente primeiro.');
        await tx.contact.create({
          data: {
            id: contact.id,
            customerId: customer.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            position: contact.position,
          },
        });
        break;
      }
      case 'ACTIVITY': {
        const payload = data as unknown as ActivityPayload;
        await restoreActivity(tx, payload.activity);
        break;
      }
      case 'TAG': {
        const payload = data as unknown as TagPayload;
        await tx.tag.create({
          data: {
            id: payload.tag.id,
            name: payload.tag.name,
            color: payload.tag.color,
            createdAt: new Date(payload.tag.createdAt),
          },
        });
        break;
      }
      case 'USER': {
        const payload = data as unknown as UserPayload;
        const user = payload.user;
        await tx.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role,
            avatarUrl: user.avatarUrl,
            createdAt: new Date(user.createdAt),
          },
        });
        for (const activity of payload.activities) {
          await restoreActivity(tx, activity);
        }
        if (payload.ownedCustomerIds.length > 0) {
          await tx.customer.updateMany({
            where: { id: { in: payload.ownedCustomerIds }, ownerId: null },
            data: { ownerId: user.id },
          });
        }
        if (payload.ownedDealIds.length > 0) {
          await tx.deal.updateMany({
            where: { id: { in: payload.ownedDealIds }, ownerId: null },
            data: { ownerId: user.id },
          });
        }
        if (payload.assignedTaskIds.length > 0) {
          await tx.task.updateMany({
            where: { id: { in: payload.assignedTaskIds }, assignedTo: null },
            data: { assignedTo: user.id },
          });
        }
        break;
      }
    }

    await tx.trashItem.delete({ where: { id: item.id } });
  });
}

export async function getTrashRetentionDays() {
  const settings = await prisma.trashSetting.findUnique({ where: { id: 'default' } });
  return settings?.retentionDays ?? 30;
}

export async function purgeExpiredTrash() {
  const days = await getTrashRetentionDays();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.trashItem.deleteMany({ where: { deletedAt: { lt: cutoff } } });
}
