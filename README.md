# CRM Pro

CRM completo com Next.js 14+, NextAuth v5, Drizzle ORM, NeonDB, shadcn/ui.

## Setup

1. Instale dependências
```bash
npm install
```

2. Configure .env
```bash
cp .env.example .env
# Edite com suas credenciais do NeonDB e AUTH_SECRET
```

3. Gere e aplique schema
```bash
npm run db:push
```

4. Popular banco com dados demo
```bash
npm run db:seed
```

5. Inicie dev server
```bash
npm run dev
```

## Credenciais Demo
- admin@crm.com / demo123456 (ADMIN)
- gerente@crm.com / demo123456 (MANAGER)
- vendedor@crm.com / demo123456 (SALES_REP)

## Stack
Next.js 14, NextAuth v5, Drizzle ORM, NeonDB, shadcn/ui, TailwindCSS, TypeScript, Zod, React Hook Form, TanStack Table, Recharts, date-fns, dnd-kit
