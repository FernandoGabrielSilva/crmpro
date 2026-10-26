import { z } from 'zod';

const optionalString = z.string().trim().optional().nullable().transform((v) => (v ? v : null));

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório'),
  email: z.union([z.email('Email inválido'), z.literal('')]).optional().nullable(),
  phone: optionalString,
  company: optionalString,
  position: optionalString,
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  ownerId: optionalString,
  tags: z.array(z.string()).default([]),
  notes: optionalString,
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const contactSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(2, 'Nome obrigatório'),
  email: z.union([z.email('Email inválido'), z.literal('')]).optional().nullable(),
  phone: optionalString,
  position: optionalString,
});

const dateInput = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (!v) return null;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [year, month, day] = v.split('-').map(Number);
      return new Date(year, month - 1, day, 12);
    }
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const dealSchema = z.object({
  title: z.string().trim().min(2, 'Título obrigatório'),
  value: z.coerce.number().min(0, 'Valor inválido'),
  currency: z.string().default('BRL'),
  stage: z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('LEAD'),
  probability: z.coerce.number().min(0).max(100),
  customerId: z.string().min(1, 'Cliente obrigatório'),
  ownerId: optionalString,
  expectedCloseDate: dateInput,
  description: optionalString,
  lostReason: optionalString,
});
export type DealInput = z.input<typeof dealSchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Título obrigatório'),
  description: optionalString,
  dueDate: dateInput,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
  assignedTo: optionalString,
  relatedTo: optionalString,
});
export type TaskInput = z.input<typeof taskSchema>;

export const activitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK']),
  content: z.string().trim().min(2, 'Descrição obrigatória'),
  customerId: optionalString,
  dealId: optionalString,
  dueDate: dateInput,
  completed: z.boolean().default(false),
});
export type ActivityInput = z.input<typeof activitySchema>;

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório'),
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES_REP']).default('SALES_REP'),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório'),
  email: z.email('Email inválido'),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES_REP']),
  password: z.string().min(6).optional().or(z.literal('')),
  avatarUrl: optionalString,
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório'),
  avatarUrl: optionalString,
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const tagSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
  color: z.string().default('#6366f1'),
});
