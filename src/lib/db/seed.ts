import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding...');
  
  const hashedPassword = await bcrypt.hash('demo123456', 10);
  
  await prisma.user.createMany({
    data: [
      { name: 'Admin Demo', email: 'admin@crm.com', password: hashedPassword, role: 'ADMIN' },
      { name: 'Gerente Demo', email: 'gerente@crm.com', password: hashedPassword, role: 'MANAGER' },
      { name: 'Vendedor Demo', email: 'vendedor@crm.com', password: hashedPassword, role: 'SALES_REP' },
    ],
    skipDuplicates: true,
  });

  const users = await prisma.user.findMany();
  const admin = users.find(u => u.role === 'ADMIN')!;
  const sales = users.find(u => u.role === 'SALES_REP')!;
  const manager = users.find(u => u.role === 'MANAGER')!;

  for (let i = 1; i <= 25; i++) {
    await prisma.customer.create({
      data: {
        name: `Cliente ${i}`,
        email: `cliente${i}@empresa.com.br`,
        phone: `(11) 9${String(i).padStart(8, '0')}`,
        company: `Empresa ${i}`,
        position: 'Diretor',
        status: i % 3 === 0 ? 'ACTIVE' : 'LEAD',
        ownerId: i % 2 === 0 ? sales.id : manager.id,
        tags: ['novo', 'vip'].slice(0, i % 2 + 1),
      },
    });
  }

  const customers = await prisma.customer.findMany();
  
  const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
  for (let i = 0; i < 35; i++) {
    const cust = customers[i % customers.length];
    await prisma.deal.create({
      data: {
        title: `Negócio ${i + 1}`,
        value: Math.floor(Math.random() * 50000) + 5000,
        currency: 'BRL',
        stage: stages[i % stages.length],
        probability: [10, 25, 50, 75, 100, 0][i % 6],
        customerId: cust.id,
        ownerId: i % 3 === 0 ? admin.id : sales.id,
        expectedCloseDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  for (let i = 1; i <= 20; i++) {
    await prisma.task.create({
      data: {
        title: `Tarefa ${i}`,
        description: `Descrição da tarefa ${i}`,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        priority: (['LOW', 'MEDIUM', 'HIGH'] as const)[i % 3],
        status: i % 4 === 0 ? 'COMPLETED' : 'PENDING',
        assignedTo: sales.id,
      },
    });
  }

  console.log('Seed concluído!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
